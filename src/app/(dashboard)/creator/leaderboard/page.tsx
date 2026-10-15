"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/context/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { formatPoints, formatViews } from "@/lib/utils";
import {
  Trophy,
  Eye,
  Sparkles,
  RefreshCw,
  PlusCircle,
  Video,
  Users,
  CheckCircle2,
  Calendar,
} from "lucide-react";
import {
  fetchLeaderboardCreators,
  fetchLeaderboardVideos,
  fetchUserLeaderboardRank,
  getRollingThreeMonthsPeriod,
} from "@/lib/supabase/leaderboard";
import {
  LeaderboardCreator,
  LeaderboardVideo,
  LeaderboardPeriod,
  UserRankInfo,
} from "@/lib/types/leaderboard";
import { VideoGallery } from "@/components/leaderboard/video-gallery";

export default function CreatorLeaderboardPage() {
  const { user } = useAuth();
  const userUid = user?.uid;
  const [activeTab, setActiveTab] = useState<"creators" | "videos">("creators");
  const [period, setPeriod] = useState<LeaderboardPeriod | null>(null);
  const [creators, setCreators] = useState<LeaderboardCreator[]>([]);
  const [videos, setVideos] = useState<LeaderboardVideo[]>([]);
  const [userRank, setUserRank] = useState<UserRankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const currentPeriod = getRollingThreeMonthsPeriod();

    Promise.all([
      fetchLeaderboardCreators(currentPeriod, 5),
      fetchLeaderboardVideos(currentPeriod, 10),
      userUid ? fetchUserLeaderboardRank(userUid, currentPeriod) : Promise.resolve(null),
    ])
      .then(([creatorsData, videosData, rankData]) => {
        if (!active) return;
        setPeriod(currentPeriod);
        setCreators(creatorsData);
        setVideos(videosData);
        setUserRank(rankData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading creator leaderboard:", err);
        setPeriod(currentPeriod);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userUid]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const currentPeriod = getRollingThreeMonthsPeriod();
    setPeriod(currentPeriod);
    try {
      const [creatorsData, videosData, rankData] = await Promise.all([
        fetchLeaderboardCreators(currentPeriod, 5),
        fetchLeaderboardVideos(currentPeriod, 10),
        userUid ? fetchUserLeaderboardRank(userUid, currentPeriod) : Promise.resolve(null),
      ]);
      setCreators(creatorsData);
      setVideos(videosData);
      setUserRank(rankData);
    } catch (err) {
      console.error("Error refreshing leaderboard:", err);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="brand" size="sm" className="font-semibold gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-brand-blue" />
              <span>Leaderboard & Papan Peringkat</span>
            </Badge>
            {period && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary bg-card-surface px-3 py-1 rounded-full border border-border-subtle">
                <Calendar className="w-3 h-3 text-text-secondary" />
                {period.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Leaderboard Kreator & Video
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {activeTab === "creators"
              ? "Apresiasi untuk kreator dengan performa terbaik selama 3 bulan terakhir."
              : "Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="border-border-subtle hover:bg-card-elevated"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Link href="/creator/submit">
            <Button size="sm" className="gap-1.5 shadow-md shadow-brand-blue/20">
              <PlusCircle className="w-3.5 h-3.5" />
              Submit Video
            </Button>
          </Link>
        </div>
      </div>

      {/* Creator Personal Standing Banner */}
      {!loading && (
        userRank ? (
          <Card className="p-5 sm:p-6 bg-gradient-to-r from-card-surface via-card-surface to-brand-blue/10 border-border-subtle border-l-4 border-l-brand-blue rounded-2xl shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Peringkat Kamu Periode Ini
                  </span>
                  {userRank.rank <= 5 && (
                    <Badge variant="success" size="sm" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Top 5 Kreator</span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-brand-blue font-mono">
                    #{userRank.rank}
                  </span>
                  <span className="text-xs sm:text-sm text-text-secondary">
                    dari {userRank.totalCreators} kreator aktif dengan video terverifikasi
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-border-subtle">
                <div className="text-left sm:text-right">
                  <p className="text-[11px] text-text-secondary">Poin Terkumpul</p>
                  <p className="text-base sm:text-lg font-bold text-brand-blue font-mono">
                    +{formatPoints(userRank.totalPoints)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] text-text-secondary">Total Views</p>
                  <p className="text-base sm:text-lg font-bold text-text-primary font-mono">
                    {formatViews(userRank.totalViews)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[11px] text-text-secondary">Video Disetujui</p>
                  <p className="text-base sm:text-lg font-bold text-text-primary font-mono">
                    {userRank.approvedVideos}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-5 sm:p-6 bg-card-surface border-border-subtle rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-sm sm:text-base font-bold text-text-primary">
                Kamu belum memiliki video yang disetujui pada periode ini
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Yuk, kirimkan konten TikTok atau Instagram Reels kamu untuk mulai mengumpulkan poin dan masuk ke papan peringkat!
              </p>
            </div>
            <Link href="/creator/submit" className="shrink-0">
              <Button size="sm" variant="outline" className="border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10">
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Submit Video Baru
              </Button>
            </Link>
          </Card>
        )
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3">
        <button
          onClick={() => setActiveTab("creators")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "creators"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
              : "bg-card-surface text-text-secondary hover:text-text-primary hover:bg-card-elevated border border-border-subtle"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Top 5 Kreator</span>
        </button>

        <button
          onClick={() => setActiveTab("videos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            activeTab === "videos"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
              : "bg-card-surface text-text-secondary hover:text-text-primary hover:bg-card-elevated border border-border-subtle"
          }`}
        >
          <Video className="w-4 h-4" />
          <span>Top Trending Videos</span>
        </button>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <Card className="p-12 text-center bg-card-surface border-border-subtle rounded-2xl animate-pulse">
          <p className="text-xs text-text-secondary">Memuat data leaderboard terbaru...</p>
        </Card>
      ) : activeTab === "creators" ? (
        creators.length === 0 ? (
          <Card className="p-12 text-center bg-card-surface border-border-subtle rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              Belum ada konten yang masuk leaderboard periode ini.
            </h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto">
              Yuk, mulai bikin konten dan kumpulkan poin!
            </p>
            <div className="pt-2">
              <Link href="/creator/submit">
                <Button size="sm">
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Kirim Pengajuan Video
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="bg-card-surface border-border-subtle divide-y divide-border-subtle/60 shadow-lg rounded-2xl overflow-hidden">
            {creators.map((c) => {
              const isCurrentUser = user?.uid && c.creatorId === user.uid;

              return (
                <div
                  key={c.creatorId}
                  className={`p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                    isCurrentUser
                      ? "bg-brand-blue/5 border-l-4 border-l-brand-blue hover:bg-brand-blue/10"
                      : "hover:bg-card-elevated/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-8 text-center font-bold font-mono text-sm shrink-0">
                      {c.rank === 1 ? (
                        <span className="text-xl">🥇</span>
                      ) : c.rank === 2 ? (
                        <span className="text-xl">🥈</span>
                      ) : c.rank === 3 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-text-secondary font-bold">#{c.rank}</span>
                      )}
                    </div>

                    <Avatar name={c.name} src={c.avatar || undefined} size="md" />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-text-primary truncate">
                          {c.name}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
                            Kamu
                          </span>
                        )}
                        {c.highlight && !isCurrentUser && (
                          <span className="hidden sm:inline-block text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
                            {c.highlight}
                          </span>
                        )}
                      </div>
                      {c.handle ? (
                        <p className="text-xs text-text-secondary truncate">{c.handle}</p>
                      ) : (
                        <p className="text-xs text-text-secondary/70 italic">
                          {c.approvedVideos} video disetujui
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Views & Points */}
                  <div className="text-right shrink-0">
                    <div className="text-sm sm:text-base font-bold text-brand-blue font-mono">
                      {formatPoints(c.totalPoints)} Poin
                    </div>
                    <div className="text-xs text-text-secondary flex items-center justify-end gap-1 mt-0.5">
                      <Eye className="w-3 h-3 text-text-secondary" />
                      <span>{formatViews(c.totalViews)} views</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )
      ) : (
        <VideoGallery videos={videos} />
      )}
    </div>
  );
}
