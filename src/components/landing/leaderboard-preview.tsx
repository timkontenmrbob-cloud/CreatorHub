"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPoints, formatViews } from "@/lib/utils";
import { Eye, Trophy, Sparkles } from "lucide-react";
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

export function LeaderboardPreview() {
  const [activeTab, setActiveTab] = useState<"creators" | "videos">("creators");
  const [period, setPeriod] = useState<LeaderboardPeriod | null>(null);
  const [creators, setCreators] = useState<LeaderboardCreator[]>([]);
  const [videos, setVideos] = useState<LeaderboardVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const currentPeriod = getRollingThreeMonthsPeriod();

    Promise.all([
      fetchLeaderboardCreators(currentPeriod, 5),
      fetchLeaderboardVideos(currentPeriod, 10),
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
        console.error("Error loading landing leaderboard data:", err);
        setPeriod(currentPeriod);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="leaderboard" className="py-20 sm:py-24 bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
          <div className="inline-flex items-center gap-2">
            <Badge variant="brand" size="sm" className="font-semibold gap-1">
              <Trophy className="w-3 h-3 text-brand-blue" />
              <span>Papan Peringkat</span>
            </Badge>
            {period && (
              <span className="text-[11px] font-mono text-text-secondary bg-card-surface px-2.5 py-1 rounded-full border border-border-subtle">
                {period.label}
              </span>
            )}
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Kreator & Konten Terpopuler
          </h2>

          {/* Dynamic subheading per specification */}
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed transition-all duration-200">
            {activeTab === "creators"
              ? "Apresiasi untuk kreator dengan performa terbaik selama 3 bulan terakhir."
              : "Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."}
          </p>

          {/* Tab Selector */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveTab("creators")}
              className={`text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-medium ${
                activeTab === "creators"
                  ? "bg-card-elevated text-brand-blue border border-brand-blue/40 shadow-sm font-semibold"
                  : "bg-card-surface/60 text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-card-surface"
              }`}
            >
              Top 5 Kreator
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-medium ${
                activeTab === "videos"
                  ? "bg-card-elevated text-brand-blue border border-brand-blue/40 shadow-sm font-semibold"
                  : "bg-card-surface/60 text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-card-surface"
              }`}
            >
              Top Trending Videos
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          {loading ? (
            <Card className="p-8 text-center bg-card-surface border-border-subtle rounded-2xl animate-pulse">
              <p className="text-xs text-text-secondary">Memuat data papan peringkat...</p>
            </Card>
          ) : activeTab === "creators" ? (
            creators.length === 0 ? (
              <Card className="p-8 text-center bg-card-surface border-border-subtle rounded-2xl space-y-2">
                <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-text-primary">
                  Belum ada konten yang masuk leaderboard periode ini.
                </h3>
                <p className="text-xs text-text-secondary">
                  Yuk, mulai bikin konten dan kumpulkan poin!
                </p>
              </Card>
            ) : (
              <Card className="bg-card-surface border-border-subtle divide-y divide-border-subtle/60 shadow-lg rounded-2xl overflow-hidden">
                {creators.map((c) => (
                  <div
                    key={c.creatorId}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-card-elevated/30 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      {/* Rank Indicator */}
                      <div className="w-7 text-center font-bold font-mono text-sm shrink-0">
                        {c.rank === 1 ? (
                          <span className="text-lg">🥇</span>
                        ) : c.rank === 2 ? (
                          <span className="text-lg">🥈</span>
                        ) : c.rank === 3 ? (
                          <span className="text-lg">🥉</span>
                        ) : (
                          <span className="text-text-secondary">#{c.rank}</span>
                        )}
                      </div>

                      <Avatar name={c.name} src={c.avatar || undefined} size="md" />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-text-primary truncate">
                            {c.name}
                          </h4>
                          {c.highlight && (
                            <span className="hidden sm:inline-block text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
                              {c.highlight}
                            </span>
                          )}
                        </div>
                        {c.handle ? (
                          <p className="text-xs text-text-secondary truncate">{c.handle}</p>
                        ) : (
                          <p className="text-xs text-text-secondary/60 italic">{c.approvedVideos} video disetujui</p>
                        )}
                      </div>
                    </div>

                    {/* Views & Points */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-brand-blue font-mono">
                        {formatPoints(c.totalPoints)} Poin
                      </div>
                      <div className="text-xs text-text-secondary flex items-center justify-end gap-1 mt-0.5">
                        <Eye className="w-3 h-3" />
                        <span>{formatViews(c.totalViews)} views</span>
                      </div>
                    </div>
                  </div>
                ))}
              </Card>
            )
          ) : (
            <VideoGallery videos={videos} />
          )}
        </div>
      </div>
    </section>
  );
}
