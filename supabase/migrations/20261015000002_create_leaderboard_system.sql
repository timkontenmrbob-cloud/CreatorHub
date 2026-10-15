-- ==============================================================================
-- MR.BOB CREATOR HUB — SUPABASE DATABASE MIGRATION
-- Migration: 20261015000002_create_leaderboard_system.sql
-- Description: Leaderboard System (Top 5 Creators & Top Trending Videos)
--              Strict 3-month rolling window in Asia/Jakarta (WIB),
--              Privacy-safe public RPCs, deterministic ranking & tie-breakers.
-- ==============================================================================

-- 1. INDEXES FOR HIGH-EFFICIENCY AGGREGATION & FILTERING
create index if not exists idx_submissions_leaderboard_perf
on public.submissions (status, posting_date, verified_views desc, approved_points desc)
where status = 'approved';

create index if not exists idx_submissions_user_approved
on public.submissions (user_id, status, posting_date)
where status = 'approved';

-- 2. PUBLIC RPC: GET TOP CREATORS LEADERBOARD
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
  -- Calculate rolling 3-month window in Asia/Jakarta if not provided
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
      and s.approved_points is not null
      and s.approved_points > 0
    group by s.user_id, p.full_name, p.tiktok_username, p.instagram_username, p.avatar_url
  ),
  ranked_creators as (
    select
      row_number() over (
        order by
          total_points desc,
          total_views desc,
          approved_videos desc,
          creator_name asc,
          user_id asc
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
        'rank', rank,
        'creatorId', creator_id,
        'name', name,
        'handle', handle,
        'avatar', avatar,
        'totalPoints', total_points,
        'totalViews', total_views,
        'approvedVideos', approved_videos
      )
      order by rank asc
    ),
    '[]'::json
  ) into v_result
  from (
    select * from ranked_creators
    order by rank asc
    limit greatest(1, coalesce(p_limit, 5))
  ) top_n;

  return v_result;
end;
$$;

-- 3. PUBLIC RPC: GET TOP TRENDING VIDEOS LEADERBOARD
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
  -- Calculate rolling 3-month window in Asia/Jakarta if not provided
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
      and s.approved_points is not null
      and s.approved_points > 0
  ),
  ranked_videos as (
    select
      row_number() over (
        order by
          views desc,
          points desc,
          submitted_at desc,
          id asc
      ) as rank,
      id,
      user_id as creator_id,
      creator_name,
      creator_handle,
      creator_avatar,
      display_platform as platform,
      video_url,
      generated_title as title,
      views,
      points,
      posting_date
    from eligible_videos
  )
  select coalesce(
    json_agg(
      json_build_object(
        'rank', rank,
        'id', id,
        'creatorId', creator_id,
        'creatorName', creator_name,
        'creatorHandle', creator_handle,
        'creatorAvatar', creator_avatar,
        'platform', platform,
        'videoUrl', video_url,
        'title', title,
        'views', views,
        'points', points,
        'postingDate', posting_date
      )
      order by rank asc
    ),
    '[]'::json
  ) into v_result
  from (
    select * from ranked_videos
    order by rank asc
    limit greatest(1, coalesce(p_limit, 10))
  ) top_v;

  return v_result;
end;
$$;

-- 4. AUTHENTICATED RPC: GET CREATOR RANK IN CURRENT PERIOD
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
  v_result json;
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
    where s.status = 'approved'
      and s.posting_date >= v_start_date
      and s.posting_date <= v_end_date
      and s.verified_views is not null
      and s.verified_views > 0
      and s.approved_points is not null
      and s.approved_points > 0
    group by s.user_id
  ),
  ranked_creators as (
    select
      row_number() over (
        order by
          total_points desc,
          total_views desc,
          approved_videos desc,
          user_id asc
      ) as rank,
      user_id,
      total_points,
      total_views,
      approved_videos
    from creator_aggregates
  )
  select count(*) into v_total_creators from ranked_creators;

  select * into v_user_row
  from ranked_creators
  where user_id = p_user_id;

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

-- 5. GRANTS FOR ACCESS CONTROL
grant execute on function public.get_leaderboard_creators(timestamptz, timestamptz, integer) to anon, authenticated, service_role;
grant execute on function public.get_leaderboard_videos(timestamptz, timestamptz, integer) to anon, authenticated, service_role;
grant execute on function public.get_creator_rank(uuid, timestamptz, timestamptz) to anon, authenticated, service_role;
