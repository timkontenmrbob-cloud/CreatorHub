import { createClient } from "./client";
import {
  LeaderboardCreator,
  LeaderboardVideo,
  LeaderboardPeriod,
  UserRankInfo,
} from "../types/leaderboard";
import { fetchThumbnailsMap } from "./thumbnails";

/**
 * Calculates the exact 3-calendar-month window in Asia/Jakarta (WIB) time.
 * Covers 3 full calendar months ending on the last day of the current month.
 * Examples:
 * - Oct 2026: "Periode: 1 Agustus – 31 Oktober 2026" (Start: 2026-08-01, End: 2026-10-31)
 * - Nov 2026: "Periode: 1 September – 30 November 2026" (Start: 2026-09-01, End: 2026-11-30)
 * - Jan 2027: "Periode: 1 November 2026 – 31 Januari 2027" (Start: 2026-11-01, End: 2027-01-31)
 * - Feb leap year (2028: 29 days) & non-leap year (2027: 28 days) safe.
 */
export function getCalendarThreeMonthsPeriod(targetDate?: Date): LeaderboardPeriod {
  const ref = targetDate ? new Date(targetDate) : new Date();

  // Extract year, month, day in Asia/Jakarta timezone (YYYY-MM-DD format)
  const wibParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ref).split("-");

  const year = parseInt(wibParts[0], 10);
  const month = parseInt(wibParts[1], 10); // 1-12
  const day = parseInt(wibParts[2], 10);

  // 3 calendar months ending at current month:
  // e.g. Oct (10) -> Aug (8), Sep (9), Oct (10)
  let startYear = year;
  let startMonth = month - 2;
  if (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  const endYear = year;
  const endMonth = month;
  // Day 0 of next month in UTC gives last day of endMonth (28, 29, 30, 31)
  const lastDayOfMonth = new Date(Date.UTC(endYear, endMonth, 0)).getUTCDate();

  const pad = (n: number) => n.toString().padStart(2, "0");
  const startDateStr = `${startYear}-${pad(startMonth)}-01`;
  const endDateStr = `${endYear}-${pad(endMonth)}-${pad(lastDayOfMonth)}`;
  const effectiveCutoffStr = `${year}-${pad(month)}-${pad(day)}`;

  const startDate = new Date(`${startDateStr}T00:00:00+07:00`);
  const endDate = new Date(`${endDateStr}T23:59:59.999+07:00`);

  const MONTH_NAMES_ID = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const startMonthName = MONTH_NAMES_ID[startMonth - 1];
  const endMonthName = MONTH_NAMES_ID[endMonth - 1];

  const label =
    startYear === endYear
      ? `Periode: 1 ${startMonthName} – ${lastDayOfMonth} ${endMonthName} ${endYear}`
      : `Periode: 1 ${startMonthName} ${startYear} – ${lastDayOfMonth} ${endMonthName} ${endYear}`;

  return {
    startDate,
    endDate,
    startDateIso: startDate.toISOString(),
    endDateIso: endDate.toISOString(),
    startDateStr,
    endDateStr,
    effectiveCutoffStr,
    label,
  };
}

/**
 * Backward compatibility alias for getCalendarThreeMonthsPeriod.
 */
export function getRollingThreeMonthsPeriod(targetDate?: Date): LeaderboardPeriod {
  return getCalendarThreeMonthsPeriod(targetDate);
}

/**
 * Fetch Top Creators for the leaderboard.
 * Ranks primarily by total points earned from approved videos in the selected 3-month window.
 * Tie-breakers: verified views -> approved video count -> deterministic ID.
 */
