-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261014000002_create_point_wallet_system.sql
-- Description: Point Lots, Immutable Transactions Ledger, Expiration (6 Months),
--              Order-based Consumption, RLS, and Security Definer RPC Functions
-- ==============================================================================

-- 1. POINT LOTS TABLE (Tracks discrete batches with 6-month calendar expiration)
create table if not exists public.point_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'views' check (source_type in ('views', 'bonus', 'adjustment', 'challenge')),
  source_id text, -- e.g. submission id or admin batch ref
  original_points integer not null check (original_points > 0),
  remaining_points integer not null check (remaining_points >= 0 and remaining_points <= original_points),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookup indexes for balance aggregation and order-based consumption
create index if not exists idx_point_lots_user_expires on public.point_lots(user_id, expires_at asc, remaining_points);
create index if not exists idx_point_lots_active on public.point_lots(user_id, remaining_points) where remaining_points > 0;
create index if not exists idx_point_lots_source on public.point_lots(source_id);

-- Updated_at trigger for point_lots
create or replace trigger tr_point_lots_updated_at
before update on public.point_lots
for each row
execute function public.handle_updated_at();

-- 2. POINT TRANSACTIONS TABLE (Immutable ledger of all point movements)
create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('earned', 'redeemed', 'expired', 'reversed', 'bonus', 'adjustment')),
  amount integer not null check (amount > 0),
  related_point_lot_id uuid references public.point_lots(id) on delete set null,
  reference_id text, -- e.g. submission id, reward claim id
  idempotency_key text unique,
  description text not null,
  created_at timestamptz not null default now()
);

-- Ledger indexes for audit trail & idempotency
create index if not exists idx_point_transactions_user on public.point_transactions(user_id, created_at desc);
create index if not exists idx_point_transactions_lot on public.point_transactions(related_point_lot_id);
create index if not exists idx_point_transactions_ref on public.point_transactions(reference_id);

-- 3. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.point_lots enable row level security;
alter table public.point_transactions enable row level security;

