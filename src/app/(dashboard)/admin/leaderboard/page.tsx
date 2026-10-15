"use client";

import React, { useEffect, useState } from "react";
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
  Video,
  Users,
  Calendar,
} from "lucide-react";
import {
  fetchLeaderboardCreators,
  fetchLeaderboardVideos,
  getRollingThreeMonthsPeriod,
} from "@/lib/supabase/leaderboard";
import {
  LeaderboardCreator,
  LeaderboardVideo,
  LeaderboardPeriod,
} from "@/lib/types/leaderboard";
import { VideoGallery } from "@/components/leaderboard/video-gallery";

export default function AdminLeaderboardPage() {
  const [activeTab, setActiveTab] = useState<"creators" | "videos">("creators");
  const [period, setPeriod] = useState<LeaderboardPeriod | null>(null);
  const [creators, setCreators] = useState<LeaderboardCreator[]>([]);
  const [videos, setVideos] = useState<LeaderboardVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const currentPeriod = getRollingThreeMonthsPeriod();

    Promise.all([
      fetchLeaderboardCreators(currentPeriod, 20),
      fetchLeaderboardVideos(currentPeriod, 25),
    ])
      .then(([creatorsData, videosData]) => {
        if (!active) return;
        setPeriod(currentPeriod);
        setCreators(creatorsData);
        setVideos(videosData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading admin leaderboard data:", err);
        setPeriod(currentPeriod);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    const currentPeriod = getRollingThreeMonthsPeriod();
    setPeriod(currentPeriod);
    try {
      const [creatorsData, videosData] = await Promise.all([
        fetchLeaderboardCreators(currentPeriod, 20),
        fetchLeaderboardVideos(currentPeriod, 25),
      ]);
      setCreators(creatorsData);
      setVideos(videosData);
    } catch (err) {
      console.error("Error refreshing admin leaderboard data:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const totalPoints = creators.reduce((acc, c) => acc + c.totalPoints, 0);
  const totalViews = creators.reduce((acc, c) => acc + c.totalViews, 0);
  const totalApprovedVideos = creators.reduce((acc, c) => acc + c.approvedVideos, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <Badge variant="brand" size="sm" className="font-semibold gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-brand-blue" />
              <span>Admin Management</span>
            </Badge>
            {period && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary bg-card-surface px-3 py-1 rounded-full border border-border-subtle">
                <Calendar className="w-3 h-3 text-text-secondary" />
                {period.label}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Pengawasan Papan Peringkat (Leaderboard)
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Data performa terverifikasi 3 bulan terakhir berdasarkan persetujuan admin untuk riset kuartalan.
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
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl">
          <p className="text-xs text-text-secondary">Kreator Berperingkat</p>
          <p className="text-2xl font-extrabold text-text-primary font-mono mt-1">
            {loading ? "..." : creators.length}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">Memiliki konten disetujui</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl">
          <p className="text-xs text-text-secondary">Total Poin Diberikan</p>
          <p className="text-2xl font-extrabold text-brand-blue font-mono mt-1">
            {loading ? "..." : `+${formatPoints(totalPoints)}`}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">Dari video periode ini</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl">
          <p className="text-xs text-text-secondary">Total Verified Views</p>
          <p className="text-2xl font-extrabold text-text-primary font-mono mt-1">
            {loading ? "..." : formatViews(totalViews)}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">Snapshot saat approval</p>
        </Card>

        <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl">
          <p className="text-xs text-text-secondary">Total Video Lolos</p>
          <p className="text-2xl font-extrabold text-text-primary font-mono mt-1">
            {loading ? "..." : totalApprovedVideos}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">Masuk klasemen periode ini</p>
        </Card>
      </div>

      {/* Tabs */}
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
          <span>Top Kreator ({creators.length})</span>
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
          <span>Top Performing Videos ({videos.length})</span>
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <Card className="p-12 text-center bg-card-surface border-border-subtle rounded-2xl animate-pulse">
          <p className="text-xs text-text-secondary">Memuat data peringkat...</p>
        </Card>
      ) : activeTab === "creators" ? (
        creators.length === 0 ? (
          <Card className="p-12 text-center bg-card-surface border-border-subtle rounded-2xl space-y-2">
            <Sparkles className="w-8 h-8 text-brand-blue mx-auto" />
            <h3 className="text-base font-bold text-text-primary">
              Belum ada kreator yang masuk peringkat pada periode ini.
            </h3>
            <p className="text-xs text-text-secondary">
              Peringkat akan terisi otomatis saat admin menyetujui pengajuan konten kreator.
            </p>
          </Card>
        ) : (
          <Card className="bg-card-surface border-border-subtle divide-y divide-border-subtle/60 shadow-lg rounded-2xl overflow-hidden">
            {creators.map((c) => (
              <div
                key={c.creatorId}
                className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-card-elevated/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
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
                      {c.highlight && (
                        <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
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

                <div className="text-right shrink-0">
                  <div className="text-sm sm:text-base font-bold text-brand-blue font-mono">
                    +{formatPoints(c.totalPoints)} Poin
                  </div>
                  <div className="text-xs text-text-secondary flex items-center justify-end gap-1 mt-0.5">
                    <Eye className="w-3 h-3 text-text-secondary" />
                    <span>{formatViews(c.totalViews)} views</span>
                    <span className="text-text-secondary/50 mx-1">•</span>
                    <span>{c.approvedVideos} video</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        )
      ) : (
        <VideoGallery videos={videos} isAdmin={true} />
      )}
    </div>
  );
}
