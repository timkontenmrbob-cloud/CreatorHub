-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261015000001_create_reward_redemption_system.sql
-- Description: Phase 5: Reward Catalog, Atomic Redemptions, Earliest-Expiring 
--              Lot Allocations, Safe Refunds, and Admin Fulfillment Management
-- ==============================================================================

-- 1. REWARDS TABLE
create table if not exists public.rewards (
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

-- Fast lookup indexes
create index if not exists idx_rewards_availability on public.rewards(availability);
create index if not exists idx_rewards_required_points on public.rewards(required_points asc);

-- 2. SEED OFFICIAL 13 MR.BOB REWARDS (IDEMPOTENT UPSERT)
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
  name = excluded.name,
  description = excluded.description,
  required_points = excluded.required_points,
  image_path = excluded.image_path,
  reward_type = excluded.reward_type,
  availability = excluded.availability,
  redemption_terms = excluded.redemption_terms,
  updated_at = now();

-- 3. REDEMPTIONS TABLE
create table if not exists public.redemptions (
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

-- Fast lookup indexes
create index if not exists idx_redemptions_creator on public.redemptions(creator_id);
create index if not exists idx_redemptions_status on public.redemptions(status);
create index if not exists idx_redemptions_requested on public.redemptions(requested_at desc);
create index if not exists idx_redemptions_idempotency on public.redemptions(idempotency_key);

-- 4. REDEMPTION ALLOCATIONS TABLE (Detailed lot consumption audit)
create table if not exists public.redemption_allocations (
  id uuid primary key default gen_random_uuid(),
  redemption_id uuid not null references public.redemptions(id) on delete cascade,
  point_lot_id uuid not null references public.point_lots(id) on delete restrict,
  allocated_points integer not null check (allocated_points > 0),
  original_expiration_date timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_redemption_alloc_redemption on public.redemption_allocations(redemption_id);
create index if not exists idx_redemption_alloc_lot on public.redemption_allocations(point_lot_id);

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.rewards enable row level security;
alter table public.redemptions enable row level security;
alter table public.redemption_allocations enable row level security;

-- Rewards RLS
create policy "rewards_select_public"
on public.rewards
for select
using (true);

create policy "rewards_admin_modify"
on public.rewards
for all
using (public.is_admin(auth.uid()));

-- Redemptions RLS
create policy "redemptions_select_creator"
on public.redemptions
for select
using (creator_id = auth.uid() or public.is_admin(auth.uid()));

create policy "redemptions_insert_creator"
on public.redemptions
for insert
with check (creator_id = auth.uid() or public.is_admin(auth.uid()));

create policy "redemptions_update_admin"
on public.redemptions
for update
using (public.is_admin(auth.uid()));

-- Redemption Allocations RLS
create policy "allocations_select"
on public.redemption_allocations
for select
using (
  public.is_admin(auth.uid()) or
  exists (
    select 1 from public.redemptions r
    where r.id = redemption_id
      and r.creator_id = auth.uid()
  )
);

-- 6. ATOMIC STORED FUNCTION: REDEEM REWARD
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
  v_lot record;
  v_existing_redemption record;
  v_redemption_id uuid;
  v_tx_id uuid;
  v_available_points integer := 0;
  v_remaining_to_deduct integer;
  v_deduct_amount integer;
  v_now timestamptz := now();
begin
  -- 1. Authorization check: caller must be user or admin
  if auth.uid() is not null and auth.uid() != p_creator_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized: Anda hanya dapat menukarkan poin untuk akun Anda sendiri.';
  end if;

  -- 2. Idempotency Check: prevent duplicate redemptions from double-clicks
  if p_idempotency_key is not null then
    select * into v_existing_redemption
    from public.redemptions
    where idempotency_key = p_idempotency_key;

    if found then
      return json_build_object(
        'status', 'already_redeemed',
        'message', 'Penukaran reward ini sudah berhasil diajukan sebelumnya.',
        'redemption_id', v_existing_redemption.id,
        'reward_name', v_existing_redemption.reward_name_snapshot,
        'points_spent', v_existing_redemption.required_points_snapshot
      );
    end if;
  end if;

  -- 3. Lock & Validate Reward
  select * into v_reward
  from public.rewards
  where id = p_reward_id;

  if not found then
    raise exception 'Reward tidak ditemukan dalam katalog resmi.';
  end if;

  if not v_reward.availability then
    raise exception 'Mohon maaf, reward % saat ini sedang tidak tersedia.', v_reward.name;
  end if;

  -- 4. Calculate Authoritative Available Points (Locking valid lots with FOR UPDATE)
  select coalesce(sum(remaining_points), 0) into v_available_points
  from public.point_lots
  where user_id = p_creator_id
    and remaining_points > 0
    and expires_at > v_now;

  if v_available_points < v_reward.required_points then
    raise exception 'Saldo poin tidak mencukupi. Anda memiliki % Poin, dibutuhkan % Poin.',
      v_available_points, v_reward.required_points;
  end if;

  -- 5. Insert Redemption Request
  insert into public.redemptions (
    creator_id,
    reward_id,
    required_points_snapshot,
    reward_name_snapshot,
    status,
    requested_at,
    recipient_name,
    shipping_address,
    contact_whatsapp,
    idempotency_key
  )
  values (
    p_creator_id,
    v_reward.id,
    v_reward.required_points,
    v_reward.name,
    'pending',
    v_now,
    p_recipient_name,
    p_shipping_address,
    p_contact_whatsapp,
    p_idempotency_key
  )
  returning id into v_redemption_id;

  -- 6. Allocate and Deduct Points (Earliest Expiring Lots First)
  v_remaining_to_deduct := v_reward.required_points;

  for v_lot in
    select id, remaining_points, expires_at
    from public.point_lots
    where user_id = p_creator_id
      and remaining_points > 0
      and expires_at > v_now
    order by expires_at asc, id asc
    for update
  loop
    exit when v_remaining_to_deduct <= 0;

    if v_lot.remaining_points <= v_remaining_to_deduct then
      v_deduct_amount := v_lot.remaining_points;
    else
      v_deduct_amount := v_remaining_to_deduct;
    end if;

    -- Update point lot
    update public.point_lots
    set remaining_points = remaining_points - v_deduct_amount,
        updated_at = v_now
    where id = v_lot.id;

    -- Record detailed allocation
    insert into public.redemption_allocations (
      redemption_id,
      point_lot_id,
      allocated_points,
      original_expiration_date
    )
    values (
      v_redemption_id,
      v_lot.id,
      v_deduct_amount,
      v_lot.expires_at
    );

    v_remaining_to_deduct := v_remaining_to_deduct - v_deduct_amount;
  end loop;

  if v_remaining_to_deduct > 0 then
    raise exception 'Gagal menyelesaikan pemotongan poin (alokasi tidak lengkap).';
  end if;

  -- 7. Record Immutable Point Transaction Ledger Entry
  insert into public.point_transactions (
    user_id,
    transaction_type,
    amount,
    reference_id,
    idempotency_key,
    description,
    created_at
  )
  values (
    p_creator_id,
    'redeemed',
    v_reward.required_points,
    v_redemption_id::text,
    p_idempotency_key,
    'Penukaran Hadiah: ' || v_reward.name,
    v_now
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

-- 7. ATOMIC STORED FUNCTION: ADMIN PROCESS REDEMPTION (WITH SAFE REFUND)
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
  v_expired_points_flagged integer := 0;
  v_now timestamptz := now();
  v_admin_id uuid := auth.uid();
begin
  -- 1. Enforce Admin Authorization
  if not public.is_admin(v_admin_id) then
    raise exception 'Unauthorized: Hanya administrator yang berhak memproses permohonan penukaran.';
  end if;

  -- 2. Lock redemption record for update
  select * into v_redemption
  from public.redemptions
  where id = p_redemption_id
  for update;

  if not found then
    raise exception 'Data penukaran tidak ditemukan.';
  end if;

  if v_redemption.status = 'rejected' then
    raise exception 'Penukaran ini sudah pernah ditolak sebelumnya.';
  end if;

  if v_redemption.status = 'completed' and p_action = 'reject' then
    raise exception 'Penukaran yang sudah selesai tidak dapat ditolak.';
  end if;

  -- 3. Execute State Transitions
  if p_action = 'processing' then
    update public.redemptions
    set status = 'processing',
        processed_by = v_admin_id,
        processed_at = v_now,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes),
        updated_at = v_now
    where id = p_redemption_id;

    return json_build_object(
      'status', 'success',
      'action', 'processing',
      'message', 'Status penukaran diubah menjadi Sedang Diproses.'
    );

  elsif p_action = 'ready' then
    update public.redemptions
    set status = 'ready',
        processed_by = v_admin_id,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes),
        updated_at = v_now
    where id = p_redemption_id;

    return json_build_object(
      'status', 'success',
      'action', 'ready',
      'message', 'Status penukaran diubah menjadi Siap Digunakan / Diambil.'
    );

  elsif p_action = 'completed' then
    update public.redemptions
    set status = 'completed',
        processed_by = v_admin_id,
        processed_at = v_now,
        fulfillment_notes = coalesce(p_fulfillment_notes, fulfillment_notes),
        updated_at = v_now
    where id = p_redemption_id;

    return json_build_object(
      'status', 'success',
      'action', 'completed',
      'message', 'Penukaran reward berhasil diselesaikan.'
    );

  elsif p_action = 'reject' then
    if p_rejection_reason is null or trim(p_rejection_reason) = '' then
      raise exception 'Alasan penolakan wajib diisi.';
    end if;

    -- Strict Idempotency: verify this redemption has not already been refunded
    if exists (
      select 1 from public.point_transactions
      where reference_id = p_redemption_id::text
        and transaction_type = 'adjustment'
    ) then
      raise exception 'Poin untuk penukaran ini sudah pernah dikembalikan sebelumnya.';
    end if;

    -- Reversal Policy: inspect allocations and restore points
    for v_alloc in
      select * from public.redemption_allocations
      where redemption_id = p_redemption_id
    loop
      if v_alloc.original_expiration_date > v_now then
        -- Point lot is still within original 6-month validity: safely restore balance
        update public.point_lots
        set remaining_points = remaining_points + v_alloc.allocated_points,
            updated_at = v_now
        where id = v_alloc.point_lot_id;

        v_restored_total := v_restored_total + v_alloc.allocated_points;
      else
        -- Point lot has already expired: flag business policy decision
        v_expired_points_flagged := v_expired_points_flagged + v_alloc.allocated_points;
      end if;
    end loop;

    -- Record transaction for restored amount if > 0
    if v_restored_total > 0 then
      insert into public.point_transactions (
        user_id,
        transaction_type,
        amount,
        reference_id,
        idempotency_key,
        description,
        created_at
      )
      values (
        v_redemption.creator_id,
        'adjustment',
        v_restored_total,
        p_redemption_id::text,
        'refund_redemption_' || p_redemption_id::text,
        'Pengembalian Poin Penukaran Dibatalkan: ' || v_redemption.reward_name_snapshot,
        v_now
      );
    end if;

    -- Update redemption status to rejected
    update public.redemptions
    set status = 'rejected',
        processed_by = v_admin_id,
        processed_at = v_now,
        rejection_reason = p_rejection_reason,
        fulfillment_notes = case
          when v_expired_points_flagged > 0 then
            coalesce(fulfillment_notes || E'\n', '') ||
            format('[Peringatan Kebijakan: Sebanyak %s poin tidak dapat dikembalikan ke saldo aktif karena telah melewati tanggal kedaluwarsa aslinya.]', v_expired_points_flagged)
          else fulfillment_notes
        end,
        updated_at = v_now
    where id = p_redemption_id;

    return json_build_object(
      'status', 'success',
      'action', 'rejected',
      'restored_points', v_restored_total,
      'expired_points_flagged', v_expired_points_flagged,
      'message', 'Penukaran ditolak dan poin valid telah dikembalikan ke akun kreator.'
    );

  else
    raise exception 'Aksi tidak valid: %', p_action;
  end if;
end;
$$;
