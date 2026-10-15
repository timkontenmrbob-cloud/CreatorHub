-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261014000005_create_verification_and_audit_system.sql
-- Description: Phase 4: Admin Verification, Atomic Point Issuance,
--              Audit Trail Ledger, Evidence Retention & Deletion Lifecycle
-- ==============================================================================

-- 1. SUBMISSION AUDIT LOGS TABLE (Immutable audit trail for all admin decisions)
create table if not exists public.submission_audit_logs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  admin_id uuid not null references auth.users(id) on delete set null,
  previous_status text not null,
  new_status text not null,
  verified_views bigint,
  approved_points integer,
  decision_reason text,
  admin_notes text,
  created_at timestamptz not null default now()
);

-- Fast lookup indexes
create index if not exists idx_audit_logs_submission on public.submission_audit_logs(submission_id);
create index if not exists idx_audit_logs_admin on public.submission_audit_logs(admin_id);
create index if not exists idx_audit_logs_created on public.submission_audit_logs(created_at desc);

-- 2. ROW LEVEL SECURITY (RLS) FOR AUDIT LOGS
alter table public.submission_audit_logs enable row level security;

-- Admins can view all audit logs
create policy "audit_logs_admin_select"
on public.submission_audit_logs
for select
using (public.is_admin(auth.uid()));

-- Creators can view audit logs for their own submissions
create policy "audit_logs_creator_select_own"
on public.submission_audit_logs
for select
using (
  exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and s.user_id = auth.uid()
  )
);

-- Only admins or security definer RPC functions can insert audit logs
create policy "audit_logs_admin_insert"
on public.submission_audit_logs
for insert
with check (public.is_admin(auth.uid()));

-- NO client update or delete permitted (immutable audit trail)

-- 3. FUNCTION: Atomic Submission Approval and Point Issuance
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
  v_deadline_wib timestamptz;
