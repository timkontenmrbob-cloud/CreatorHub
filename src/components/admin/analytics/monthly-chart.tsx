"use client";

import React, { useState } from "react";
import { MonthlyBreakdownItem } from "@/lib/types/analytics";
import { BarChart3, Film, Eye, Users, Coins } from "lucide-react";

interface MonthlyChartProps {
  monthlyData: MonthlyBreakdownItem[];
  quarterLabel: string;
}

type MetricKey = "views" | "submissions" | "creators" | "points";

export function MonthlyChart({ monthlyData, quarterLabel }: MonthlyChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("views");

  const metricConfigs: Record<
    MetricKey,
    {
      label: string;
      icon: React.ElementType;
      unit: string;
      color: string;
      barColor: string;
      getValue: (m: MonthlyBreakdownItem) => number;
      dateAttribution: string;
    }
  > = {
    views: {
      label: "Verified Views",
      icon: Eye,
      unit: "Views",
      color: "text-brand-blue",
      barColor: "bg-brand-blue",
      getValue: (m) => m.verifiedViews,
      dateAttribution: "Berdasarkan tanggal publikasi konten (posting date)",
    },
    submissions: {
      label: "Video Diajukan",
      icon: Film,
      unit: "Video",
      color: "text-emerald-400",
      barColor: "bg-emerald-500",
      getValue: (m) => m.submittedVideos,
      dateAttribution: "Berdasarkan tanggal pembuatan submission (submitted_at)",
    },
    creators: {
      label: "Kreator Aktif",
      icon: Users,
      unit: "Kreator",
      color: "text-amber-400",
      barColor: "bg-amber-500",
      getValue: (m) => m.participatingCreators,
      dateAttribution: "Kreator unik yang mengirimkan submission pada bulan tersebut",
    },
    points: {
      label: "Poin Diterbitkan",
      icon: Coins,
      unit: "Poin",
      color: "text-purple-400",
      barColor: "bg-purple-500",
      getValue: (m) => m.pointsIssued,
      dateAttribution: "Berdasarkan tanggal penerbitan poin reward (issued_at)",
    },
  };

  const currentConfig = metricConfigs[activeMetric];

  // Calculate maximum for scaling the visual bars
  const values = monthlyData.map((m) => currentConfig.getValue(m));
  const maxValue = Math.max(...values, 1);
  const totalQuarter = values.reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Header & Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Kinerja Bulanan ({quarterLabel})
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Rincian perkembangan 3 bulan dalam kuartal terpilih.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center bg-bg-main p-1 rounded-xl border border-border-subtle self-start sm:self-auto">
          {(Object.keys(metricConfigs) as MetricKey[]).map((key) => {
            const conf = metricConfigs[key];
            const Icon = conf.icon;
            const isActive = activeMetric === key;
            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-card-surface text-text-primary shadow-sm border border-border-subtle"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? conf.color : "text-text-secondary"}`} />
                <span>{conf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Chart Bars Section */}
      <div className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {monthlyData.map((item) => {
            const val = currentConfig.getValue(item);
            const percentage = Math.round((val / maxValue) * 100);
            const shareOfQuarter =
              totalQuarter > 0 ? Math.round((val / totalQuarter) * 100) : 0;

            return (
              <div
                key={item.monthIndex}
                className="bg-bg-main border border-border-subtle rounded-xl p-4 flex flex-col justify-between"
              >
                {/* Month Name & Year */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-text-primary">{item.monthName}</span>
                  <span className="text-[10px] text-text-secondary font-mono">
                    {shareOfQuarter}% total
                  </span>
                </div>

                {/* Big Metric Value */}
                <div className="mb-4">
                  <span className={`text-2xl font-black ${currentConfig.color}`}>
                    {val.toLocaleString("id-ID")}
                  </span>
                  <span className="text-xs text-text-secondary ml-1.5 font-medium">
                    {currentConfig.unit}
                  </span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-card-surface h-3 rounded-full overflow-hidden border border-border-subtle/50 mb-3">
                  <div
                    className={`h-full ${currentConfig.barColor} transition-all duration-500 rounded-full`}
                    style={{ width: `${Math.max(percentage, 4)}%` }}
                  />
                </div>

                {/* Submetrics list */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle/50 text-[11px] text-text-secondary">
                  <div>
                    <span className="opacity-70">Pengajuan: </span>
                    <span className="font-semibold text-text-primary">
                      {item.submittedVideos}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70">Views: </span>
                    <span className="font-semibold text-text-primary">
                      {item.verifiedViews.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70">Kreator: </span>
                    <span className="font-semibold text-text-primary">
                      {item.participatingCreators}
                    </span>
                  </div>
                  <div>
                    <span className="opacity-70">Poin: </span>
                    <span className="font-semibold text-text-primary">
                      {item.pointsIssued.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Date attribution note */}
        <div className="mt-5 p-3 rounded-xl bg-bg-main border border-border-subtle/50 flex items-center justify-between text-xs text-text-secondary">
          <span className="font-medium">
            <span className="text-brand-blue font-semibold">Atribusi Waktu:</span>{" "}
            {currentConfig.dateAttribution}
          </span>
          <span className="text-[11px] font-mono text-text-secondary/70">Asia/Jakarta (WIB)</span>
        </div>
      </div>
    </div>
  );
}
