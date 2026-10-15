-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261014000001_add_profile_completed.sql
-- Description: Add profile_completed boolean to public.profiles and update handle_new_user trigger
-- ==============================================================================

-- 1. Add profile_completed column with default false
alter table public.profiles
add column if not exists profile_completed boolean not null default false;

-- 2. Index for fast status checking
create index if not exists idx_profiles_completed on public.profiles(profile_completed);

-- 3. Update handle_new_user trigger to preserve profile status and handle Google OAuth metadata
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
