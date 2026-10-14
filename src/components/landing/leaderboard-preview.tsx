"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { formatPoints, formatViews } from "@/lib/utils";
import { Eye } from "lucide-react";

export function LeaderboardPreview() {
  const [activeTab, setActiveTab] = useState<"creators" | "videos">("creators");

  // Realistic public creator accounts
  const demoCreators = [
    {
      rank: 1,
      name: "Sarah Oktaviani",
      handle: "@sarah.oktav",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      verifiedViews: 1450000,
      approvedVideos: 8,
      pointsEarned: 14500,
      highlight: "Top Creator",
    },
    {
      rank: 2,
      name: "Dimas Setiawan",
      handle: "@dimas_parelife",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      verifiedViews: 890000,
      approvedVideos: 5,
      pointsEarned: 8900,
      highlight: null,
    },
    {
      rank: 3,
      name: "Alifia Rahma",
      handle: "@alifiarahmaa",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      verifiedViews: 620000,
      approvedVideos: 4,
      pointsEarned: 6200,
      highlight: null,
    },
    {
      rank: 4,
      name: "Kenzo Ardiansyah",
      handle: "@kenzo_english",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      verifiedViews: 410000,
      approvedVideos: 3,
      pointsEarned: 4100,
      highlight: null,
    },
    {
      rank: 5,
      name: "Putri Dwi Cahyani",
      handle: "@putridwistudy",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
      verifiedViews: 350000,
      approvedVideos: 3,
      pointsEarned: 3500,
      highlight: null,
    },
  ];

  // Realistic top performing videos with believable content styles and links
  const demoVideos = [
    {
      rank: 1,
      title: "A Day in My Life di Camp English Area Mr.BOB Pare Kediri! 🏠🔥",
      creator: "Sarah Oktaviani",
      handle: "@sarah.oktav",
      platform: "TikTok",
      views: 780000,
      points: 7800,
      category: "Daily Life",
      url: "https://www.tiktok.com/@mrbobkampunginggris",
    },
    {
      rank: 2,
      title: "Spill cara lancar ngomong Inggris dalam 1 bulan tanpa overthinking grammar",
      creator: "Dimas Setiawan",
      handle: "@dimas_parelife",
      platform: "Instagram Reels",
      views: 520000,
      points: 5200,
      category: "Educational",
      url: "https://www.instagram.com/mrbobkampunginggris",
    },
    {
      rank: 3,
      title: "POV: Hari pertama masuk kelas Super Speaking Mr.BOB & langsung disuruh ngomong",
      creator: "Alifia Rahma",
      handle: "@alifiarahmaa",
      platform: "TikTok",
      views: 430000,
      points: 4300,
      category: "POV",
      url: "https://www.tiktok.com/@mrbobkampunginggris",
    },
    {
      rank: 4,
      title: "Review jujur fasilitas camp 5-up & keseruan belajar bareng member dari berbagai kota",
      creator: "Putri Dwi Cahyani",
      handle: "@putridwistudy",
      platform: "TikTok",
      views: 290000,
      points: 2900,
      category: "Review Kelas",
      url: "https://www.tiktok.com/@mrbobkampunginggris",
    },
  ];

  return (
    <section id="leaderboard" className="py-20 sm:py-24 bg-bg-main">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">
            Papan Peringkat
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
            Kreator & Konten Terpopuler
          </h2>

          {/* Dynamic subheading behavior */}
          <p className="text-sm sm:text-base text-text-secondary leading-relaxed transition-all duration-200">
            {activeTab === "creators"
              ? "Apresiasi bagi kreator teraktif dan konten dengan views terverifikasi tertinggi periode ini."
              : "Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."}
          </p>

          {/* Tab Selector */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveTab("creators")}
              className={`text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-medium ${
                activeTab === "creators"
                  ? "bg-card-elevated text-brand-blue border border-brand-blue/40 shadow-sm"
                  : "bg-card-surface/60 text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-card-surface"
              }`}
            >
              Top 5 Kreator
            </button>
            <button
              onClick={() => setActiveTab("videos")}
              className={`text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-medium ${
                activeTab === "videos"
                  ? "bg-card-elevated text-brand-blue border border-brand-blue/40 shadow-sm"
                  : "bg-card-surface/60 text-text-secondary border border-border-subtle hover:text-text-primary hover:bg-card-surface"
              }`}
            >
              Top Trending Videos
            </button>
          </div>
        </div>

        <div className="max-w-3xl mx-auto">
          {activeTab === "creators" ? (
            <Card className="bg-card-surface border-border-subtle divide-y divide-border-subtle/60 shadow-lg">
              {demoCreators.map((c) => (
                <div
                  key={c.rank}
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

                    <Avatar name={c.name} src={c.avatar} size="md" />

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
                      <p className="text-xs text-text-secondary truncate">{c.handle}</p>
                    </div>
                  </div>

                  {/* Views & Points */}
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-brand-blue font-mono">
                      {formatPoints(c.pointsEarned)} Poin
                    </div>
                    <div className="text-xs text-text-secondary flex items-center justify-end gap-1 mt-0.5">
                      <Eye className="w-3 h-3" />
                      <span>{formatViews(c.verifiedViews)} views</span>
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          ) : (
            <div className="space-y-3">
              {demoVideos.map((v) => (
                <a
                  key={v.rank}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="p-5 bg-card-surface border-border-subtle group-hover:border-brand-blue/50 group-hover:bg-card-elevated/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer">
                    <div className="flex items-start gap-3.5">
                      <div className="w-8 h-8 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue shrink-0 font-bold font-mono text-xs group-hover:border-brand-blue/30">
                        #{v.rank}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full border border-brand-blue/20">
                            {v.platform}
                          </span>
                          <span className="text-[10px] text-text-secondary bg-card-elevated px-2 py-0.5 rounded-full border border-border-subtle">
                            {v.category}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-text-primary leading-snug group-hover:text-brand-blue transition-colors">
                          {v.title}
                        </h4>
                        <p className="text-xs text-text-secondary">
                          Kreator: <strong className="text-text-primary">{v.creator}</strong> ({v.handle})
                        </p>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 pl-11 sm:pl-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle/50">
                      <div className="text-sm font-bold text-brand-blue font-mono">
                        +{formatPoints(v.points)} Poin
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {formatViews(v.views)} verified views
                      </div>
                    </div>
                  </Card>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