export async function fetchLeaderboardCreators(
  period?: LeaderboardPeriod,
  limit: number = 5
): Promise<LeaderboardCreator[]> {
  const supabase = createClient();
  const currentPeriod =
    typeof period === "object" && period !== null && "startDate" in period
      ? period
      : getRollingThreeMonthsPeriod();

  // 1. Try public RPC first
  try {
    const { data, error } = await supabase.rpc("get_leaderboard_creators", {
      p_start_date: currentPeriod.startDate.toISOString(),
      p_end_date: currentPeriod.endDate.toISOString(),
      p_limit: limit,
    });

    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((c, idx) => ({
          rank: c.rank || idx + 1,
          creatorId: c.creatorId,
          name: c.name,
          handle: c.handle || null,
          avatar: c.avatar || null,
          totalPoints: Number(c.totalPoints || 0),
          totalViews: Number(c.totalViews || 0),
          approvedVideos: Number(c.approvedVideos || 0),
          highlight: (c.rank || idx + 1) === 1 ? "Top Creator" : null,
        }));
      }
      return [];
    }
  } catch (rpcErr) {
    console.warn("RPC get_leaderboard_creators fallback to client aggregation:", rpcErr);
  }

  const startStr = currentPeriod.startDateStr || currentPeriod.startDate.toISOString().slice(0, 10);
  const endStr = currentPeriod.endDateStr || currentPeriod.endDate.toISOString().slice(0, 10);

  // 2. Browser API Route fallback
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(
        `/api/leaderboard?type=creators&startDate=${startStr}&endDate=${endStr}&limit=${limit}`
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Continue to direct query fallback
    }
  }

  // 3. Direct query fallback

  try {
    const { data: submissions, error: subErr } = await supabase
      .from("submissions")
      .select("id, user_id, verified_views, approved_points, posting_date, status")
      .eq("status", "approved")
      .gte("posting_date", startStr)
      .lte("posting_date", endStr)
      .gt("verified_views", 0)
      .gt("approved_points", 0);

    if (subErr || !submissions || submissions.length === 0) {
      return [];
    }

    type ProfileData = {
      full_name?: string;
      tiktok_username?: string | null;
      instagram_username?: string | null;
      avatar_url?: string | null;
    };

    const userIds = Array.from(new Set(submissions.map((s) => s.user_id)));
    const profileMap = new Map<string, ProfileData>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tiktok_username, instagram_username, avatar_url")
        .in("id", userIds);

      (profiles || []).forEach((p: {
        id: string;
        full_name: string | null;
        tiktok_username: string | null;
        instagram_username: string | null;
        avatar_url: string | null;
      }) => {
        profileMap.set(p.id, {
          full_name: p.full_name || undefined,
          tiktok_username: p.tiktok_username,
          instagram_username: p.instagram_username,
          avatar_url: p.avatar_url,
        });
      });
    }

    interface CreatorAgg {
      creatorId: string;
      name: string;
      handle: string | null;
      avatar: string | null;
      totalPoints: number;
      totalViews: number;
      approvedVideos: number;
    }

    const map = new Map<string, CreatorAgg>();

    for (const s of submissions) {
      const p = profileMap.get(s.user_id) || null;
      const creatorId = s.user_id;
      const points = s.approved_points || 0;
      const views = s.verified_views || 0;

      const rawHandle = p?.tiktok_username || p?.instagram_username || null;
      const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;

      if (!map.has(creatorId)) {
        map.set(creatorId, {
          creatorId,
          name: p?.full_name || "Creator",
          handle: cleanHandle,
          avatar: p?.avatar_url || null,
          totalPoints: points,
          totalViews: views,
          approvedVideos: 1,
        });
      } else {
        const existing = map.get(creatorId)!;
        existing.totalPoints += points;
        existing.totalViews += views;
        existing.approvedVideos += 1;
      }
    }

    // Sort formula: totalPoints DESC -> totalViews DESC -> approvedVideos DESC -> creatorId ASC
    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
      if (b.approvedVideos !== a.approvedVideos) return b.approvedVideos - a.approvedVideos;
      return a.creatorId.localeCompare(b.creatorId);
    });

    return sorted.slice(0, limit).map((c, idx) => ({
      ...c,
      rank: idx + 1,
      highlight: idx === 0 ? "Top Creator" : null,
    }));
  } catch (err) {
    console.error("fetchLeaderboardCreators failed:", err);
    return [];
  }
}

/**
 * Fetch Top Trending Videos for the leaderboard.
 * Ranks primarily by verified views in the selected 3-month window.
 * Secondary tie-breaker: approved points -> submitted_at -> ID.
 */
