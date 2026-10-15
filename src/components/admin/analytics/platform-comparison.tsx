"use client";

import React from "react";
import { PlatformComparisonItem } from "@/lib/types/analytics";
import { Share2, HelpCircle } from "lucide-react";

interface PlatformComparisonProps {
  platforms: PlatformComparisonItem[];
}

export function PlatformComparison({ platforms }: PlatformComparisonProps) {
  const tiktok = platforms.find((p) => p.platform === "TikTok") || {
    platform: "TikTok" as const,
    submittedCount: 0,
    approvedCount: 0,
    totalVerifiedViews: 0,
    averageViewsPerVideo: 0,
    approvalRate: null,
    shareOfVerifiedViews: 0,
  };

  const instagram = platforms.find((p) => p.platform === "Instagram Reels") || {
    platform: "Instagram Reels" as const,
    submittedCount: 0,
    approvedCount: 0,
    totalVerifiedViews: 0,
    averageViewsPerVideo: 0,
    approvalRate: null,
    shareOfVerifiedViews: 0,
  };

  const totalViews = tiktok.totalVerifiedViews + instagram.totalVerifiedViews;

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Perbandingan Platform (TikTok vs Instagram Reels)
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Analisis kontribusi views, volume konten, dan rasio persetujuan per platform.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-text-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> TikTok
          </span>
          <span className="text-text-secondary">vs</span>
          <span className="flex items-center gap-1.5 text-text-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Instagram Reels
          </span>
        </div>
      </div>

      {/* Share of Views Visual Bar */}
      <div className="pt-6 pb-2">
        <div className="flex items-center justify-between text-xs mb-2 font-medium">
          <span className="text-cyan-400 font-semibold">
            TikTok: {tiktok.shareOfVerifiedViews}% ({tiktok.totalVerifiedViews.toLocaleString("id-ID")} Views)
          </span>
          <span className="text-pink-400 font-semibold">
            Instagram: {instagram.shareOfVerifiedViews}% ({instagram.totalVerifiedViews.toLocaleString("id-ID")} Views)
          </span>
        </div>

        <div className="w-full h-3.5 bg-bg-main rounded-full overflow-hidden flex border border-border-subtle">
          <div
            className="h-full bg-cyan-400 transition-all duration-500"
            style={{ width: `${totalViews > 0 ? tiktok.shareOfVerifiedViews : 50}%` }}
            title={`TikTok: ${tiktok.shareOfVerifiedViews}%`}
          />
          <div
            className="h-full bg-pink-500 transition-all duration-500"
            style={{ width: `${totalViews > 0 ? instagram.shareOfVerifiedViews : 50}%` }}
            title={`Instagram Reels: ${instagram.shareOfVerifiedViews}%`}
          />
        </div>
      </div>

      {/* Side-by-Side Cards Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* TikTok Card */}
        <div className="bg-bg-main border border-border-subtle hover:border-cyan-500/40 rounded-xl p-4 sm:p-5 transition">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-400"></span>
              <h4 className="text-sm font-bold text-text-primary">TikTok</h4>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
              {tiktok.shareOfVerifiedViews}% Total Views
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Total Verified Views</span>
              <p className="text-lg font-black text-text-primary mt-0.5">
                {tiktok.totalVerifiedViews.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Rata-rata Views/Video</span>
              <p className="text-lg font-black text-cyan-400 mt-0.5">
                {tiktok.averageViewsPerVideo.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Video Disetujui</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">
                {tiktok.approvedCount}{" "}
                <span className="text-[11px] font-normal text-text-secondary">
                  / {tiktok.submittedCount} diajukan
                </span>
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Approval Rate</span>
              <p className="text-lg font-black text-text-primary mt-0.5">
                {tiktok.approvalRate !== null ? `${tiktok.approvalRate}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Instagram Reels Card */}
        <div className="bg-bg-main border border-border-subtle hover:border-pink-500/40 rounded-xl p-4 sm:p-5 transition">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500"></span>
              <h4 className="text-sm font-bold text-text-primary">Instagram Reels</h4>
            </div>
            <span className="text-[11px] font-mono text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">
              {instagram.shareOfVerifiedViews}% Total Views
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Total Verified Views</span>
              <p className="text-lg font-black text-text-primary mt-0.5">
                {instagram.totalVerifiedViews.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Rata-rata Views/Video</span>
              <p className="text-lg font-black text-pink-400 mt-0.5">
                {instagram.averageViewsPerVideo.toLocaleString("id-ID")}
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Video Disetujui</span>
              <p className="text-lg font-black text-emerald-400 mt-0.5">
                {instagram.approvedCount}{" "}
                <span className="text-[11px] font-normal text-text-secondary">
                  / {instagram.submittedCount} diajukan
                </span>
              </p>
            </div>
            <div className="p-3 bg-card-surface rounded-xl border border-border-subtle/50">
              <span className="text-[11px] text-text-secondary">Approval Rate</span>
              <p className="text-lg font-black text-text-primary mt-0.5">
                {instagram.approvalRate !== null ? `${instagram.approvalRate}%` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytical Note */}
      <div className="mt-4 p-3 rounded-xl bg-bg-main border border-border-subtle/50 flex items-start gap-2 text-xs text-text-secondary">
        <HelpCircle className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
        <span>
          <strong className="text-text-primary">Catatan Analitis:</strong> Total views yang lebih
          tinggi pada salah satu platform harus dievaluasi bersamaan dengan volume konten dan rata-rata
          views per video untuk mengukur efektivitas kampanye secara objektif.
        </span>
      </div>
    </div>
  );
}
