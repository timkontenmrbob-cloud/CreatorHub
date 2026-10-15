"use client";

import React, { useState } from "react";
import Link from "next/link";
import { QuarterName } from "@/lib/types/analytics";
import { Button } from "@/components/ui/button";
import {
  FileText,
  FileDown,
  BarChart3,
  Calendar,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export default function AdminReportsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [downloadingPdfKey, setDownloadingPdfKey] = useState<string | null>(null);

  const quarters: { key: QuarterName; label: string; period: string }[] = [
    { key: "Q1", label: "Kuartal 1 (Q1)", period: "1 Januari – 31 Maret" },
    { key: "Q2", label: "Kuartal 2 (Q2)", period: "1 April – 30 Juni" },
    { key: "Q3", label: "Kuartal 3 (Q3)", period: "1 Juli – 30 September" },
    { key: "Q4", label: "Kuartal 4 (Q4)", period: "1 Oktober – 31 Desember" },
  ];

  async function handleDownloadPdf(q: QuarterName) {
    setDownloadingPdfKey(q);
    try {
      const response = await fetch(`/api/admin/analytics/pdf?year=${selectedYear}&quarter=${q}`);
      if (!response.ok) throw new Error("Gagal mengunduh PDF.");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Laporan-UGC-MrBOB-${q}-${selectedYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      alert("Gagal mengunduh laporan PDF. Silakan coba kembali.");
    } finally {
      setDownloadingPdfKey(null);
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Reports & Data Export
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Pusat unduh laporan resmi kuartalan berformat CSV/Excel dan arsip snapshot manajemen.
          </p>
        </div>

        <Link href="/admin/analytics">
          <Button
            size="sm"
            className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Buka UGC Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* Year Selector */}
      <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-brand-blue" />
          <span className="text-xs sm:text-sm font-semibold text-text-primary">
            Pilih Tahun Anggaran / Laporan:
          </span>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="bg-bg-main border border-border-subtle rounded-xl px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue cursor-pointer"
        >
          <option value={2026}>Tahun 2026</option>
          <option value={2025}>Tahun 2025</option>
        </select>
      </div>

      {/* Quarters Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarters.map((q) => (
          <div
            key={q.key}
            className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 shadow-sm hover:border-brand-blue/40 transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-text-primary">{q.label}</span>
                <span className="text-[10px] font-mono text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-md border border-brand-blue/20">
                  {selectedYear}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{q.period} {selectedYear}</p>
              <p className="text-[11px] text-text-secondary/70 mt-2">
                Meliputi: KPI Utama, QoQ, Rincian Platform, Top Kreator & Video, Format Konten, serta Biaya Riil.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-border-subtle">
              <Button
                size="sm"
                onClick={() => handleDownloadPdf(q.key)}
                disabled={downloadingPdfKey === q.key}
                className="w-full flex items-center justify-center gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold shadow-md shadow-brand-blue/20"
              >
                <FileDown className={`w-3.5 h-3.5 ${downloadingPdfKey === q.key ? "animate-bounce" : ""}`} />
                <span>{downloadingPdfKey === q.key ? "Menyiapkan PDF..." : "Download Laporan PDF"}</span>
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Snapshot & Methodology Explainer */}
      <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-card-surface border border-border-subtle text-brand-blue mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Integritas & Reproduksibilitas Data Ekspor
            </h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Seluruh ekspor dihasilkan langsung dari data operasional terverifikasi dengan encoding UTF-8 (BOM).
              Jika suatu kuartal telah difinalisasi pada modul UGC Analytics, snapshot angka resmi tetap terkunci
              dan terdokumentasikan dalam riwayat versi audit untuk mencegah perubahan angka historis yang tidak sah.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
