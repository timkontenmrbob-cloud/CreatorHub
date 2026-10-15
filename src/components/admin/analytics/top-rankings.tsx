"use client";

import React, { useState } from "react";
import { LeaderboardCreator, LeaderboardVideo } from "@/lib/types/leaderboard";
import { Avatar } from "@/components/ui/avatar";
import { VideoGallery } from "@/components/leaderboard/video-gallery";
import { Trophy, Film, Users, Eye, Coins } from "lucide-react";

interface TopRankingsProps {
  creators: LeaderboardCreator[];
  videos: LeaderboardVideo[];
  quarterLabel: string;
}

export function TopRankings({ creators, videos, quarterLabel }: TopRankingsProps) {
  const [activeTab, setActiveTab] = useState<"creators" | "videos">("creators");

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Kontributor & Konten Terbaik ({quarterLabel})
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Peringkat kreator dan video UGC terverifikasi berdasarkan hasil nyata pada kuartal ini.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-bg-main p-1 rounded-xl border border-border-subtle self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("creators")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "creators"
                ? "bg-brand-blue text-white shadow-sm shadow-brand-blue/20"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Top 10 Kreator ({creators.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "videos"
                ? "bg-brand-blue text-white shadow-sm shadow-brand-blue/20"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Top 10 Video ({videos.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Top Creators Table */}
      {activeTab === "creators" && (
        <div className="pt-5">
          {creators.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-secondary bg-bg-main rounded-xl border border-border-subtle">
              Belum ada kreator dengan konten terverifikasi pada kuartal ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-bg-main/60">
                    <th className="py-3 px-4 w-12 text-center">Rank</th>
                    <th className="py-3 px-4">Kreator</th>
                    <th className="py-3 px-4 text-center">Video Lolos</th>
                    <th className="py-3 px-4 text-right">Total Verified Views</th>
                    <th className="py-3 px-4 text-right">Poin Diperoleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50">
                  {creators.map((c) => {
                    const isTop1 = c.rank === 1;

                    return (
                      <tr
                        key={c.creatorId}
                        className={`hover:bg-card-surface/60 transition ${
                          isTop1 ? "bg-amber-500/5 font-medium" : ""
                        }`}
                      >
                        {/* Rank Badge */}
                        <td className="py-3 px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-black font-black text-xs shadow-sm shadow-amber-400/20">
                              1
                            </span>
                          ) : c.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-black font-black text-xs">
                              2
                            </span>
                          ) : c.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs">
                              3
                            </span>
                          ) : (
                            <span className="text-text-secondary font-mono">#{c.rank}</span>
                          )}
                        </td>

                        {/* Creator Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={c.name}
                              src={c.avatar || undefined}
                              size="sm"
                              className="border border-border-subtle"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-text-primary">{c.name}</span>
                                {isTop1 && (
                                  <span className="text-[10px] bg-amber-400/10 text-amber-400 border border-amber-400/30 px-1.5 py-0.2 rounded font-medium">
                                    Top Creator
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-text-secondary">
                                {c.handle || "Creator"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Approved Videos */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
                            <Film className="w-3 h-3 text-text-secondary" />
                            {c.approvedVideos}
                          </span>
                        </td>

                        {/* Total Views */}
                        <td className="py-3 px-4 text-right font-semibold text-text-primary">
                          <div className="flex items-center justify-end gap-1.5">
                            <Eye className="w-3 h-3 text-brand-blue" />
                            <span>{c.totalViews.toLocaleString("id-ID")}</span>
                          </div>
                        </td>

                        {/* Total Points */}
                        <td className="py-3 px-4 text-right font-black text-brand-blue">
                          <div className="flex items-center justify-end gap-1.5">
                            <Coins className="w-3 h-3 text-brand-blue" />
                            <span>{c.totalPoints.toLocaleString("id-ID")} Poin</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Top Videos Gallery (Reusing Native Video Gallery) */}
      {activeTab === "videos" && (
        <div className="pt-5">
          {videos.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-secondary bg-bg-main rounded-xl border border-border-subtle">
              Belum ada video terverifikasi pada kuartal ini.
            </div>
          ) : (
            <VideoGallery videos={videos} isAdmin={true} />
          )}
        </div>
      )}
    </div>
  );
}