-- Point Lots: Creators can view only their own lots, Admins can view all
create policy "point_lots_select_own_or_admin"
on public.point_lots
for select
using (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

-- Point Lots: Insert/Update/Delete only permitted by admins (or security definer functions)
create policy "point_lots_admin_insert"
on public.point_lots
for insert
with check (public.is_admin(auth.uid()));

create policy "point_lots_admin_update"
on public.point_lots
for update
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "point_lots_admin_delete"
on public.point_lots
for delete
using (public.is_admin(auth.uid()));

-- Point Transactions: Creators can view only their own transactions, Admins can view all
create policy "point_transactions_select_own_or_admin"
on public.point_transactions
for select
using (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

-- Point Transactions: Direct inserts only by admins (or security definer functions)
create policy "point_transactions_admin_insert"
on public.point_transactions
for insert
with check (public.is_admin(auth.uid()));

-- 4. FUNCTION: Calculate Wallet Summary for a User
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
  -- Access authorization check
  if auth.uid() <> target_user_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized to access wallet summary';
  end if;

  -- Active available points (unexpired with remaining balance)
  select coalesce(sum(remaining_points), 0)
  into v_available
  from public.point_lots
  where user_id = target_user_id
    and remaining_points > 0
    and expires_at > now();

  -- Total redeemed points from ledger
  select coalesce(sum(amount), 0)
  into v_redeemed
  from public.point_transactions
  where user_id = target_user_id
    and transaction_type = 'redeemed';

  -- Total expired points from ledger
  select coalesce(sum(amount), 0)
  into v_expired
  from public.point_transactions
  where user_id = target_user_id
    and transaction_type = 'expired';

  -- Total points ever earned/issued
  select coalesce(sum(original_points), 0)
  into v_total_earned
  from public.point_lots
  where user_id = target_user_id;

  -- Points expiring in next 30 days
  select coalesce(sum(remaining_points), 0)
  into v_expiring_soon
  from public.point_lots
  where user_id = target_user_id
    and remaining_points > 0
    and expires_at > now()
    and expires_at <= (now() + interval '30 days');

  -- Nearest expiration date
  select min(expires_at)
  into v_nearest_expiration
  from public.point_lots
  where user_id = target_user_id
    and remaining_points > 0
    and expires_at > now();

  -- Pending points placeholder (default 0, will connect to pending submissions in Phase 3)
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

-- 5. FUNCTION: Issue a New Point Lot (Admin or Backend Service)
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
  -- Security check: only admins can issue points
  if not public.is_admin(auth.uid()) then
    raise exception 'Hanya admin yang berhak menerbitkan poin.';
  end if;

  if p_points <= 0 then
    raise exception 'Jumlah poin harus lebih besar dari 0.';
  end if;

  -- Idempotency check
  if p_idempotency_key is not null then
    select id into v_existing_tx
    from public.point_transactions
    where idempotency_key = p_idempotency_key;

    if v_existing_tx is not null then
      return json_build_object(
        'status', 'already_processed',
        'transaction_id', v_existing_tx
      );
    end if;
  end if;

  -- Determine transaction type based on source
  if p_source_type = 'bonus' then
    v_tx_type := 'bonus';
  elsif p_source_type = 'adjustment' then
    v_tx_type := 'adjustment';
  else
    v_tx_type := 'earned';
  end if;

  -- Insert new point lot with 6 calendar months expiration
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
    target_user_id,
    p_source_type,
    p_source_id,
    p_points,
    p_points,
    now(),
    (now() + interval '6 months')
  )
  returning id into v_lot_id;

  -- Record transaction in immutable ledger
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
    target_user_id,
    v_tx_type,
    p_points,
    v_lot_id,
    p_source_id,
    p_idempotency_key,
    p_description
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

-- 6. FUNCTION: Consume Points Ordered by Earliest Expiration Date
create or replace function public.redeem_points_ordered(
  target_user_id uuid,
  p_points integer,
  p_reference_id text default null,
  p_description text default 'Penukaran Reward',
  p_idempotency_key text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_tx uuid;
  v_available_total integer;
  v_needed integer;
  v_lot record;
  v_take integer;
  v_redeemed_tx_ids uuid[] := array[]::uuid[];
begin
  -- Authorization check
  if auth.uid() <> target_user_id and not public.is_admin(auth.uid()) then
    raise exception 'Unauthorized to redeem points';
  end if;

  if p_points <= 0 then
    raise exception 'Jumlah poin penukaran harus lebih besar dari 0.';
  end if;

  -- Idempotency check
  if p_idempotency_key is not null then
    select id into v_existing_tx
    from public.point_transactions
    where idempotency_key = p_idempotency_key;

    if v_existing_tx is not null then
      return json_build_object(
        'status', 'already_processed',
        'transaction_id', v_existing_tx
      );
    end if;
  end if;

  -- Lock active point lots for this user to prevent concurrent race conditions
  select coalesce(sum(remaining_points), 0)
  into v_available_total
  from public.point_lots
  where user_id = target_user_id
    and remaining_points > 0
    and expires_at > now();

  if v_available_total < p_points then
    raise exception 'Saldo poin tidak mencukupi untuk penukaran ini. Saldo: %, Diminta: %', v_available_total, p_points;
  end if;

  v_needed := p_points;

  -- Iterate through active lots ordered by earliest expiration date (First Expired First Out)
  for v_lot in
    select id, remaining_points, expires_at
    from public.point_lots
    where user_id = target_user_id
      and remaining_points > 0
      and expires_at > now()
    order by expires_at asc, created_at asc
    for update
  loop
    exit when v_needed <= 0;

    v_take := least(v_lot.remaining_points, v_needed);

    -- Deduct from lot
    update public.point_lots
    set remaining_points = remaining_points - v_take,
        updated_at = now()
    where id = v_lot.id;

    -- Record transaction in immutable ledger
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
      target_user_id,
      'redeemed',
      v_take,
      v_lot.id,
      p_reference_id,
      case when v_needed = p_points then p_idempotency_key else null end,
      p_description
    )
    returning id into v_existing_tx;

    v_redeemed_tx_ids := array_append(v_redeemed_tx_ids, v_existing_tx);
    v_needed := v_needed - v_take;
  end loop;

  return json_build_object(
    'status', 'success',
    'redeemed_points', p_points,
    'transaction_ids', v_redeemed_tx_ids
  );
end;
$$;

-- 7. FUNCTION: Expire Overdue Point Lots (Automated Maintenance)
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
    where remaining_points > 0
      and expires_at <= now()
    for update
  loop
    -- Deduct remaining points to 0
    update public.point_lots
    set remaining_points = 0,
        updated_at = now()
    where id = v_lot.id;

    -- Record expired transaction in ledger
    insert into public.point_transactions (
      user_id,
      transaction_type,
      amount,
      related_point_lot_id,
      description
    )
    values (
      v_lot.user_id,
      'expired',
      v_lot.remaining_points,
      v_lot.id,
      'Poin kedaluwarsa (masa aktif 6 bulan habis)'
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
