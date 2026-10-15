import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LeaderboardCreator, LeaderboardVideo, UserRankInfo } from "@/lib/types/leaderboard";
import { getCalendarThreeMonthsPeriod } from "@/lib/supabase/leaderboard";
import { fetchThumbnailsMap } from "@/lib/supabase/thumbnails";

/**
 * Public Leaderboard API Endpoint
 * Provides aggregated, privacy-safe performance data for Top 5 Creators and Top Trending Videos.
 * Strictly exposes only approved, public fields (no email, whatsapp, addresses, or evidence).
 */
export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") || "creators"; // "creators" | "videos" | "rank"
    const limit = Math.max(1, Math.min(50, parseInt(searchParams.get("limit") || "10", 10)));
    const userId = searchParams.get("userId") || undefined;

    // Date range handling: Exact 3-calendar-month window in Asia/Jakarta (WIB)
    const defaultPeriod = getCalendarThreeMonthsPeriod();
    const startDateStr = searchParams.get("startDate") || defaultPeriod.startDateStr;
    const endDateStr = searchParams.get("endDate") || defaultPeriod.endDateStr;

    // 1. TOP CREATORS
    if (type === "creators") {
      // First try stored RPC if available
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_leaderboard_creators", {
          p_start_date: startDateStr,
          p_end_date: endDateStr,
          p_limit: limit,
        });

        if (!rpcError && rpcData) {
          const parsed = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
          return NextResponse.json({ data: parsed });
        }
      } catch {
        // Fallback to server query
      }

      // Authoritative Server-side Aggregation
      const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("id, user_id, verified_views, approved_points, posting_date, status")
        .eq("status", "approved")
        .gte("posting_date", startDateStr)
        .lte("posting_date", endDateStr)
        .gt("verified_views", 0)
        .gt("approved_points", 0);

      if (subError || !submissions) {
        return NextResponse.json({ data: [] });
      }

      type ProfileLike = {
        full_name?: string;
        tiktok_username?: string | null;
        instagram_username?: string | null;
        avatar_url?: string | null;
      };

      const userIds = Array.from(new Set(submissions.map((s) => s.user_id)));
      const profileMap = new Map<string, ProfileLike>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, tiktok_username, instagram_username, avatar_url")
          .in("id", userIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profiles || []).forEach((p: any) => {
          profileMap.set(p.id, {
            full_name: p.full_name,
            tiktok_username: p.tiktok_username,
            instagram_username: p.instagram_username,
            avatar_url: p.avatar_url,
          });
        });
      }

      // Consent checking for creators
      const consentMap = new Map<string, boolean>();
      try {
        const { data: authData } = await supabase.auth.admin.listUsers();
        (authData?.users || []).forEach((u) => {
          if (u.user_metadata?.public_leaderboard_consent === false) {
            consentMap.set(u.id, false);
          }
        });
      } catch {
        // Fallback gracefully
      }

      interface Agg {
        creatorId: string;
        name: string;
        handle: string | null;
        avatar: string | null;
        totalPoints: number;
        totalViews: number;
        approvedVideos: number;
        isAnonymous?: boolean;
      }

      const map = new Map<string, Agg>();

      for (const s of submissions) {
        const p = profileMap.get(s.user_id) || null;
        const cid = s.user_id;
        const points = Number(s.approved_points) || 0;
        const views = Number(s.verified_views) || 0;
        const hasConsent = consentMap.get(cid) !== false;

        const rawHandle = hasConsent ? (p?.tiktok_username || p?.instagram_username || null) : null;
        const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;
        const displayName = hasConsent ? (p?.full_name || "Creator") : "Kreator Anonim";
        const avatar = hasConsent ? (p?.avatar_url || null) : null;

        if (!map.has(cid)) {
          map.set(cid, {
            creatorId: cid,
            name: displayName,
            handle: cleanHandle,
            avatar,
            totalPoints: points,
            totalViews: views,
            approvedVideos: 1,
            isAnonymous: !hasConsent,
          });
        } else {
          const existing = map.get(cid)!;
          existing.totalPoints += points;
          existing.totalViews += views;
          existing.approvedVideos += 1;
        }
      }

      // Sort: Total Points DESC -> Total Views DESC -> Approved Videos DESC -> ID ASC
      const sorted = Array.from(map.values()).sort((a, b) => {
        if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
        if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
        if (b.approvedVideos !== a.approvedVideos) return b.approvedVideos - a.approvedVideos;
        return a.creatorId.localeCompare(b.creatorId);
      });

      const result: LeaderboardCreator[] = sorted.slice(0, limit).map((c, idx) => ({
        ...c,
        rank: idx + 1,
        highlight: idx === 0 ? "Top Creator" : null,
      }));

      return NextResponse.json({ data: result });
    }

    // 2. TOP TRENDING VIDEOS
    if (type === "videos") {
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_leaderboard_videos", {
          p_start_date: startDateStr,
          p_end_date: endDateStr,
          p_limit: limit,
        });

        if (!rpcError && rpcData) {
          const parsed = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
          return NextResponse.json({ data: parsed });
        }
      } catch {
        // Fallback
      }

      const { data: submissions, error: subError } = await supabase
        .from("submissions")
        .select("id, user_id, platform, video_url, posting_date, submitted_at, verified_views, approved_points, status")
        .eq("status", "approved")
        .gte("posting_date", startDateStr)
        .lte("posting_date", endDateStr)
        .gt("verified_views", 0)
        .gt("approved_points", 0)
        .order("verified_views", { ascending: false })
        .order("approved_points", { ascending: false })
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: true })
        .limit(limit);

      if (subError || !submissions) {
        return NextResponse.json({ data: [] });
      }

      type ProfileLike = {
        full_name?: string;
        tiktok_username?: string | null;
        instagram_username?: string | null;
        avatar_url?: string | null;
      };

      const userIds = Array.from(new Set(submissions.map((s) => s.user_id)));
      const profileMap = new Map<string, ProfileLike>();

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, tiktok_username, instagram_username, avatar_url")
          .in("id", userIds);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (profiles || []).forEach((p: any) => {
          profileMap.set(p.id, {
            full_name: p.full_name,
            tiktok_username: p.tiktok_username,
            instagram_username: p.instagram_username,
            avatar_url: p.avatar_url,
          });
        });
      }

      // Consent checking for video creators
      const videoConsentMap = new Map<string, boolean>();
      try {
        const { data: authData } = await supabase.auth.admin.listUsers();
        (authData?.users || []).forEach((u) => {
          if (u.user_metadata?.public_leaderboard_consent === false) {
            videoConsentMap.set(u.id, false);
          }
        });
      } catch {
        // Fallback
      }

      const thumbnailsMap = await fetchThumbnailsMap(
        submissions.map((s) => ({
          id: s.id,
          videoUrl: s.video_url,
          platform: s.platform,
        }))
      );

      const result: LeaderboardVideo[] = submissions.map((s, idx) => {
        const p = profileMap.get(s.user_id) || null;
        const hasConsent = videoConsentMap.get(s.user_id) !== false;
        const creatorName = hasConsent ? (p?.full_name || "Creator") : "Kreator Anonim";
        const rawHandle = hasConsent ? (p?.tiktok_username || p?.instagram_username || null) : null;
        const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;
        const avatar = hasConsent ? (p?.avatar_url || null) : null;

        const isTiktok = s.platform === "tiktok";
        const platformDisplay = isTiktok ? "TikTok" : "Instagram Reels";
        const title = hasConsent
          ? (isTiktok ? `Konten TikTok oleh ${creatorName}` : `Video Reels oleh ${creatorName}`)
          : (isTiktok ? "Konten TikTok" : "Video Reels");

        const thumb = thumbnailsMap.get(s.id);

        return {
          rank: idx + 1,
          id: s.id,
          creatorId: s.user_id,
          creatorName,
          creatorHandle: cleanHandle,
          creatorAvatar: avatar,
          platform: platformDisplay,
          videoUrl: s.video_url,
          title,
          views: Number(s.verified_views || 0),
          points: Number(s.approved_points || 0),
          postingDate: s.posting_date,
          category: isTiktok ? "TikTok" : "Reels",
          isAnonymous: !hasConsent,
          thumbnailUrl: thumb?.thumbnailUrl || null,
          thumbnailSource: thumb?.source || null,
        };
      });

      return NextResponse.json({ data: result });
    }

    // 3. CREATOR'S INDIVIDUAL RANK
    if (type === "rank" && userId) {
      const { data: submissions } = await supabase
        .from("submissions")
        .select("user_id, verified_views, approved_points")
        .eq("status", "approved")
        .gte("posting_date", startDateStr)
        .lte("posting_date", endDateStr)
        .gt("verified_views", 0)
        .gt("approved_points", 0);

      if (!submissions || submissions.length === 0) {
        return NextResponse.json({ data: null });
      }

      const map = new Map<string, { totalPoints: number; totalViews: number; approvedVideos: number }>();

      for (const s of submissions) {
        const cid = s.user_id;
        const pts = Number(s.approved_points) || 0;
        const vws = Number(s.verified_views) || 0;

        if (!map.has(cid)) {
          map.set(cid, { totalPoints: pts, totalViews: vws, approvedVideos: 1 });
        } else {
          const cur = map.get(cid)!;
          cur.totalPoints += pts;
          cur.totalViews += vws;
          cur.approvedVideos += 1;
        }
      }

      if (!map.has(userId)) {
        return NextResponse.json({ data: null });
      }

      const sorted = Array.from(map.entries()).sort((a, b) => {
        if (b[1].totalPoints !== a[1].totalPoints) return b[1].totalPoints - a[1].totalPoints;
        if (b[1].totalViews !== a[1].totalViews) return b[1].totalViews - a[1].totalViews;
        if (b[1].approvedVideos !== a[1].approvedVideos) return b[1].approvedVideos - a[1].approvedVideos;
        return a[0].localeCompare(b[0]);
      });

      const userIndex = sorted.findIndex(([id]) => id === userId);
      if (userIndex === -1) {
        return NextResponse.json({ data: null });
      }

      const stats = sorted[userIndex][1];
      const rankInfo: UserRankInfo = {
        rank: userIndex + 1,
        totalCreators: sorted.length,
        totalPoints: stats.totalPoints,
        totalViews: stats.totalViews,
        approvedVideos: stats.approvedVideos,
      };

      return NextResponse.json({ data: rankInfo });
    }

    return NextResponse.json({ data: [] });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data leaderboard" },
      { status: 500 }
    );
  }
}
