"use client";

import React from "react";
import { CoreKPIs, QoQMetric } from "@/lib/types/analytics";
import {
  Film,
  Users,
  Eye,
  Coins,
  CheckCircle2,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

interface KPICardsProps {
  kpis: CoreKPIs;
  qoq: {
    submissions: QoQMetric<number>;
    creators: QoQMetric<number>;
    approvedVideos: QoQMetric<number>;
    verifiedViews: QoQMetric<number>;
    pointsIssued: QoQMetric<number>;
    rewardsClaimed: QoQMetric<number>;
  };
  previousQuarterLabel: string;
}

export function KPICards({ kpis, qoq, previousQuarterLabel }: KPICardsProps) {
  function renderQoQBadge(metric: QoQMetric<number>, isPointsOrCost = false) {
    if (metric.percentageChange === null) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-text-secondary bg-bg-main px-2 py-0.5 rounded-md border border-border-subtle font-medium">
          <Minus className="w-3 h-3 text-text-secondary" />
          <span>N/A (Kuartal lalu: 0)</span>
        </span>
      );
    }

    const isPositive = metric.difference > 0;
    const isNegative = metric.difference < 0;

    // For general metrics (views, creators, submissions), positive growth is green.
    // For points/costs, positive growth is informative (blue/amber), negative is neutral.
    const colorClass = isPointsOrCost
      ? isPositive
        ? "text-brand-blue bg-brand-blue/10 border-brand-blue/30"
        : "text-text-secondary bg-bg-main border-border-subtle"
      : isPositive
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
      : isNegative
      ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
      : "text-text-secondary bg-bg-main border-border-subtle";

    const Icon = isPositive ? ArrowUpRight : isNegative ? ArrowDownRight : Minus;

    return (
      <span
        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${colorClass}`}
        title={`Kuartal Lalu (${previousQuarterLabel}): ${metric.previous.toLocaleString("id-ID")}`}
      >
        <Icon className="w-3 h-3" />
        <span>
          {isPositive ? "+" : ""}
          {metric.percentageChange}%
        </span>
      </span>
    );
  }

  const cards = [
    {
      title: "Total Konten UGC",
      value: kpis.totalSubmissions.toLocaleString("id-ID"),
      qoq: renderQoQBadge(qoq.submissions),
      icon: Film,
      subtext: (
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <span className="text-emerald-400 font-medium">{kpis.approvedCount} Disetujui</span>
          <span>•</span>
          <span className="text-rose-400 font-medium">{kpis.rejectedCount} Ditolak</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">{kpis.pendingCount} Review</span>
        </div>
      ),
      note: "Berdasarkan tanggal pengajuan (submitted_at)",
    },
    {
      title: "Creator Berpartisipasi",
      value: kpis.participatingCreators.toLocaleString("id-ID"),
      qoq: renderQoQBadge(qoq.creators),
      icon: Users,
      subtext: (
        <span className="text-[11px] text-text-secondary">
          Kreator unik yang mengajukan minimal 1 video
        </span>
      ),
      note: "Dihitung 1 kali per kreator unik",
    },
    {
      title: "Total Verified Views",
      value: kpis.totalVerifiedViews.toLocaleString("id-ID"),
      qoq: renderQoQBadge(qoq.verifiedViews),
      icon: Eye,
      subtext: (
        <span className="text-[11px] text-text-secondary">
          Akumulasi views video disetujui
        </span>
      ),
      note: "Sesuai posting date video yang terverifikasi",
    },
    {
      title: "Total Poin Diterbitkan",
      value: `${kpis.totalPointsIssued.toLocaleString("id-ID")} Poin`,
      qoq: renderQoQBadge(qoq.pointsIssued, true),
      icon: Coins,
      subtext: (
        <span className="text-[11px] text-text-secondary">
          Diterbitkan ke dompet kreator (views UGC)
        </span>
      ),
      note: "Eksklusif poin reward konten riil",
    },
    {
      title: "Approval Rate",
      value: kpis.approvalRate !== null ? `${kpis.approvalRate}%` : "N/A",
      qoq: (
        <span className="text-[11px] text-text-secondary bg-bg-main px-2 py-0.5 rounded-md border border-border-subtle font-medium">
          {kpis.pendingCount > 0 ? `${kpis.pendingCount} Dalam Review` : "Semua Diputuskan"}
        </span>
      ),
      icon: CheckCircle2,
      subtext: (
        <span className="text-[11px] text-text-secondary">
          Rasio: Disetujui / (Disetujui + Ditolak)
        </span>
      ),
      note: "Tidak menghitung kasus yang masih pending",
    },
    {
      title: "Total Reward Diklaim",
      value: kpis.totalRewardsClaimed.toLocaleString("id-ID"),
      qoq: renderQoQBadge(qoq.rewardsClaimed, true),
      icon: Gift,
      subtext: (
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <span className="text-emerald-400 font-medium">{kpis.rewardsCompletedCount} Selesai</span>
          <span>•</span>
          <span className="text-amber-400 font-medium">{kpis.rewardsPendingCount} Proses</span>
          <span>•</span>
          <span className="text-rose-400 font-medium">{kpis.rewardsRejectedCount} Batal</span>
        </div>
      ),
      note: `${kpis.rewardsPointsSpent.toLocaleString("id-ID")} poin ditukarkan`,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-brand-blue/30 transition-all duration-150 flex flex-col justify-between"
          >
            <div>
              {/* Header: Title & Icon */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="p-2 rounded-xl bg-card-surface border border-border-subtle text-brand-blue">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Main Value & QoQ Badge */}
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                  {card.value}
                </span>
                {card.qoq}
              </div>

              {/* Subtext */}
              <div className="mt-1">{card.subtext}</div>
            </div>

            {/* Micro Note */}
            <div className="mt-4 pt-3 border-t border-border-subtle/50 text-[10px] text-text-secondary/70">
              {card.note}
            </div>
          </div>
        );
      })}
    </div>
  );
}
