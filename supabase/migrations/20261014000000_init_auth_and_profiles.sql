-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261014000000_init_auth_and_profiles.sql
-- Description: Core authentication, profiles, admin roles, RLS & storage bucket
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. PROFILES TABLE
create table if not exists public.profiles (
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

-- Indexes for quick lookups
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_tiktok on public.profiles(tiktok_username);
create index if not exists idx_profiles_instagram on public.profiles(instagram_username);
create index if not exists idx_profiles_completed on public.profiles(profile_completed);

-- 3. ADMIN ROLES TABLE (Protected from direct creator modifications)
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_roles_user on public.admin_roles(user_id);

-- 4. HELPER FUNCTION: Check if a user has admin privileges
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
    and role in ('admin', 'superadmin')
  );
$$;

-- 5. FUNCTION: Automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger tr_profiles_updated_at
before update on public.profiles
for each row
execute function public.handle_updated_at();

-- 6. FUNCTION & TRIGGER: Auto-create profile on new user registration (auth.users)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
    coalesce((new.raw_user_meta_data->>'profile_completed')::boolean, false)
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    email = excluded.email,
    updated_at = now();

  return new;
end;
$$;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

-- 7. ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.admin_roles enable row level security;

-- PROFILES POLICIES
-- Policy: Users can view their own profile, or admins can view all profiles
create policy "profiles_select_own_or_admin"
on public.profiles
for select
using (
  auth.uid() = id or public.is_admin(auth.uid())
);

-- Policy: Users can update their own permitted profile fields
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- Policy: User profile insertion (typically handled by trigger, but allow self-insert fallback)
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

-- ADMIN ROLES POLICIES
-- Policy: Only allow users to check their own admin status, or admins can view all
create policy "admin_roles_select_own_or_admin"
on public.admin_roles
for select
using (
  auth.uid() = user_id or public.is_admin(auth.uid())
);

-- Note: No client insert/update/delete policies are created for admin_roles.
-- Only database superusers and service_role can grant/revoke admin privileges.

-- 8. STORAGE: submission-evidence private bucket configuration
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submission-evidence',
  'submission-evidence',
  false,
  5242880, -- 5 MB in bytes
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Storage RLS policies for submission-evidence
create policy "evidence_insert_own_folder"
on storage.objects
for insert
with check (
  bucket_id = 'submission-evidence'
  and auth.role() = 'authenticated'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "evidence_select_own_or_admin"
on storage.objects
for select
using (
  bucket_id = 'submission-evidence'
  and (
    (auth.role() = 'authenticated' and (storage.foldername(name))[1] = auth.uid()::text)
    or public.is_admin(auth.uid())
  )
);
