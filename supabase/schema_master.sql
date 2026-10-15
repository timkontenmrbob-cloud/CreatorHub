-- ==============================================================================
-- MR.BOB CREATOR HUB — ALL-IN-ONE MASTER DATABASE REBUILD & SEED SCRIPT
-- ==============================================================================
-- Version: 1.0 (Production Master)
-- Date   : October 2026
-- Target : Supabase PostgreSQL (SQL Editor)
--
-- Instructions:
-- 1. Buka Supabase Dashboard -> SQL Editor
-- 2. Buat "New Query", paste seluruh kode di file ini, lalu klik "RUN".
-- 3. Script ini akan:
--    a. Menghapus tabel lama dengan aman (CASCADE).
--    b. Membangun ulang seluruh 15 tabel, indeks, constraint, dan RLS.
--    c. Membangun seluruh fungsi RPC & trigger (Wallet, Submissions, Leaderboard, Rewards).
--    d. Mengonfigurasi Storage Bucket ('submission-evidence' & 'video-thumbnails').
--    e. Mengisi kembali profil user dari auth.users.
--    f. Mengangkat 'leadersosmed@gmail.com' menjadi SUPER ADMIN secara permanen.
--    g. Menanam (seed) 13 Hadiah Resmi Mr.BOB & 4 Konten Approved Q4 2026.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CLEANUP / WIPE EXISTING PUBLIC TABLES (CASCADE)
-- ------------------------------------------------------------------------------
drop table if exists public.admin_role_audit_logs cascade;
drop table if exists public.quarterly_snapshots cascade;
drop table if exists public.campaign_costs cascade;
drop table if exists public.video_thumbnails cascade;
drop table if exists public.redemption_allocations cascade;
drop table if exists public.redemptions cascade;
drop table if exists public.rewards cascade;
drop table if exists public.submission_audit_logs cascade;
drop table if exists public.submission_evidence cascade;
drop table if exists public.submission_drafts cascade;
drop table if exists public.submissions cascade;
drop table if exists public.point_transactions cascade;
drop table if exists public.point_lots cascade;
drop table if exists public.admin_roles cascade;
drop table if exists public.profiles cascade;

-- ------------------------------------------------------------------------------
-- 2. EXTENSIONS
-- ------------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 3. TABLE DEFINITIONS
-- ------------------------------------------------------------------------------

-- A. PROFILES TABLE
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  tiktok_username text,
  instagram_username text,
  whatsapp_number text,
  avatar_url text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_email on public.profiles(email);
create index idx_profiles_tiktok on public.profiles(tiktok_username);
create index idx_profiles_instagram on public.profiles(instagram_username);
create index idx_profiles_completed on public.profiles(profile_completed);

-- B. ADMIN ROLES TABLE
create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin', 'super_admin')),
  created_at timestamptz not null default now()
);

create index idx_admin_roles_user on public.admin_roles(user_id);
create index idx_admin_roles_role on public.admin_roles(role);

-- C. ADMIN ROLE AUDIT LOGS
create table public.admin_role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_email text not null,
  action text not null check (action in ('assign_admin', 'revoke_admin')),
  performed_by uuid not null references auth.users(id) on delete cascade,
  performed_by_email text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_admin_role_audit_target on public.admin_role_audit_logs(target_user_id);
create index idx_admin_role_audit_created on public.admin_role_audit_logs(created_at desc);

-- D. POINT LOTS TABLE (Discrete Batches with 6-Month Expiry)
create table public.point_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'views' check (source_type in ('views', 'bonus', 'adjustment', 'challenge')),
  source_id text,
  original_points integer not null check (original_points > 0),
  remaining_points integer not null check (remaining_points >= 0 and remaining_points <= original_points),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_point_lots_user_expires on public.point_lots(user_id, expires_at asc, remaining_points);
create index idx_point_lots_active on public.point_lots(user_id, remaining_points) where remaining_points > 0;
create index idx_point_lots_source on public.point_lots(source_id);

-- E. POINT TRANSACTIONS TABLE (Immutable Movement Ledger)
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('earned', 'redeemed', 'expired', 'reversed', 'bonus', 'adjustment')),
  amount integer not null check (amount > 0),
  related_point_lot_id uuid references public.point_lots(id) on delete set null,
  reference_id text,
  idempotency_key text unique,
  description text not null,
  created_at timestamptz not null default now()
);

create index idx_point_transactions_user on public.point_transactions(user_id, created_at desc);
create index idx_point_transactions_lot on public.point_transactions(related_point_lot_id);
create index idx_point_transactions_ref on public.point_transactions(reference_id);

-- F. SUBMISSION DRAFTS TABLE
create table public.submission_drafts (
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

create index idx_submission_drafts_user on public.submission_drafts(user_id);

-- G. FINAL SUBMISSIONS TABLE
create table public.submissions (
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
  agreement_accepted boolean not null default false,
  agreement_version text not null default 'v1.0',
  agreement_accepted_at timestamptz,
  content_category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_submissions_user on public.submissions(user_id);
create index idx_submissions_status on public.submissions(status);
create index idx_submissions_submitted_at on public.submissions(submitted_at desc);
create index idx_submissions_identifier on public.submissions(normalized_video_identifier);
create index idx_submissions_leaderboard_perf on public.submissions (status, posting_date, verified_views desc, approved_points desc) where status = 'approved';

-- H. SUBMISSION EVIDENCE TABLE (Private Screenshots)
create table public.submission_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  retention_status text not null default 'active' check (retention_status in ('active', 'scheduled_for_deletion', 'disputed', 'deleted')),
  scheduled_deletion_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_evidence_submission on public.submission_evidence(submission_id);
create index idx_evidence_retention on public.submission_evidence(retention_status, scheduled_deletion_at);

-- I. SUBMISSION AUDIT LOGS (Immutable Decisions History)
create table public.submission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  admin_id uuid references auth.users(id) on delete set null,
  previous_status text not null,
  new_status text not null,
  verified_views bigint,
  approved_points integer,
  decision_reason text,
  admin_notes text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_submission on public.submission_audit_logs(submission_id);
create index idx_audit_logs_admin on public.submission_audit_logs(admin_id);
create index idx_audit_logs_created on public.submission_audit_logs(created_at desc);

-- J. REWARDS CATALOG TABLE
create table public.rewards (
  id text primary key,
  name text not null,
  description text not null,
  required_points integer not null check (required_points > 0),
  image_path text not null,
  reward_type text not null check (reward_type in ('merchandise', 'voucher', 'class_program')),
  availability boolean not null default true,
  redemption_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_rewards_availability on public.rewards(availability);
create index idx_rewards_required_points on public.rewards(required_points asc);

-- K. REDEMPTIONS TABLE
create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  reward_id text not null references public.rewards(id) on delete restrict,
  required_points_snapshot integer not null check (required_points_snapshot > 0),
  reward_name_snapshot text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'completed', 'rejected')),
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id) on delete set null,
  fulfillment_notes text,
  rejection_reason text,
  recipient_name text,
  shipping_address text,
  contact_whatsapp text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_redemptions_creator on public.redemptions(creator_id);
