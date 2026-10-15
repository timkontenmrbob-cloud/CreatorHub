-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261015000003_create_video_thumbnails_system.sql
-- Description: Video Thumbnails System for Top Trending Videos Gallery
--              Dedicated public storage bucket 'video-thumbnails',
--              metadata tracking, and admin management.
-- ==============================================================================

-- 1. VIDEO THUMBNAILS TABLE (OPTIONAL / COMPATIBLE CACHE)
create table if not exists public.video_thumbnails (
  submission_id uuid primary key references public.submissions(id) on delete cascade,
  thumbnail_url text not null,
  source text not null default 'manual', -- 'manual' | 'auto'
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. ENABLE ROW LEVEL SECURITY
alter table public.video_thumbnails enable row level security;

-- 3. POLICIES
-- Anyone can view thumbnails for public display
create policy "Allow public read access to video thumbnails"
  on public.video_thumbnails
  for select
  using (true);

-- Only admins can insert or update thumbnails
create policy "Allow admins to manage video thumbnails"
  on public.video_thumbnails
  for all
  to authenticated
  using (
    exists (
      select 1 from public.admin_roles
      where admin_roles.user_id = auth.uid()
        and admin_roles.role in ('admin', 'superadmin')
    )
  );

-- 4. STORAGE BUCKET CONFIGURATION (REFERENCE)
-- Bucket: 'video-thumbnails' (public: true, max 2MB, jpg/png/webp)
-- Stored separately from 'submission-evidence' to protect from 14-day cleanup.
