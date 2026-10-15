"use client";

import React, { useState } from "react";
import { ContentFormatBreakdownItem } from "@/lib/types/analytics";
import { LeaderboardVideo } from "@/lib/types/leaderboard";
import { ClassifyModal } from "./classify-modal";
import { Tag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentFormatSectionProps {
  contentFormats: ContentFormatBreakdownItem[];
  hasContentClassification: boolean;
  videos: LeaderboardVideo[];
  onRefresh: () => void;
}

export function ContentFormatSection({
  contentFormats,
  hasContentClassification,
  videos,
  onRefresh,
}: ContentFormatSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter out formats that actually have approved videos
  const activeFormats = contentFormats.filter((f) => f.approvedVideos > 0);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Analisis Format Konten
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Evaluasi format video yang paling efektif (Daily Life, Review, POV, Edukasi, dll).
          </p>
        </div>

        {videos.length > 0 && (
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-bg-main hover:bg-card-surface text-text-primary border border-border-subtle hover:border-brand-blue/50 text-xs font-semibold self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5 text-brand-blue" />
            <span>Klasifikasikan Video</span>
          </Button>
        )}
      </div>

      {/* Content Body */}
      <div className="pt-5">
        {!hasContentClassification || activeFormats.length === 0 ? (
          <div className="text-center py-10 bg-bg-main rounded-xl border border-border-subtle p-6">
            <div className="w-10 h-10 rounded-full bg-card-surface border border-border-subtle flex items-center justify-center mx-auto mb-3 text-text-secondary">
              <Tag className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-text-primary">Kategori konten belum tersedia.</h4>
            <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
              Administrator dapat menetapkan format konten untuk video yang disetujui guna menganalisis
              tipe konten yang menghasilkan views tertinggi.
            </p>
            {videos.length > 0 && (
              <Button
                size="sm"
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold"
              >
                Mulai Klasifikasi Video
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-bg-main/60">
                  <th className="py-3 px-4">Format Kategori</th>
                  <th className="py-3 px-4 text-center">Video Disetujui</th>
                  <th className="py-3 px-4 text-right">Total Verified Views</th>
                  <th className="py-3 px-4 text-right">Rata-rata Views / Video</th>
                  <th className="py-3 px-4 text-right">Pangsa Views</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {activeFormats.map((f, idx) => {
                  const isTop = idx === 0 && f.totalVerifiedViews > 0;
                  return (
                    <tr
                      key={f.category}
                      className={`hover:bg-card-surface/60 transition ${
                        isTop ? "bg-brand-blue/5 font-medium" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-text-primary">{f.category}</span>
                          {isTop && (
                            <span className="text-[10px] bg-brand-blue/10 text-brand-blue border border-brand-blue/30 px-1.5 py-0.2 rounded font-medium">
                              Format Terpopuler
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-text-primary">
                        {f.approvedVideos}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text-primary">
                        {f.totalVerifiedViews.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-text-primary">
                        {f.averageViewsPerVideo.toLocaleString("id-ID")}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-brand-blue">
                        {f.shareOfViews}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ClassifyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        videos={videos}
        onClassified={onRefresh}
      />
    </div>
  );
}
