-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261015000004_create_quarterly_analytics_system.sql
-- Description: Phase 7 — Quarterly UGC Analytics, Cost Tracking & Snapshots
-- ==============================================================================

-- 1. ADD CONTENT CATEGORY TO SUBMISSIONS
alter table public.submissions
  add column if not exists content_category text;

comment on column public.submissions.content_category is 
  'Content format: Daily Life, Review Kelas, Educational, POV, Challenge, Testimonial, Other';

-- 2. CREATE CAMPAIGN COSTS TABLE
create table if not exists public.campaign_costs (
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

-- Index for fast quarterly cost filtering
create index if not exists idx_campaign_costs_year_quarter 
  on public.campaign_costs (year, quarter);

-- 3. CREATE QUARTERLY SNAPSHOTS TABLE
create table if not exists public.quarterly_snapshots (
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

-- Index for querying snapshots
create index if not exists idx_quarterly_snapshots_lookup 
  on public.quarterly_snapshots (year, quarter, version desc);

-- 4. ENABLE ROW LEVEL SECURITY
alter table public.campaign_costs enable row level security;
alter table public.quarterly_snapshots enable row level security;

-- 5. ADMIN-ONLY POLICIES FOR CAMPAIGN COSTS
create policy "Allow admins full access to campaign costs"
  on public.campaign_costs
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role in ('admin', 'superadmin')
    )
  );

-- 6. ADMIN-ONLY POLICIES FOR QUARTERLY SNAPSHOTS
create policy "Allow admins full access to quarterly snapshots"
  on public.quarterly_snapshots
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role in ('admin', 'superadmin')
    )
  );