export async function fetchLeaderboardVideos(
  period?: LeaderboardPeriod,
  limit: number = 10
): Promise<LeaderboardVideo[]> {
  const supabase = createClient();
  const currentPeriod =
    typeof period === "object" && period !== null && "startDate" in period
      ? period
      : getRollingThreeMonthsPeriod();

  // 1. Try public RPC first
  try {
    const { data, error } = await supabase.rpc("get_leaderboard_videos", {
      p_start_date: currentPeriod.startDate.toISOString(),
      p_end_date: currentPeriod.endDate.toISOString(),
      p_limit: limit,
    });

    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((v, idx) => ({
          rank: v.rank || idx + 1,
          id: v.id,
          creatorId: v.creatorId,
          creatorName: v.creatorName,
          creatorHandle: v.creatorHandle || null,
          creatorAvatar: v.creatorAvatar || null,
          platform: v.platform,
          videoUrl: v.videoUrl,
          title: v.title,
          views: Number(v.views || 0),
          points: Number(v.points || 0),
          postingDate: v.postingDate,
          category: v.category || (v.platform === "TikTok" ? "TikTok" : "Reels"),
        }));
      }
      return [];
    }
  } catch (rpcErr) {
    console.warn("RPC get_leaderboard_videos fallback to client query:", rpcErr);
  }

  const startStr = currentPeriod.startDateStr || currentPeriod.startDate.toISOString().slice(0, 10);
  const endStr = currentPeriod.endDateStr || currentPeriod.endDate.toISOString().slice(0, 10);

  // 2. Browser API Route fallback
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(
        `/api/leaderboard?type=videos&startDate=${startStr}&endDate=${endStr}&limit=${limit}`
      );
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch {
      // Continue to direct query fallback
    }
  }

  // 3. Client query fallback
  try {
    const { data, error } = await supabase
      .from("submissions")
      .select("id, user_id, platform, video_url, posting_date, submitted_at, verified_views, approved_points, status")
      .eq("status", "approved")
      .gte("posting_date", startStr)
      .lte("posting_date", endStr)
      .gt("verified_views", 0)
      .gt("approved_points", 0)
      .order("verified_views", { ascending: false })
      .order("approved_points", { ascending: false })
      .order("submitted_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return [];
    }

    type ProfileData = {
      full_name?: string;
      tiktok_username?: string | null;
      instagram_username?: string | null;
      avatar_url?: string | null;
    };

    const userIds = Array.from(new Set(data.map((s) => s.user_id)));
    const profileMap = new Map<string, ProfileData>();

    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tiktok_username, instagram_username, avatar_url")
        .in("id", userIds);

      (profiles || []).forEach((p: {
        id: string;
        full_name: string | null;
        tiktok_username: string | null;
        instagram_username: string | null;
        avatar_url: string | null;
      }) => {
        profileMap.set(p.id, {
          full_name: p.full_name || undefined,
          tiktok_username: p.tiktok_username,
          instagram_username: p.instagram_username,
          avatar_url: p.avatar_url,
        });
      });
    }

    const thumbnailsMap = await fetchThumbnailsMap(
      data.map((s) => ({
        id: s.id,
        videoUrl: s.video_url,
        platform: s.platform,
      }))
    );

    return data.map((s, idx) => {
      const p = profileMap.get(s.user_id) || null;
      const creatorName = p?.full_name || "Creator";
      const rawHandle = p?.tiktok_username || p?.instagram_username || null;
      const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;

      const isTiktok = s.platform === "tiktok";
      const platformDisplay = isTiktok ? "TikTok" : "Instagram Reels";
      const generatedTitle = isTiktok
        ? `Konten TikTok oleh ${creatorName}`
        : `Video Reels oleh ${creatorName}`;

      const thumb = thumbnailsMap.get(s.id);

      return {
        rank: idx + 1,
        id: s.id,
        creatorId: s.user_id,
        creatorName,
        creatorHandle: cleanHandle,
        creatorAvatar: p?.avatar_url || null,
        platform: platformDisplay,
        videoUrl: s.video_url,
        title: generatedTitle,
        views: s.verified_views || 0,
        points: s.approved_points || 0,
        postingDate: s.posting_date,
        category: isTiktok ? "TikTok" : "Reels",
        thumbnailUrl: thumb?.thumbnailUrl || null,
        thumbnailSource: thumb?.source || null,
      };
    });
  } catch (err) {
    console.error("fetchLeaderboardVideos failed:", err);
    return [];
  }
}

/**
 * Fetch a specific creator's rank and standings in the current 3-month window.
 * Returns null if creator has no eligible approved submissions.
 */
export async function fetchUserLeaderboardRank(
  userId: string,
  period?: LeaderboardPeriod
): Promise<UserRankInfo | null> {
  const supabase = createClient();
  const currentPeriod = period || getRollingThreeMonthsPeriod();
  const startStr = currentPeriod.startDateStr || currentPeriod.startDate.toISOString().slice(0, 10);
  const endStr = currentPeriod.endDateStr || currentPeriod.endDate.toISOString().slice(0, 10);

  // Try RPC first
  try {
    const { data, error } = await supabase.rpc("get_creator_rank", {
      p_user_id: userId,
      p_start_date: currentPeriod.startDate.toISOString(),
      p_end_date: currentPeriod.endDate.toISOString(),
    });

    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed && typeof parsed.rank === "number") {
        return {
          rank: parsed.rank,
          totalCreators: parsed.totalCreators || 1,
          totalPoints: parsed.totalPoints || 0,
          totalViews: parsed.totalViews || 0,
          approvedVideos: parsed.approvedVideos || 0,
        };
      }
      return null;
    }
  } catch (rpcErr) {
    console.warn("RPC get_creator_rank fallback:", rpcErr);
  }

  // Browser API Route fallback
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(
        `/api/leaderboard?type=rank&userId=${userId}&startDate=${startStr}&endDate=${endStr}`
      );
      if (res.ok) {
        const json = await res.json();
        return json.data || null;
      }
    } catch {
      // Fallback
    }
  }

  // Fallback: evaluate against all ranked creators
  const all = await fetchLeaderboardCreators(currentPeriod, 1000);
  const foundIndex = all.findIndex((c) => c.creatorId === userId);

  if (foundIndex === -1) {
    return null;
  }

  const userCreator = all[foundIndex];
  return {
    rank: foundIndex + 1,
    totalCreators: all.length,
    totalPoints: userCreator.totalPoints,
    totalViews: userCreator.totalViews,
    approvedVideos: userCreator.approvedVideos,
  };
}
