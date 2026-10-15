-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261014000003_create_submissions_system.sql
-- Description: Submissions, Drafts, Screenshot Evidence, 30-Day Window Validation,
--              Duplicate Detection, and Row Level Security
-- ==============================================================================

-- 1. Ensure profile_completed exists on profiles
alter table public.profiles
add column if not exists profile_completed boolean not null default false;

create index if not exists idx_profiles_completed on public.profiles(profile_completed);

-- 2. SUBMISSION DRAFTS TABLE (Incomplete drafts that do not extend 30-day deadline)
create table if not exists public.submission_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  video_url text not null,
  normalized_video_identifier text,
  posting_date date not null,
  current_views bigint check (current_views is null or current_views >= 0),
  estimated_points integer check (estimated_points is null or estimated_points >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_submission_drafts_user on public.submission_drafts(user_id);

create or replace trigger tr_submission_drafts_updated_at
before update on public.submission_drafts
for each row
execute function public.handle_updated_at();

-- 3. FINAL SUBMISSIONS TABLE (Locked snapshot upon submission, one-time only)
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  video_url text not null,
  normalized_video_identifier text not null unique,
  posting_date date not null,
  submitted_at timestamptz not null default now(),
  claimed_views bigint not null check (claimed_views >= 0),
  estimated_points integer not null check (estimated_points >= 0),
  verified_views bigint check (verified_views is null or verified_views >= 0),
  approved_points integer check (approved_points is null or approved_points >= 0),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'requires_revision', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_submissions_status on public.submissions(status);
create index if not exists idx_submissions_submitted_at on public.submissions(submitted_at desc);
create index if not exists idx_submissions_identifier on public.submissions(normalized_video_identifier);

create or replace trigger tr_submissions_updated_at
before update on public.submissions
for each row
execute function public.handle_updated_at();

-- 4. SUBMISSION EVIDENCE TABLE (Tracks screenshot storage metadata & retention lifecycle)
create table if not exists public.submission_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size integer not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now(),
  retention_status text not null default 'active' check (retention_status in ('active', 'scheduled_for_deletion', 'deleted', 'disputed')),
  scheduled_deletion_at timestamptz,
  deleted_at timestamptz
);

create index if not exists idx_submission_evidence_sub on public.submission_evidence(submission_id);
create index if not exists idx_submission_evidence_retention on public.submission_evidence(retention_status);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.submission_drafts enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_evidence enable row level security;

-- DRAFTS: Creators have full CRUD on their own drafts
create policy "drafts_select_own"
on public.submission_drafts
for select
using (auth.uid() = user_id);

create policy "drafts_insert_own"
on public.submission_drafts
for insert
with check (auth.uid() = user_id);

create policy "drafts_update_own"
on public.submission_drafts
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "drafts_delete_own"
on public.submission_drafts
for delete
using (auth.uid() = user_id);

-- SUBMISSIONS: Creators can SELECT own, Admins can SELECT all
create policy "submissions_select_own_or_admin"
on public.submissions
for select
using (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

-- SUBMISSIONS: Creators can INSERT once; no client UPDATE or DELETE
create policy "submissions_insert_own"
on public.submissions
for insert
with check (
  auth.uid() = user_id
);

-- SUBMISSIONS: UPDATE only permitted for admins (verification, review notes)
create policy "submissions_admin_update"
on public.submissions
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "submissions_admin_delete"
on public.submissions
for delete
using (public.is_admin(auth.uid()));

-- EVIDENCE: Access governed by submission relationship
create policy "evidence_select_own_or_admin"
on public.submission_evidence
for select
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (s.user_id = auth.uid() or public.is_admin(auth.uid()))
  )
);

create policy "evidence_insert_own"
on public.submission_evidence
for insert
with check (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and s.user_id = auth.uid()
  ) or public.is_admin(auth.uid())
);

create policy "evidence_admin_update"
on public.submission_evidence
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- 6. RPC: Check Video Eligibility (Duplicate check + 30-day window check)
create or replace function public.check_video_submission_eligibility(
  p_normalized_identifier text,
  p_posting_date date
)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_existing_id uuid;
  v_existing_status text;
  v_now_wib timestamptz;
  v_today_wib date;
  v_deadline_wib timestamptz;
  v_diff_days integer;
begin
  -- Convert current time to Asia/Jakarta (WIB)
  v_now_wib := timezone('Asia/Jakarta', now());
  v_today_wib := v_now_wib::date;

  -- 1. Check duplicate submission
  select id, status
  into v_existing_id, v_existing_status
  from public.submissions
  where normalized_video_identifier = p_normalized_identifier
  limit 1;

  if v_existing_id is not null then
    return json_build_object(
      'eligible', false,
      'reason', 'duplicate',
      'message', 'Video ini sudah pernah diajukan sebelumnya dan tidak dapat disubmit ulang.',
      'existing_submission_id', v_existing_id,
      'status', v_existing_status
    );
  end if;

  -- 2. Reject future dates
  if p_posting_date > v_today_wib then
    return json_build_object(
      'eligible', false,
      'reason', 'future_date',
      'message', 'Tanggal posting tidak boleh berada di masa depan.'
    );
  end if;

  -- 3. Check 30-day calendar window (Posting Date = Day 1, Deadline = Day 30 at 23:59:59 WIB)
  v_deadline_wib := (p_posting_date + interval '29 days')::date + time '23:59:59';
  v_diff_days := (v_deadline_wib::date - v_today_wib) + 1;

  if v_now_wib > v_deadline_wib then
    return json_build_object(
      'eligible', false,
      'reason', 'expired',
      'message', 'Masa pengajuan konten ini sudah berakhir (melebihi batas 30 hari kalender).',
      'days_remaining', 0,
      'deadline', v_deadline_wib
    );
  end if;

  return json_build_object(
    'eligible', true,
    'days_remaining', v_diff_days,
    'deadline', v_deadline_wib,
    'message', 'Video memenuhi syarat untuk diajukan.'
  );
end;
$$;