create index idx_redemptions_status on public.redemptions(status);
create index idx_redemptions_requested on public.redemptions(requested_at desc);
create index idx_redemptions_idempotency on public.redemptions(idempotency_key);

-- L. REDEMPTION ALLOCATIONS (Lot Consumption Audit)
create table public.redemption_allocations (
  id uuid primary key default gen_random_uuid(),
  redemption_id uuid not null references public.redemptions(id) on delete cascade,
  point_lot_id uuid not null references public.point_lots(id) on delete restrict,
  allocated_points integer not null check (allocated_points > 0),
  original_expiration_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_redemption_alloc_redemption on public.redemption_allocations(redemption_id);
create index idx_redemption_alloc_lot on public.redemption_allocations(point_lot_id);

-- M. CAMPAIGN COSTS TABLE
create table public.campaign_costs (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  category text not null check (category in ('merchandise', 'voucher', 'class_program', 'operational', 'other')),
  description text not null,
  amount_idr numeric(15, 2) not null check (amount_idr >= 0),
  expense_date date not null,
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_campaign_costs_year_quarter on public.campaign_costs(year, quarter);

-- N. QUARTERLY SNAPSHOTS TABLE
create table public.quarterly_snapshots (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  quarter text not null check (quarter in ('Q1', 'Q2', 'Q3', 'Q4')),
  version integer not null default 1,
  status text not null default 'draft' check (status in ('draft', 'finalized', 'revised')),
  kpi_data jsonb not null default '{}'::jsonb,
  platform_data jsonb not null default '{}'::jsonb,
  cost_data jsonb not null default '{}'::jsonb,
  monthly_data jsonb not null default '[]'::jsonb,
  content_data jsonb not null default '[]'::jsonb,
  methodology_version text not null default 'v1.0',
  cutoff_at timestamptz not null default now(),
  finalized_by uuid references auth.users(id) on delete set null,
  finalized_at timestamptz,
  revision_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_quarterly_snapshot_version unique (year, quarter, version)
);

create index idx_quarterly_snapshots_lookup on public.quarterly_snapshots(year, quarter, version desc);

-- O. VIDEO THUMBNAILS TABLE
create table public.video_thumbnails (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  thumbnail_url text not null,
  source text not null default 'manual',
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------------
-- 4. HELPER & UTILITY FUNCTIONS
-- ------------------------------------------------------------------------------

-- Update updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger tr_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create or replace trigger tr_point_lots_updated_at before update on public.point_lots for each row execute function public.handle_updated_at();
create or replace trigger tr_submission_drafts_updated_at before update on public.submission_drafts for each row execute function public.handle_updated_at();
create or replace trigger tr_submissions_updated_at before update on public.submissions for each row execute function public.handle_updated_at();
create or replace trigger tr_rewards_updated_at before update on public.rewards for each row execute function public.handle_updated_at();
create or replace trigger tr_redemptions_updated_at before update on public.redemptions for each row execute function public.handle_updated_at();
create or replace trigger tr_campaign_costs_updated_at before update on public.campaign_costs for each row execute function public.handle_updated_at();
create or replace trigger tr_quarterly_snapshots_updated_at before update on public.quarterly_snapshots for each row execute function public.handle_updated_at();

-- Check Admin privileges
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = check_user_id
    and role in ('admin', 'superadmin', 'super_admin')
  );
$$;

-- Check Super Admin privileges
create or replace function public.is_super_admin(check_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = check_user_id
    and role in ('superadmin', 'super_admin')
  );
$$;

-- Auto-create profile and auto-provision Super Admin for leadersosmed@gmail.com
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Create or update profile
  insert into public.profiles (
    id,
    full_name,
    email,
    tiktok_username,
    instagram_username,
    whatsapp_number,
    avatar_url,
    profile_completed
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1),
      'Creator'
    ),
    new.email,
    nullif(trim(regexp_replace(coalesce(new.raw_user_meta_data->>'tiktok_username', ''), '^@', '')), ''),
    nullif(trim(regexp_replace(coalesce(new.raw_user_meta_data->>'instagram_username', ''), '^@', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'whatsapp_number', new.raw_user_meta_data->>'phone_number', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')), ''),
    case when new.email = 'leadersosmed@gmail.com' then true else coalesce((new.raw_user_meta_data->>'profile_completed')::boolean, false) end
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    email = excluded.email,
    updated_at = now();

  -- 2. Permanent Super Admin enforcement for leadersosmed@gmail.com
  if new.email = 'leadersosmed@gmail.com' then
    insert into public.admin_roles (user_id, role)
    values (new.id, 'superadmin')
    on conflict (user_id) do update set role = 'superadmin';
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. BUSINESS LOGIC STORED PROCEDURES & RPCS
-- ------------------------------------------------------------------------------

-- 1. Get Wallet Summary
create or replace function public.get_wallet_summary(target_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_available integer;
  v_pending integer;
  v_redeemed integer;
  v_expired integer;
  v_expiring_soon integer;
  v_nearest_expiration timestamptz;
  v_total_earned integer;
begin
  if auth.uid() <> target_user_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized to access wallet summary';
  end if;

  select coalesce(sum(remaining_points), 0) into v_available
  from public.point_lots
  where user_id = target_user_id and remaining_points > 0 and expires_at > now();

  select coalesce(sum(amount), 0) into v_redeemed
  from public.point_transactions
  where user_id = target_user_id and transaction_type = 'redeemed';

  select coalesce(sum(amount), 0) into v_expired
  from public.point_transactions
  where user_id = target_user_id and transaction_type = 'expired';

  select coalesce(sum(original_points), 0) into v_total_earned
  from public.point_lots
  where user_id = target_user_id;

  select coalesce(sum(remaining_points), 0) into v_expiring_soon
  from public.point_lots
  where user_id = target_user_id and remaining_points > 0 and expires_at > now() and expires_at <= (now() + interval '30 days');

  select min(expires_at) into v_nearest_expiration
  from public.point_lots
  where user_id = target_user_id and remaining_points > 0 and expires_at > now();

  v_pending := 0;

  return json_build_object(
    'user_id', target_user_id,
    'available_points', v_available,
    'pending_points', v_pending,
    'redeemed_points', v_redeemed,
    'expired_points', v_expired,
    'total_earned_points', v_total_earned,
    'expiring_soon_points', v_expiring_soon,
    'nearest_expiration_date', v_nearest_expiration
  );
end;
$$;

-- 2. Issue Points Lot (Admin RPC)
create or replace function public.issue_points_lot(
  target_user_id uuid,
  p_points integer,
  p_source_type text default 'views',
  p_source_id text default null,
  p_description text default 'Penerbitan Poin Konten',
  p_idempotency_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_tx uuid;
  v_lot_id uuid;
  v_tx_id uuid;
  v_tx_type text;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin yang berhak menerbitkan poin.';
  end if;

  if p_points <= 0 then
    raise exception 'Jumlah poin harus lebih besar dari 0.';
  end if;

  if p_idempotency_key is not null then
    select id into v_existing_tx from public.point_transactions where idempotency_key = p_idempotency_key;
    if v_existing_tx is not null then
      return json_build_object('status', 'already_processed', 'transaction_id', v_existing_tx);
    end if;
  end if;

  if p_source_type = 'bonus' then
    v_tx_type := 'bonus';
  elsif p_source_type = 'adjustment' then
    v_tx_type := 'adjustment';
  else
    v_tx_type := 'earned';
  end if;

  insert into public.point_lots (
    user_id, source_type, source_id, original_points, remaining_points, issued_at, expires_at
  )
  values (
    target_user_id, p_source_type, p_source_id, p_points, p_points, now(), (now() + interval '6 months')
  )
  returning id into v_lot_id;

  insert into public.point_transactions (
    user_id, transaction_type, amount, related_point_lot_id, reference_id, idempotency_key, description
  )
  values (
    target_user_id, v_tx_type, p_points, v_lot_id, p_source_id, p_idempotency_key, p_description
  )
  returning id into v_tx_id;

  return json_build_object(
    'status', 'success',
    'lot_id', v_lot_id,
    'transaction_id', v_tx_id,
    'points', p_points,
    'expires_at', (now() + interval '6 months')
  );
end;
$$;

-- 3. Expire Overdue Point Lots
create or replace function public.expire_overdue_point_lots()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot record;
  v_expired_count integer := 0;
  v_total_points_expired integer := 0;
begin
  for v_lot in
    select id, user_id, remaining_points
    from public.point_lots
    where remaining_points > 0 and expires_at <= now()
    for update
  loop
    update public.point_lots
    set remaining_points = 0, updated_at = now()
    where id = v_lot.id;

    insert into public.point_transactions (
      user_id, transaction_type, amount, related_point_lot_id, description
    )
    values (
      v_lot.user_id, 'expired', v_lot.remaining_points, v_lot.id, 'Poin kedaluwarsa (masa aktif 6 bulan habis)'
    );

    v_expired_count := v_expired_count + 1;
    v_total_points_expired := v_total_points_expired + v_lot.remaining_points;
  end loop;

  return json_build_object(
    'status', 'success',
    'lots_expired_count', v_expired_count,
    'total_points_expired', v_total_points_expired
  );
end;
$$;

-- 4. Atomic Submission Approval and Point Issuance
create or replace function public.approve_submission_and_issue_points(
  p_submission_id uuid,
  p_verified_views bigint,
  p_admin_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_points integer;
  v_lot_id uuid;
  v_tx_id uuid;
  v_audit_id uuid;
  v_idempotency_key text;
  v_existing_tx uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Hanya administrator yang berhak memverifikasi pengajuan.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Pengajuan video tidak ditemukan.';
  end if;

  if v_sub.status = 'approved' then
    return json_build_object(
      'status', 'already_approved',
      'message', 'Pengajuan ini sudah pernah disetujui sebelumnya.',
      'approved_points', v_sub.approved_points,
      'verified_views', v_sub.verified_views
    );
  end if;

  v_idempotency_key := 'submission_approval_' || p_submission_id::text;
  select id into v_existing_tx from public.point_transactions where idempotency_key = v_idempotency_key;
  if v_existing_tx is not null then
    return json_build_object('status', 'already_processed', 'transaction_id', v_existing_tx);
  end if;

  if p_verified_views < 0 then
    raise exception 'Jumlah verified views tidak boleh negatif.';
  end if;

  v_points := floor(p_verified_views / 100);

  if v_points > 0 then
    insert into public.point_lots (
      user_id, source_type, source_id, original_points, remaining_points, issued_at, expires_at
    )
    values (
      v_sub.user_id, 'views', p_submission_id::text, v_points, v_points, now(), (now() + interval '6 months')
    )
    returning id into v_lot_id;

    insert into public.point_transactions (
      user_id, transaction_type, amount, related_point_lot_id, reference_id, idempotency_key, description
    )
    values (
      v_sub.user_id, 'earned', v_points, v_lot_id, p_submission_id::text, v_idempotency_key,
      'Poin Konten Disetujui: ' || initcap(v_sub.platform) || ' (' || to_char(p_verified_views, 'FM999,999,999') || ' Views)'
    )
    returning id into v_tx_id;
  end if;

  update public.submissions
  set status = 'approved',
      verified_views = p_verified_views,
      approved_points = v_points,
      admin_notes = p_admin_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_submission_id;

  update public.submission_evidence
  set retention_status = 'scheduled_for_deletion',
      scheduled_deletion_at = now() + interval '14 days'
  where submission_id = p_submission_id and retention_status <> 'disputed';

  insert into public.submission_audit_logs (
    submission_id, admin_id, previous_status, new_status, verified_views, approved_points, decision_reason, admin_notes
  )
  values (
    p_submission_id, auth.uid(), v_sub.status, 'approved', p_verified_views, v_points, 'Disetujui oleh admin', p_admin_notes
  )
  returning id into v_audit_id;

  return json_build_object(
    'status', 'success',
    'submission_id', p_submission_id,
    'verified_views', p_verified_views,
    'approved_points', v_points,
    'lot_id', v_lot_id,
    'transaction_id', v_tx_id,
    'audit_id', v_audit_id,
    'expires_at', (now() + interval '6 months')
  );
end;
$$;

-- 5. Reject Submission with Reason
create or replace function public.reject_submission(
  p_submission_id uuid,
  p_rejection_reason text,
  p_admin_notes text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub record;
  v_audit_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Hanya administrator yang berhak menolak pengajuan.';
  end if;

  select * into v_sub from public.submissions where id = p_submission_id for update;
  if not found then
    raise exception 'Pengajuan video tidak ditemukan.';
  end if;

  if v_sub.status = 'approved' then
    raise exception 'Pengajuan yang sudah disetujui tidak dapat ditolak.';
  end if;

  update public.submissions
  set status = 'rejected',
      admin_notes = coalesce(p_admin_notes, p_rejection_reason),
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_submission_id;

  update public.submission_evidence
  set retention_status = 'scheduled_for_deletion',
      scheduled_deletion_at = now() + interval '14 days'
  where submission_id = p_submission_id and retention_status <> 'disputed';

  insert into public.submission_audit_logs (
    submission_id, admin_id, previous_status, new_status, decision_reason, admin_notes
  )
  values (
    p_submission_id, auth.uid(), v_sub.status, 'rejected', p_rejection_reason, p_admin_notes
  )
  returning id into v_audit_id;

  return json_build_object(
    'status', 'success',
    'submission_id', p_submission_id,
    'rejection_reason', p_rejection_reason,
    'audit_id', v_audit_id
  );
end;
$$;

-- 6. Expired Evidence Cleanup Helper
create or replace function public.get_expired_evidence_for_cleanup(p_limit integer default 50)
returns table (
  id uuid,
  storage_path text,
  file_name text,
  submission_id uuid,
  retention_status text,
  scheduled_deletion_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select id, storage_path, file_name, submission_id, retention_status, scheduled_deletion_at
  from public.submission_evidence
  where retention_status = 'scheduled_for_deletion'
    and scheduled_deletion_at <= now()
  order by scheduled_deletion_at asc
  limit p_limit;
$$;

-- 7. Atomic Reward Redemption RPC
create or replace function public.redeem_reward_atomic(
  p_creator_id uuid,
  p_reward_id text,
  p_shipping_address text default null,
  p_contact_whatsapp text default null,
  p_recipient_name text default null,
  p_idempotency_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_available_points integer := 0;
  v_remaining_to_deduct integer;
  v_redemption_id uuid;
  v_existing_redemption record;
  v_lot record;
  v_deduct integer;
  v_now timestamptz := now();
  v_tx_id uuid;
begin
  if auth.uid() <> p_creator_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Anda hanya dapat menukarkan poin untuk akun Anda sendiri.';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing_redemption
    from public.redemptions
    where idempotency_key = p_idempotency_key;

    if v_existing_redemption.id is not null then
      return json_build_object(
        'status', 'already_redeemed',
        'message', 'Penukaran reward ini sudah berhasil diajukan sebelumnya.',
        'redemption_id', v_existing_redemption.id,
        'reward_name', v_existing_redemption.reward_name_snapshot,
        'points_spent', v_existing_redemption.required_points_snapshot
      );
    end if;
  end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if not found then
    raise exception 'Reward tidak ditemukan dalam katalog resmi.';
  end if;

  if not v_reward.availability then
    raise exception 'Mohon maaf, reward % saat ini sedang tidak tersedia.', v_reward.name;
  end if;

  select coalesce(sum(remaining_points), 0) into v_available_points
  from public.point_lots
  where user_id = p_creator_id and remaining_points > 0 and expires_at > v_now;

  if v_available_points < v_reward.required_points then
    raise exception 'Saldo poin tidak mencukupi. Anda memiliki % Poin, dibutuhkan % Poin.',
      v_available_points, v_reward.required_points;
  end if;

  insert into public.redemptions (
    creator_id, reward_id, required_points_snapshot, reward_name_snapshot, status, requested_at,
    recipient_name, shipping_address, contact_whatsapp, idempotency_key
  )
  values (
    p_creator_id, v_reward.id, v_reward.required_points, v_reward.name, 'pending', v_now,
    p_recipient_name, p_shipping_address, p_contact_whatsapp, p_idempotency_key
  )
  returning id into v_redemption_id;

  v_remaining_to_deduct := v_reward.required_points;

  for v_lot in
    select id, remaining_points, expires_at
    from public.point_lots
    where user_id = p_creator_id and remaining_points > 0 and expires_at > v_now
    order by expires_at asc, id asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    v_deduct := least(v_lot.remaining_points, v_remaining_to_deduct);

    update public.point_lots
    set remaining_points = remaining_points - v_deduct, updated_at = v_now
    where id = v_lot.id;

    insert into public.redemption_allocations (
      redemption_id, point_lot_id, allocated_points, original_expiration_date, created_at
    )
    values (
      v_redemption_id, v_lot.id, v_deduct, v_lot.expires_at, v_now
    );

    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct;
  end loop;

  insert into public.point_transactions (
    user_id, transaction_type, amount, reference_id, idempotency_key, description, created_at
  )
  values (
    p_creator_id, 'redeemed', v_reward.required_points, v_redemption_id::text,
    p_idempotency_key, 'Penukaran Reward: ' || v_reward.name, v_now
  )
  returning id into v_tx_id;

  return json_build_object(
    'status', 'success',
    'message', 'Berhasil! Hadiahmu sudah diajukan.',
    'redemption_id', v_redemption_id,
    'reward_name', v_reward.name,
    'points_spent', v_reward.required_points,
    'remaining_balance', v_available_points - v_reward.required_points,
    'transaction_id', v_tx_id
  );
end;
$$;

-- 8. Admin Process Redemption (Fulfillment & Safe Refund)
create or replace function public.admin_process_redemption(
  p_redemption_id uuid,
  p_action text,
  p_fulfillment_notes text default null,
  p_rejection_reason text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_redemption record;
  v_alloc record;
  v_restored_total integer := 0;
  v_now timestamptz := now();
  v_admin_id uuid := auth.uid();
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'Unauthorized: Hanya administrator yang berhak memproses permohonan penukaran.';
  end if;

  select * into v_redemption from public.redemptions where id = p_redemption_id for update;
  if not found then
    raise exception 'Data penukaran tidak ditemukan.';
  end if;

  if v_redemption.status = 'rejected' then
    raise exception 'Penukaran ini sudah pernah ditolak sebelumnya.';
  end if;

  if v_redemption.status = 'completed' and p_action = 'reject' then
    raise exception 'Penukaran yang sudah selesai tidak dapat ditolak.';
  end if;

  if p_action = 'processing' then
    update public.redemptions
    set status = 'processing', processed_at = v_now, processed_by = v_admin_id,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes), updated_at = v_now
    where id = p_redemption_id;

    return json_build_object('status', 'success', 'message', 'Status penukaran diubah menjadi sedang diproses.');

  elsif p_action = 'ready' then
    update public.redemptions
    set status = 'ready', processed_at = v_now, processed_by = v_admin_id,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes), updated_at = v_now
    where id = p_redemption_id;

    return json_build_object('status', 'success', 'message', 'Status penukaran diubah menjadi siap diambil.');

  elsif p_action = 'completed' then
    update public.redemptions
    set status = 'completed', processed_at = v_now, processed_by = v_admin_id,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes), updated_at = v_now
    where id = p_redemption_id;

    return json_build_object('status', 'success', 'message', 'Penukaran reward telah berhasil diselesaikan.');

  elsif p_action = 'reject' then
    if coalesce(trim(p_rejection_reason), '') = '' then
      raise exception 'Alasan penolakan wajib diisi.';
    end if;

    update public.redemptions
    set status = 'rejected', rejection_reason = p_rejection_reason, processed_at = v_now,
        processed_by = v_admin_id, fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes), updated_at = v_now
    where id = p_redemption_id;

    for v_alloc in
      select * from public.redemption_allocations where redemption_id = p_redemption_id for update
    loop
      if v_alloc.original_expiration_date > v_now then
        update public.point_lots
        set remaining_points = remaining_points + v_alloc.allocated_points, updated_at = v_now
        where id = v_alloc.point_lot_id;

        v_restored_total := v_restored_total + v_alloc.allocated_points;
      else
        insert into public.point_lots (
          user_id, source_type, source_id, original_points, remaining_points, issued_at, expires_at
        )
        values (
          v_redemption.creator_id, 'adjustment', p_redemption_id::text,
          v_alloc.allocated_points, v_alloc.allocated_points, v_now, (v_now + interval '30 days')
        );

        v_restored_total := v_restored_total + v_alloc.allocated_points;
      end if;
    end loop;

    insert into public.point_transactions (
      user_id, transaction_type, amount, reference_id, idempotency_key, description, created_at
    )
    values (
      v_redemption.creator_id, 'adjustment', v_restored_total, p_redemption_id::text,
      'refund_redemption_' || p_redemption_id::text,
      'Pengembalian Poin Penukaran Ditolak: ' || v_redemption.reward_name_snapshot || ' (' || p_rejection_reason || ')',
      v_now
    );

    return json_build_object(
      'status', 'success',
      'message', 'Penukaran ditolak dan ' || v_restored_total || ' poin berhasil dikembalikan ke kreator.',
      'refunded_points', v_restored_total
    );
  else
    raise exception 'Aksi tidak valid: %', p_action;
  end if;
end;
$$;

-- 9. Top Creators Leaderboard RPC
create or replace function public.get_leaderboard_creators(
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_limit integer default 5
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_start timestamptz;
  v_start_date date;
  v_end_date date;
  v_result json;
begin
  v_end := coalesce(p_end_date, now());
  v_start := coalesce(p_start_date, v_end - interval '3 months');
  v_start_date := (v_start at time zone 'Asia/Jakarta')::date;
  v_end_date := (v_end at time zone 'Asia/Jakarta')::date;

  with creator_aggregates as (
    select
      s.user_id,
      p.full_name as creator_name,
      coalesce(
        case when p.tiktok_username is not null and trim(p.tiktok_username) != '' then '@' || trim(leading '@' from p.tiktok_username) end,
        case when p.instagram_username is not null and trim(p.instagram_username) != '' then '@' || trim(leading '@' from p.instagram_username) end,
        null
      ) as creator_handle,
      p.avatar_url as creator_avatar,
      sum(s.approved_points)::integer as total_points,
      sum(s.verified_views)::bigint as total_views,
      count(s.id)::integer as approved_videos
    from public.submissions s
    join public.profiles p on p.id = s.user_id
    where s.status = 'approved'
      and s.posting_date >= v_start_date
      and s.posting_date <= v_end_date
      and s.verified_views is not null
      and s.verified_views > 0
    group by s.user_id, p.full_name, p.tiktok_username, p.instagram_username, p.avatar_url
  ),
  ranked_creators as (
    select
      row_number() over (
        order by total_points desc, total_views desc, approved_videos desc, creator_name asc, user_id asc
      ) as rank,
      user_id as creator_id,
      creator_name as name,
      creator_handle as handle,
      creator_avatar as avatar,
      total_points,
      total_views,
      approved_videos
    from creator_aggregates
  )
  select coalesce(
    json_agg(
      json_build_object(
        'rank', rank, 'creatorId', creator_id, 'name', name, 'handle', handle,
        'avatar', avatar, 'totalPoints', total_points, 'totalViews', total_views, 'approvedVideos', approved_videos
      )
      order by rank asc
    ),
    '[]'::json
  ) into v_result
  from (
    select * from ranked_creators order by rank asc limit greatest(1, coalesce(p_limit, 5))
  ) top_n;

  return v_result;
end;
$$;

-- 10. Top Trending Videos Leaderboard RPC
create or replace function public.get_leaderboard_videos(
  p_start_date timestamptz default null,
  p_end_date timestamptz default null,
  p_limit integer default 10
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_start timestamptz;
  v_start_date date;
  v_end_date date;
  v_result json;
begin
  v_end := coalesce(p_end_date, now());
  v_start := coalesce(p_start_date, v_end - interval '3 months');
  v_start_date := (v_start at time zone 'Asia/Jakarta')::date;
  v_end_date := (v_end at time zone 'Asia/Jakarta')::date;

  with eligible_videos as (
    select
      s.id,
      s.user_id,
      s.platform,
      s.video_url,
      s.posting_date,
      s.submitted_at,
      s.verified_views as views,
      s.approved_points as points,
      p.full_name as creator_name,
      coalesce(
        case when p.tiktok_username is not null and trim(p.tiktok_username) != '' then '@' || trim(leading '@' from p.tiktok_username) end,
        case when p.instagram_username is not null and trim(p.instagram_username) != '' then '@' || trim(leading '@' from p.instagram_username) end,
        null
      ) as creator_handle,
      p.avatar_url as creator_avatar,
      case
        when s.platform = 'tiktok' then 'Konten TikTok oleh ' || p.full_name
        when s.platform = 'instagram' then 'Video Reels oleh ' || p.full_name
        else 'Video Kreator ' || p.full_name
      end as generated_title,
      case
        when s.platform = 'tiktok' then 'TikTok'
        when s.platform = 'instagram' then 'Instagram Reels'
        else initcap(s.platform)
      end as display_platform
    from public.submissions s
    join public.profiles p on p.id = s.user_id
    where s.status = 'approved'
      and s.posting_date >= v_start_date
      and s.posting_date <= v_end_date
      and s.verified_views is not null
      and s.verified_views > 0
  ),
  ranked_videos as (
    select
      row_number() over (
        order by views desc, points desc, submitted_at desc, id asc
      ) as rank,
      id, user_id as creator_id, creator_name, creator_handle, creator_avatar,
      display_platform as platform, video_url, generated_title as title, views, points, posting_date
    from eligible_videos
  )
  select coalesce(
    json_agg(
      json_build_object(
        'rank', rank, 'id', id, 'creatorId', creator_id, 'creatorName', creator_name,
        'creatorHandle', creator_handle, 'creatorAvatar', creator_avatar, 'platform', platform,
        'videoUrl', video_url, 'title', title, 'views', views, 'points', points, 'postingDate', posting_date
      )
      order by rank asc
    ),
    '[]'::json
  ) into v_result
  from (
    select * from ranked_videos order by rank asc limit greatest(1, coalesce(p_limit, 10))
  ) top_v;

  return v_result;
end;
$$;

-- 11. Creator Rank RPC
create or replace function public.get_creator_rank(
  p_user_id uuid,
  p_start_date timestamptz default null,
  p_end_date timestamptz default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_end timestamptz;
  v_start timestamptz;
  v_start_date date;
  v_end_date date;
  v_total_creators integer := 0;
  v_user_row record;
begin
  v_end := coalesce(p_end_date, now());
  v_start := coalesce(p_start_date, v_end - interval '3 months');
  v_start_date := (v_start at time zone 'Asia/Jakarta')::date;
  v_end_date := (v_end at time zone 'Asia/Jakarta')::date;

  with creator_aggregates as (
    select
      s.user_id,
      sum(s.approved_points)::integer as total_points,
      sum(s.verified_views)::bigint as total_views,
      count(s.id)::integer as approved_videos
    from public.submissions s
    where s.status = 'approved' and s.posting_date >= v_start_date and s.posting_date <= v_end_date and s.verified_views > 0
    group by s.user_id
  ),
  ranked_creators as (
    select
      row_number() over (order by total_points desc, total_views desc, approved_videos desc, user_id asc) as rank,
      user_id, total_points, total_views, approved_videos
    from creator_aggregates
  )
  select count(*) into v_total_creators from ranked_creators;

  select * into v_user_row from ranked_creators where user_id = p_user_id;

  if not found then
    return null;
  end if;

  return json_build_object(
    'rank', v_user_row.rank,
    'totalCreators', v_total_creators,
    'totalPoints', v_user_row.total_points,
    'totalViews', v_user_row.total_views,
    'approvedVideos', v_user_row.approved_videos
  );
end;
$$;

grant execute on function public.get_leaderboard_creators(timestamptz, timestamptz, integer) to anon, authenticated, service_role;
grant execute on function public.get_leaderboard_videos(timestamptz, timestamptz, integer) to anon, authenticated, service_role;
grant execute on function public.get_creator_rank(uuid, timestamptz, timestamptz) to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;
alter table public.admin_role_audit_logs enable row level security;
alter table public.point_lots enable row level security;
alter table public.point_transactions enable row level security;
alter table public.submission_drafts enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_evidence enable row level security;
alter table public.submission_audit_logs enable row level security;
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.redemption_allocations enable row level security;
alter table public.campaign_costs enable row level security;
alter table public.quarterly_snapshots enable row level security;
alter table public.video_thumbnails enable row level security;

-- Profiles Policies
create policy "profiles_select_own_or_admin" on public.profiles for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

-- Admin Roles Policies
create policy "Anyone can read admin roles for auth check" on public.admin_roles for select using (true);
create policy "Only super admins can modify admin roles" on public.admin_roles for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));

-- Admin Role Audit Logs Policies
create policy "Super admins can view admin role audit logs" on public.admin_role_audit_logs for select using (public.is_super_admin(auth.uid()));
create policy "Super admins can insert admin role audit logs" on public.admin_role_audit_logs for insert with check (public.is_super_admin(auth.uid()));

-- Point Lots Policies
create policy "point_lots_select_own_or_admin" on public.point_lots for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "point_lots_admin_insert" on public.point_lots for insert with check (public.is_admin(auth.uid()));
create policy "point_lots_admin_update" on public.point_lots for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "point_lots_admin_delete" on public.point_lots for delete using (public.is_admin(auth.uid()));

-- Point Transactions Policies
create policy "point_transactions_select_own_or_admin" on public.point_transactions for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "point_transactions_admin_insert" on public.point_transactions for insert with check (public.is_admin(auth.uid()));

-- Submission Drafts Policies
create policy "drafts_select_own" on public.submission_drafts for select using (auth.uid() = user_id);
create policy "drafts_insert_own" on public.submission_drafts for insert with check (auth.uid() = user_id);
create policy "drafts_update_own" on public.submission_drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "drafts_delete_own" on public.submission_drafts for delete using (auth.uid() = user_id);

-- Submissions Policies
create policy "submissions_select_own_or_admin" on public.submissions for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "submissions_insert_creator" on public.submissions for insert with check (auth.uid() = user_id and status = 'submitted');
create policy "submissions_admin_update" on public.submissions for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "submissions_admin_delete" on public.submissions for delete using (public.is_admin(auth.uid()));

-- Submission Evidence Policies
create policy "evidence_select_own_or_admin" on public.submission_evidence for select using (
  exists (select 1 from public.submissions s where s.id = submission_id and (s.user_id = auth.uid() or public.is_admin(auth.uid())))
);
create policy "evidence_insert_creator" on public.submission_evidence for insert with check (
  exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);
create policy "evidence_admin_update" on public.submission_evidence for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "evidence_admin_delete" on public.submission_evidence for delete using (public.is_admin(auth.uid()));

-- Submission Audit Logs Policies
create policy "audit_logs_admin_select" on public.submission_audit_logs for select using (public.is_admin(auth.uid()));
create policy "audit_logs_creator_select_own" on public.submission_audit_logs for select using (
  exists (select 1 from public.submissions s where s.id = submission_id and s.user_id = auth.uid())
);
create policy "audit_logs_admin_insert" on public.submission_audit_logs for insert with check (public.is_admin(auth.uid()));

-- Rewards Policies
create policy "rewards_select_public" on public.rewards for select using (true);
create policy "rewards_admin_modify" on public.rewards for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Redemptions Policies
create policy "redemptions_select_creator" on public.redemptions for select using (auth.uid() = creator_id or public.is_admin(auth.uid()));
create policy "redemptions_insert_creator" on public.redemptions for insert with check (auth.uid() = creator_id and status = 'pending');
create policy "redemptions_admin_update" on public.redemptions for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Redemption Allocations Policies
create policy "allocations_select" on public.redemption_allocations for select using (
  exists (select 1 from public.redemptions r where r.id = redemption_id and (r.creator_id = auth.uid() or public.is_admin(auth.uid())))
);

-- Campaign Costs & Snapshots Policies
create policy "campaign_costs_admin" on public.campaign_costs for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "quarterly_snapshots_admin" on public.quarterly_snapshots for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Video Thumbnails Policies
create policy "thumbnails_public_select" on public.video_thumbnails for select using (true);
create policy "thumbnails_admin_manage" on public.video_thumbnails for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ------------------------------------------------------------------------------
-- 7. STORAGE BUCKET CONFIGURATIONS
-- ------------------------------------------------------------------------------

-- Bucket A: submission-evidence (Private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-evidence', 'submission-evidence', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Bucket B: video-thumbnails (Public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'video-thumbnails', 'video-thumbnails', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage Policies: submission-evidence
drop policy if exists "evidence_insert_own_folder" on storage.objects;
create policy "evidence_insert_own_folder" on storage.objects for insert with check (
  bucket_id = 'submission-evidence' and auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "evidence_select_own_or_admin" on storage.objects;
create policy "evidence_select_own_or_admin" on storage.objects for select using (
  bucket_id = 'submission-evidence' and (
    (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text) or public.is_admin(auth.uid())
  )
);

-- Storage Policies: video-thumbnails
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects for select using (bucket_id = 'video-thumbnails');

drop policy if exists "thumbnails_admin_write" on storage.objects;
create policy "thumbnails_admin_write" on storage.objects for insert with check (
  bucket_id = 'video-thumbnails' and public.is_admin(auth.uid())
);

-- ------------------------------------------------------------------------------
-- 8. INITIAL SEEDING: OFFICIAL REWARDS (13 MR.BOB ITEMS)
-- ------------------------------------------------------------------------------
insert into public.rewards (id, name, description, required_points, image_path, reward_type, availability, redemption_terms)
values
  ('reward-1', 'Keychain Mr.BOB', 'Gantungan kunci eksklusif bertema Mr.BOB Kampung Inggris.', 10, 'https://images.unsplash.com/photo-1614036417651-efe5912149d8?w=500&auto=format&fit=crop&q=80', 'merchandise', true, 'Dapat diambil langsung di kantor Mr.BOB Pare atau dikirimkan ke alamat creator.'),
  ('reward-2', 'Notebook Merchandise', 'Buku catatan spiral premium Mr.BOB untuk mencatat vocab & materi.', 50, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80', 'merchandise', true, 'Dapat diambil di Pare atau dikirimkan.'),
  ('reward-3', 'T-Shirt Mr.BOB Kampung Inggris', 'Kaos cotton combed eksklusif official Mr.BOB Kampung Inggris.', 75, 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80', 'merchandise', true, 'Tersedia ukuran S, M, L, XL, XXL. Alamat pengiriman wajib lengkap.'),
  ('reward-4', 'Free Program Kelas Satuan 2 Minggu', 'Akses gratis program kelas satuan pilihan durasi 2 minggu.', 100, 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Berlaku untuk 1 pilihan kelas speaking/grammar periode masuk terdekat.'),
  ('reward-5', 'Voucher Belajar Rp250.000', 'Voucher potongan biaya pendaftaran kursus senilai Rp250.000.', 200, 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=500&auto=format&fit=crop&q=80', 'voucher', true, 'Dapat digunakan untuk pendaftaran program paket camp maupun non camp.'),
  ('reward-6', 'Free Program Kelas Satuan 1 Bulan', 'Gratis kelas satuan full 1 bulan untuk upgrade speaking/grammar.', 500, 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Termasuk modul belajar resmi dan sertifikat penyelesaian.'),
  ('reward-7', 'Free Super Private Class Speaking Akselerasi', 'Sesi privat intensif 1-on-1 bersama Master Tutor Mr.BOB.', 1000, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Jadwal fleksibel disesuaikan dengan ketersediaan Master Tutor.'),
  ('reward-8', 'Free Program Kelas 2 Minggu Non Camp', 'Paket lengkap program tatap muka 2 minggu non camp di Pare.', 2500, 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Termasuk semua kelas harian reguler selama 2 minggu kalender.'),
  ('reward-9', 'Free Program Kelas 1 Bulan Non Camp', 'Paket kursus 1 bulan penuh non camp di Mr.BOB Kampung Inggris.', 5000, 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Paket program intensif 1 bulan tatap muka langsung di Pare Kediri.'),
  ('reward-10', 'Free Program Kelas 1 Bulan 5-up', 'Paket program intensif 1 bulan paket asrama 5-up English area.', 7500, 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Termasuk fasilitas asrama english area 24 jam & kaos official.'),
  ('reward-11', 'Free Program Kelas 2 Bulan 5-up', 'Paket lengkap belajar 2 bulan asrama 5-up garansi lancar speaking.', 10000, 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Termasuk asrama 5-up 2 bulan, modul lengkap, dan kegiatan outbound pare.'),
  ('reward-12', 'Free Program Kelas 3 Bulan 5-up', 'Program intensif transformasi bahasa Inggris 3 bulan penuh.', 20000, 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Program unggulan transformasi speaking dari dasar hingga mahir.'),
  ('reward-13', 'Free Program Kelas 3 Bulan 7-up', 'The Ultimate Journey: 3 bulan paket asrama 7-up all-inclusive VIP.', 50000, 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=500&auto=format&fit=crop&q=80', 'class_program', true, 'Paket VIP all-inclusive fasilitas asrama ber-AC 7-up dan pendampingan khusus.')
on conflict (id) do update set
  name = excluded.name, description = excluded.description, required_points = excluded.required_points,
  image_path = excluded.image_path, reward_type = excluded.reward_type, availability = excluded.availability,
  redemption_terms = excluded.redemption_terms, updated_at = now();

-- ------------------------------------------------------------------------------
-- 9. USER RE-SYNC & PERMANENT SUPER ADMIN PROVISIONING
-- ------------------------------------------------------------------------------
do $$
declare
  v_user record;
  v_superadmin_id uuid;
begin
  -- Backfill profiles for all existing users in auth.users
  for v_user in select * from auth.users loop
    insert into public.profiles (
      id, full_name, email, tiktok_username, instagram_username, whatsapp_number, avatar_url, profile_completed
    )
    values (
      v_user.id,
      coalesce(
        v_user.raw_user_meta_data->>'full_name',
        v_user.raw_user_meta_data->>'name',
        v_user.raw_user_meta_data->>'display_name',
        split_part(v_user.email, '@', 1),
        'Creator'
      ),
      v_user.email,
      nullif(trim(regexp_replace(coalesce(v_user.raw_user_meta_data->>'tiktok_username', ''), '^@', '')), ''),
      nullif(trim(regexp_replace(coalesce(v_user.raw_user_meta_data->>'instagram_username', ''), '^@', '')), ''),
      nullif(trim(coalesce(v_user.raw_user_meta_data->>'whatsapp_number', v_user.raw_user_meta_data->>'phone_number', '')), ''),
      nullif(trim(coalesce(v_user.raw_user_meta_data->>'avatar_url', v_user.raw_user_meta_data->>'picture', '')), ''),
      case when v_user.email = 'leadersosmed@gmail.com' then true else coalesce((v_user.raw_user_meta_data->>'profile_completed')::boolean, false) end
    )
    on conflict (id) do update set
      avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
      email = excluded.email;
  end loop;

  -- Ensure leadersosmed@gmail.com is granted SUPER ADMIN
  select id into v_superadmin_id from auth.users where email = 'leadersosmed@gmail.com';

  if v_superadmin_id is not null then
    insert into public.admin_roles (user_id, role)
    values (v_superadmin_id, 'superadmin')
    on conflict (user_id) do update set role = 'superadmin';

    update public.profiles
    set full_name = 'Leader Sosmed',
        profile_completed = true
    where id = v_superadmin_id;

    raise notice '✅ Super Admin successfully provisioned for leadersosmed@gmail.com (UID: %)', v_superadmin_id;
  else
    raise notice 'ℹ️ leadersosmed@gmail.com is not yet registered in auth.users. The trigger will grant Super Admin upon Google Sign-In.';
  end if;
end $$;

-- ------------------------------------------------------------------------------
-- 10. BASELINE CAMPAIGN DATA (SEED 4 APPROVED SUBMISSIONS & WALLET LEDGER)
-- ------------------------------------------------------------------------------
do $$
declare
  v_admin_id uuid;
  v_lot1 uuid;
  v_lot2 uuid;
  v_lot3 uuid;
  v_lot4 uuid;
begin
  select id into v_admin_id from auth.users where email = 'leadersosmed@gmail.com';

  if v_admin_id is not null then
    -- Sub 1
    insert into public.submissions (
      id, user_id, platform, video_url, normalized_video_identifier, posting_date,
      claimed_views, estimated_points, verified_views, approved_points, status,
      agreement_accepted, agreement_version, content_category, reviewed_by, reviewed_at
    )
    values (
      'fca80452-26a2-4479-89c5-f6bb2276f1eb', v_admin_id, 'instagram',
      'https://www.instagram.com/reel/DeO73KGvUWx/', 'instagram:reel:DeO73KGvUWx', '2026-10-10',
      18100, 181, 18100, 181, 'approved', true, 'v1.0', 'Educational', v_admin_id, now()
    )
    on conflict (normalized_video_identifier) do update set
      status = 'approved', verified_views = 18100, approved_points = 181;

    -- Sub 2
    insert into public.submissions (
      id, user_id, platform, video_url, normalized_video_identifier, posting_date,
      claimed_views, estimated_points, verified_views, approved_points, status,
      agreement_accepted, agreement_version, reviewed_by, reviewed_at
    )
    values (
      'a06d58f4-c95b-495f-a642-3e27b12e67e5', v_admin_id, 'instagram',
      'https://www.instagram.com/reel/DeWpnUwPBBP/', 'instagram:reel:DeWpnUwPBBP', '2026-10-12',
      14300, 143, 14300, 143, 'approved', true, 'v1.0', v_admin_id, now()
    )
    on conflict (normalized_video_identifier) do update set
      status = 'approved', verified_views = 14300, approved_points = 143;

    -- Sub 3
    insert into public.submissions (
      id, user_id, platform, video_url, normalized_video_identifier, posting_date,
      claimed_views, estimated_points, verified_views, approved_points, status,
      admin_notes, agreement_accepted, agreement_version, reviewed_by, reviewed_at
    )
    values (
      '26bb93d3-5f70-41f1-9e5b-a471e41f1a4a', v_admin_id, 'instagram',
      'https://www.instagram.com/reel/DeeYVjLPCH8/', 'instagram:reel:DeeYVjLPCH8', '2026-10-14',
      3700, 37, 2500, 25, 'approved', 'view setelah dicek ternyata cuman 2500', true, 'v1.0', v_admin_id, now()
    )
    on conflict (normalized_video_identifier) do update set
      status = 'approved', verified_views = 2500, approved_points = 25;

    -- Sub 4
    insert into public.submissions (
      id, user_id, platform, video_url, normalized_video_identifier, posting_date,
      claimed_views, estimated_points, verified_views, approved_points, status,
      admin_notes, agreement_accepted, agreement_version, reviewed_by, reviewed_at
    )
    values (
      '2e1c6948-4572-41fc-9f5b-1b75895d6be8', v_admin_id, 'instagram',
      'https://www.instagram.com/reel/C5QdYTiPkYP/', 'instagram:reel:C5QdYTiPkYP', '2026-10-01',
      1000, 10, 1000, 10, 'approved', 'bukti views diverifikasi', true, 'v1.0', v_admin_id, now()
    )
    on conflict (normalized_video_identifier) do update set
      status = 'approved', verified_views = 1000, approved_points = 10;

    -- Corresponding Point Lots
    insert into public.point_lots (id, user_id, source_type, source_id, original_points, remaining_points, issued_at, expires_at)
    values
      (gen_random_uuid(), v_admin_id, 'views', 'fca80452-26a2-4479-89c5-f6bb2276f1eb', 181, 181, now(), (now() + interval '6 months')),
      (gen_random_uuid(), v_admin_id, 'views', 'a06d58f4-c95b-495f-a642-3e27b12e67e5', 143, 143, now(), (now() + interval '6 months')),
      (gen_random_uuid(), v_admin_id, 'views', '26bb93d3-5f70-41f1-9e5b-a471e41f1a4a', 25, 25, now(), (now() + interval '6 months')),
      (gen_random_uuid(), v_admin_id, 'views', '2e1c6948-4572-41fc-9f5b-1b75895d6be8', 10, 10, now(), (now() + interval '6 months'));

    -- Corresponding Point Transactions
    insert into public.point_transactions (user_id, transaction_type, amount, reference_id, description)
    values
      (v_admin_id, 'earned', 181, 'fca80452-26a2-4479-89c5-f6bb2276f1eb', 'Poin Konten Disetujui: Instagram Reels (18,100 Views)'),
      (v_admin_id, 'earned', 143, 'a06d58f4-c95b-495f-a642-3e27b12e67e5', 'Poin Konten Disetujui: Instagram Reels (14,300 Views)'),
      (v_admin_id, 'earned', 25, '26bb93d3-5f70-41f1-9e5b-a471e41f1a4a', 'Poin Konten Disetujui: Instagram Reels (2,500 Views)'),
      (v_admin_id, 'earned', 10, '2e1c6948-4572-41fc-9f5b-1b75895d6be8', 'Poin Konten Disetujui: Instagram Reels (1,000 Views)');

    raise notice '✅ Seeded 4 approved submissions (35,900 views, 359 points) for %', v_admin_id;
  end if;
end $$;

-- ==============================================================================
-- END OF MASTER SCRIPT — DATABASE READY FOR PRODUCTION
-- ==============================================================================