begin
  -- 1. Authorization: strictly enforce admin role
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Hanya administrator yang berhak memverifikasi pengajuan.';
  end if;

  -- 2. Lock submission record for update to prevent race conditions
  select * into v_sub
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Pengajuan video tidak ditemukan.';
  end if;

  -- 3. Idempotency & Duplicate Approval Guard
  if v_sub.status = 'approved' then
    return json_build_object(
      'status', 'already_approved',
      'message', 'Pengajuan ini sudah pernah disetujui sebelumnya.',
      'approved_points', v_sub.approved_points,
      'verified_views', v_sub.verified_views
    );
  end if;

  v_idempotency_key := 'submission_approval_' || p_submission_id::text;
  select id into v_existing_tx
  from public.point_transactions
  where idempotency_key = v_idempotency_key;

  if v_existing_tx is not null then
    return json_build_object(
      'status', 'already_processed',
      'message', 'Poin untuk pengajuan ini sudah diterbitkan sebelumnya.',
      'transaction_id', v_existing_tx
    );
  end if;

  -- 4. Validate verified views
  if p_verified_views < 0 then
    raise exception 'Jumlah verified views tidak boleh negatif.';
  end if;

  if p_verified_views > v_sub.claimed_views then
    raise exception 'Verified views tidak boleh melebihi claimed views saat submission.';
  end if;

  -- 5. Validate 30-day submission window against original publication date
  -- Day 1 = posting_date, Day 30 ends at posting_date + 29 days 23:59:59 WIB
  v_deadline_wib := (v_sub.posting_date + interval '29 days')::date + time '23:59:59';
  if v_sub.submitted_at > v_deadline_wib then
    raise exception 'Pengajuan video melebihi batas 30 hari kalender sejak publikasi.';
  end if;

  -- 6. Calculate approved points: 1,000 views = 10 Poin (i.e. floor(views / 100))
  v_points := floor(p_verified_views / 100);

  -- 7. Create Point Lot in existing Phase 2 Point Engine (6 Calendar Months Expiry)
  if v_points > 0 then
    insert into public.point_lots (
      user_id,
      source_type,
      source_id,
      original_points,
      remaining_points,
      issued_at,
      expires_at
    )
    values (
      v_sub.user_id,
      'views',
      p_submission_id::text,
      v_points,
      v_points,
      now(),
      now() + interval '6 months'
    )
    returning id into v_lot_id;

    -- 8. Record immutable point transaction
    insert into public.point_transactions (
      user_id,
      transaction_type,
      amount,
      related_point_lot_id,
      reference_id,
      idempotency_key,
      description
    )
    values (
      v_sub.user_id,
      'earned',
      v_points,
      v_lot_id,
      p_submission_id::text,
      v_idempotency_key,
      'Poin Konten Disetujui: ' || initcap(v_sub.platform) || ' (' || to_char(p_verified_views, 'FM999,999,999') || ' Views)'
    )
    returning id into v_tx_id;
  end if;

  -- 9. Update submission status to 'approved'
  update public.submissions
  set status = 'approved',
      verified_views = p_verified_views,
      approved_points = v_points,
      admin_notes = p_admin_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_submission_id;

  -- 10. Schedule screenshot evidence for deletion (14 calendar days retention policy)
  update public.submission_evidence
  set retention_status = 'scheduled_for_deletion',
      scheduled_deletion_at = now() + interval '14 days'
  where submission_id = p_submission_id
    and retention_status <> 'disputed';

  -- 11. Record in permanent audit log
  insert into public.submission_audit_logs (
    submission_id,
    admin_id,
    previous_status,
    new_status,
    verified_views,
    approved_points,
    decision_reason,
    admin_notes
  )
  values (
    p_submission_id,
    auth.uid(),
    v_sub.status,
    'approved',
    p_verified_views,
    v_points,
    'Disetujui oleh admin',
    p_admin_notes
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

-- 4. FUNCTION: Reject Submission with Reason
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
  -- 1. Authorization: strictly enforce admin role
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Hanya administrator yang berhak menolak pengajuan.';
  end if;

  if coalesce(trim(p_rejection_reason), '') = '' then
    raise exception 'Alasan penolakan wajib diisi.';
  end if;

  -- 2. Lock submission record
  select * into v_sub
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Pengajuan video tidak ditemukan.';
  end if;

  if v_sub.status = 'approved' then
    raise exception 'Pengajuan yang sudah disetujui tidak dapat ditolak.';
  end if;

  -- 3. Update submission status to 'rejected'
  update public.submissions
  set status = 'rejected',
      admin_notes = p_rejection_reason || coalesce(E'\n\nCatatan Tambahan: ' || p_admin_notes, ''),
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_submission_id;

  -- 4. Schedule screenshot evidence for deletion (14 calendar days retention policy)
  update public.submission_evidence
  set retention_status = 'scheduled_for_deletion',
      scheduled_deletion_at = now() + interval '14 days'
  where submission_id = p_submission_id
    and retention_status <> 'disputed';

  -- 5. Record in permanent audit log
  insert into public.submission_audit_logs (
    submission_id,
    admin_id,
    previous_status,
    new_status,
    decision_reason,
    admin_notes
  )
  values (
    p_submission_id,
    auth.uid(),
    v_sub.status,
    'rejected',
    p_rejection_reason,
    p_admin_notes
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

-- 5. FUNCTION: Request Additional Evidence
create or replace function public.request_additional_evidence(
  p_submission_id uuid,
  p_request_notes text
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
  -- 1. Authorization: strictly enforce admin role
  if not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Hanya administrator yang berhak meminta bukti tambahan.';
  end if;

  if coalesce(trim(p_request_notes), '') = '' then
    raise exception 'Instruksi bukti tambahan wajib diisi.';
  end if;

  -- 2. Lock submission record
  select * into v_sub
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'Pengajuan video tidak ditemukan.';
  end if;

  if v_sub.status = 'approved' then
    raise exception 'Pengajuan yang sudah disetujui tidak dapat diminta bukti tambahan.';
  end if;

  -- 3. Update submission status to 'requires_revision'
  update public.submissions
  set status = 'requires_revision',
      admin_notes = p_request_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      updated_at = now()
  where id = p_submission_id;

  -- Evidence retention remains 'active' (not scheduled for deletion while unresolved)
  update public.submission_evidence
  set retention_status = 'active',
      scheduled_deletion_at = null
  where submission_id = p_submission_id
    and retention_status = 'scheduled_for_deletion';

  -- 4. Record in permanent audit log
  insert into public.submission_audit_logs (
    submission_id,
    admin_id,
    previous_status,
    new_status,
    decision_reason,
    admin_notes
  )
  values (
    p_submission_id,
    auth.uid(),
    v_sub.status,
    'requires_revision',
    p_request_notes,
    p_request_notes
  )
  returning id into v_audit_id;

  return json_build_object(
    'status', 'success',
    'submission_id', p_submission_id,
    'request_notes', p_request_notes,
    'audit_id', v_audit_id
  );
end;
$$;

-- 6. FUNCTION: Get Expired Evidence for Automated Retention Cleanup
create or replace function public.get_expired_evidence_for_cleanup(
  p_limit integer default 50
)
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
