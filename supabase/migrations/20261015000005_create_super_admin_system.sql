-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261015000005_create_super_admin_system.sql
-- Description: Super Admin role authorization, Admin Management, and Audit Logs
-- ==============================================================================

-- 1. Ensure constraint supports both superadmin and super_admin
do $$
begin
  alter table public.admin_roles drop constraint if exists admin_roles_role_check;
  alter table public.admin_roles add constraint admin_roles_role_check
    check (role in ('admin', 'superadmin', 'super_admin'));
exception
  when others then null;
end $$;

-- 2. HELPER FUNCTION: Check if a user has Super Admin privileges
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

-- 3. AUDIT LOGS FOR ADMINISTRATIVE ROLE CHANGES
create table if not exists public.admin_role_audit_logs (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  target_email text not null,
  action text not null check (action in ('assign_admin', 'revoke_admin')),
  performed_by uuid not null references auth.users(id) on delete cascade,
  performed_by_email text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_role_audit_target on public.admin_role_audit_logs(target_user_id);
create index if not exists idx_admin_role_audit_created on public.admin_role_audit_logs(created_at desc);

-- 4. ROW LEVEL SECURITY
alter table public.admin_role_audit_logs enable row level security;

-- Only Super Admins can view audit logs
drop policy if exists "Super admins can view admin role audit logs" on public.admin_role_audit_logs;
create policy "Super admins can view admin role audit logs"
  on public.admin_role_audit_logs
  for select
  using (public.is_super_admin(auth.uid()));

-- Only Super Admins can insert audit logs
drop policy if exists "Super admins can insert admin role audit logs" on public.admin_role_audit_logs;
create policy "Super admins can insert admin role audit logs"
  on public.admin_role_audit_logs
  for insert
  with check (public.is_super_admin(auth.uid()));

-- Restrict direct admin_roles table manipulation to super admins
alter table public.admin_roles enable row level security;

drop policy if exists "Anyone can read admin roles for auth check" on public.admin_roles;
create policy "Anyone can read admin roles for auth check"
  on public.admin_roles
  for select
  using (true);

drop policy if exists "Only super admins can modify admin roles" on public.admin_roles;
create policy "Only super admins can modify admin roles"
  on public.admin_roles
  for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));
