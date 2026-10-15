"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  QuarterName,
  QuarterlyAnalyticsData,
} from "@/lib/types/analytics";
import { getLatestCompletedQuarter } from "@/lib/supabase/analytics";
import { PeriodSelector } from "@/components/admin/analytics/period-selector";
import { KPICards } from "@/components/admin/analytics/kpi-cards";
import { MonthlyChart } from "@/components/admin/analytics/monthly-chart";
import { PlatformComparison } from "@/components/admin/analytics/platform-comparison";
import { TopRankings } from "@/components/admin/analytics/top-rankings";
import { ContentFormatSection } from "@/components/admin/analytics/content-format-section";
import { CampaignCostSection } from "@/components/admin/analytics/campaign-cost-section";
import { SnapshotBanner } from "@/components/admin/analytics/snapshot-banner";
import { ExecutiveSummaryModal } from "@/components/admin/analytics/executive-summary-modal";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  FileText,
  FileDown,
  RefreshCw,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function AdminAnalyticsPage() {
  // Default to the latest completed quarter (e.g. Q3 2026 if today is in Q4)
  const defaultQuarter = getLatestCompletedQuarter();
  const [year, setYear] = useState<number>(defaultQuarter.year);
  const [quarter, setQuarter] = useState<QuarterName>(defaultQuarter.quarter);

  const [data, setData] = useState<QuarterlyAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const loadData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);
      setError(null);

      const res = await fetch(`/api/admin/analytics?year=${year}&quarter=${quarter}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memuat data analitik.");
      }

      setData(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat memuat analitik.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [year, quarter]);

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/analytics?year=${year}&quarter=${quarter}`)
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && json.data) {
          setData(json.data);
          setError(null);
        } else {
          setError(json.error || "Gagal memuat data analitik.");
        }
      })
      .catch((err) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Gagal memuat data.";
        setError(msg);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [year, quarter]);

  function handlePeriodChange(newYear: number, newQuarter: QuarterName) {
    setYear(newYear);
    setQuarter(newQuarter);
  }

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  async function handleDownloadPdf() {
    if (!data) return;
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/admin/analytics/pdf?year=${year}&quarter=${quarter}`);
      if (!response.ok) {
        throw new Error("Gagal mengunduh laporan PDF.");
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Laporan-UGC-MrBOB-${quarter}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error("Server PDF download failed, using client fallback:", err);
      try {
        const { generateQuarterlyPDF } = await import("@/lib/pdf/generate-quarterly-report");
        const doc = generateQuarterlyPDF(data);
        doc.save(`Laporan-UGC-MrBOB-${quarter}-${year}.pdf`);
      } catch {
        alert("Gagal mengunduh laporan PDF. Silakan coba kembali.");
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              UGC Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Evaluasi berkala performa kampanye UGC per triwulan (Q1, Q2, Q3, Q4) berbasis data riil.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Segarkan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSummaryOpen(true)}
            disabled={!data || isLoading}
            className="flex items-center gap-1.5 text-xs font-semibold"
          >
            <FileText className="w-3.5 h-3.5 text-brand-blue" />
            <span>Ringkasan Eksekutif</span>
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={!data || isLoading || isDownloadingPdf}
            className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold shadow-md shadow-brand-blue/20"
          >
            <FileDown className={`w-3.5 h-3.5 ${isDownloadingPdf ? "animate-bounce" : ""}`} />
            <span>{isDownloadingPdf ? "Menyiapkan PDF..." : "Download Laporan PDF"}</span>
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      {data && (
        <PeriodSelector
          selectedYear={year}
          selectedQuarter={quarter}
          period={data.period}
          onSelectPeriod={handlePeriodChange}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20 bg-bg-secondary rounded-2xl border border-border-subtle">
          <Loader2 className="w-8 h-8 text-brand-blue animate-spin mb-3" />
          <p className="text-sm font-semibold text-text-primary">Menghitung Data Analitik Kuartalan...</p>
          <span className="text-xs text-text-secondary mt-1">
            Mengolah data submission, verified views, poin, dan biaya riil
          </span>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold">Gagal Memuat Analitik</h4>
            <p className="text-xs mt-1">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadData()}
              className="mt-3 text-xs border-rose-500/40 text-rose-300 hover:bg-rose-500/20"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      )}

      {/* Main Dashboard Content */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* 1. Snapshot & Finalization Status Banner */}
          <SnapshotBanner
            period={data.period}
            snapshots={data.snapshots}
            activeSnapshot={data.activeSnapshot}
            onSnapshotSaved={() => loadData(true)}
          />

          {/* 2. Primary 6 KPI Cards with QoQ */}
          <KPICards
            kpis={data.kpis}
            qoq={data.qoq}
            previousQuarterLabel={data.previousPeriod.quarterLabel}
          />

          {/* 3. Monthly Performance Breakdown */}
          <MonthlyChart
            monthlyData={data.monthlyBreakdown}
            quarterLabel={data.period.quarterLabel}
          />

          {/* 4. Platform Performance (TikTok vs Instagram Reels) */}
          <PlatformComparison platforms={data.platformComparison} />

          {/* 5. Top 10 Creators & Top 10 Videos */}
          <TopRankings
            creators={data.topCreators}
            videos={data.topVideos}
            quarterLabel={data.period.quarterLabel}
          />

          {/* 6. Content Format Analysis */}
          <ContentFormatSection
            contentFormats={data.contentFormats}
            hasContentClassification={data.hasContentClassification}
            videos={data.topVideos}
            onRefresh={() => loadData(true)}
          />

          {/* 7. Reward & Campaign Cost Analysis (CPV) */}
          <CampaignCostSection
            costSummary={data.rewardCosts}
            kpis={data.kpis}
            year={year}
            quarter={quarter}
            onRefresh={() => loadData(true)}
          />

          {/* Executive Summary Modal */}
          <ExecutiveSummaryModal
            isOpen={isSummaryOpen}
            onClose={() => setIsSummaryOpen(false)}
            data={data}
          />
        </div>
      )}
    </div>
  );
}
