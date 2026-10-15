"use client";

import React, { useState } from "react";
import { QuarterlyAnalyticsData } from "@/lib/types/analytics";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Printer, FileDown, X } from "lucide-react";

interface ExecutiveSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: QuarterlyAnalyticsData;
}

export function ExecutiveSummaryModal({ isOpen, onClose, data }: ExecutiveSummaryModalProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  function handlePrint() {
    if (typeof window !== "undefined") {
      window.print();
    }
  }

  async function handleDownloadPdf() {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(
        `/api/admin/analytics/pdf?year=${data.period.year}&quarter=${data.period.quarter}`
      );
      if (!response.ok) throw new Error("Gagal mengunduh PDF.");
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `Laporan-UGC-MrBOB-${data.period.quarter}-${data.period.year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      try {
        const { generateQuarterlyPDF } = await import("@/lib/pdf/generate-quarterly-report");
        const doc = generateQuarterlyPDF(data);
        doc.save(`Laporan-UGC-MrBOB-${data.period.quarter}-${data.period.year}.pdf`);
      } catch {
        alert("Gagal mengunduh laporan PDF.");
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  const { period, previousPeriod, kpis, qoq, platformComparison, rewardCosts } = data;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      hideHeader={true}
      className="max-w-4xl max-h-[90vh] overflow-y-auto bg-bg-secondary border border-border-subtle p-6 sm:p-8 rounded-2xl print:p-0 print:border-none print:bg-white print:text-black"
    >
      <div>
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 border-b border-border-subtle print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-blue" />
            <h3 className="text-base font-bold text-text-primary">
              Ringkasan Eksekutif Manajemen ({period.quarterLabel})
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold shadow-md shadow-brand-blue/20"
            >
              <FileDown className={`w-3.5 h-3.5 ${isDownloadingPdf ? "animate-bounce" : ""}`} />
              <span>{isDownloadingPdf ? "Menyiapkan PDF..." : "Download Laporan PDF"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Browser Print</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 pt-4 text-text-primary print:text-black">
          {/* Document Header */}
          <div className="border-b border-border-subtle pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  MR.BOB CREATOR HUB
                </h1>
                <p className="text-xs sm:text-sm font-semibold text-text-secondary print:text-gray-600 uppercase tracking-wider mt-0.5">
                  Laporan Kinerja Triwulan User-Generated Content (UGC)
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="font-bold text-brand-blue">{period.quarterLabel}</span>
                <p className="text-text-secondary print:text-gray-500 text-[11px]">{period.label}</p>
                <p className="text-text-secondary print:text-gray-500 text-[10px] mt-0.5">
                  Status Laporan: {data.activeSnapshot ? (data.activeSnapshot.status === "revised" ? "Revisi" : "Final") : "Draft"} • Periode: {period.isCurrentQuarter ? "Sedang Berjalan" : "Periode Berakhir"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Ringkasan KPI Utama */}
          <div>
            <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-3">
              1. Ringkasan Eksekutif & Indikator Kunci (Core KPIs)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-bg-main print:border print:border-gray-200">
                <span className="text-[10px] text-text-secondary uppercase">Total UGC Diajukan</span>
                <p className="text-lg font-black mt-0.5">{kpis.totalSubmissions}</p>
                <span className="text-[10px] text-emerald-400">
                  {kpis.approvedCount} Disetujui ({kpis.approvalRate !== null ? `${kpis.approvalRate}%` : "N/A"})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-bg-main print:border print:border-gray-200">
                <span className="text-[10px] text-text-secondary uppercase">Kreator Berpartisipasi</span>
                <p className="text-lg font-black mt-0.5">{kpis.participatingCreators}</p>
                <span className="text-[10px] text-text-secondary">Kreator unik aktif</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-main print:border print:border-gray-200">
                <span className="text-[10px] text-text-secondary uppercase">Total Verified Views</span>
                <p className="text-lg font-black mt-0.5">{kpis.totalVerifiedViews.toLocaleString("id-ID")}</p>
                <span className="text-[10px] text-text-secondary">Konten lolos audit</span>
              </div>
              <div className="p-3 rounded-xl bg-bg-main print:border print:border-gray-200">
                <span className="text-[10px] text-text-secondary uppercase">Poin UGC Diterbitkan</span>
                <p className="text-lg font-black mt-0.5">{kpis.totalPointsIssued.toLocaleString("id-ID")}</p>
                <span className="text-[10px] text-text-secondary">Poin dompet kreator</span>
              </div>
            </div>
          </div>

          {/* Section 2: Perbandingan Kuartal (QoQ) */}
          <div>
            <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-3">
              2. Perbandingan Kinerja Triwulan ({period.quarterLabel} vs {previousPeriod.quarterLabel})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-border-subtle rounded-xl overflow-hidden">
                <thead className="bg-bg-main text-[11px] font-semibold text-text-secondary">
                  <tr className="border-b border-border-subtle">
                    <th className="p-2.5">Indikator</th>
                    <th className="p-2.5 text-right">Kuartal Ini</th>
                    <th className="p-2.5 text-right">{previousPeriod.quarterLabel}</th>
                    <th className="p-2.5 text-right">Selisih</th>
                    <th className="p-2.5 text-right">Perubahan (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/50 text-[11px]">
                  <tr>
                    <td className="p-2.5 font-medium">Total Konten UGC</td>
                    <td className="p-2.5 text-right font-semibold">{qoq.submissions.current}</td>
                    <td className="p-2.5 text-right text-text-secondary">{qoq.submissions.previous}</td>
                    <td className="p-2.5 text-right">{qoq.submissions.difference}</td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.submissions.percentageChange !== null
                        ? `${qoq.submissions.percentageChange}%`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Kreator Berpartisipasi</td>
                    <td className="p-2.5 text-right font-semibold">{qoq.creators.current}</td>
                    <td className="p-2.5 text-right text-text-secondary">{qoq.creators.previous}</td>
                    <td className="p-2.5 text-right">{qoq.creators.difference}</td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.creators.percentageChange !== null
                        ? `${qoq.creators.percentageChange}%`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Total Verified Views</td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.verifiedViews.current.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right text-text-secondary">
                      {qoq.verifiedViews.previous.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right">
                      {qoq.verifiedViews.difference.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.verifiedViews.percentageChange !== null
                        ? `${qoq.verifiedViews.percentageChange}%`
                        : "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Poin UGC Diterbitkan</td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.pointsIssued.current.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right text-text-secondary">
                      {qoq.pointsIssued.previous.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right">
                      {qoq.pointsIssued.difference.toLocaleString("id-ID")}
                    </td>
                    <td className="p-2.5 text-right font-semibold">
                      {qoq.pointsIssued.percentageChange !== null
                        ? `${qoq.pointsIssued.percentageChange}%`
                        : "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Platform Performance */}
          <div>
            <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-3">
              3. Efektivitas Platform (TikTok vs Instagram Reels)
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {platformComparison.map((p) => (
                <div key={p.platform} className="p-3 rounded-xl bg-bg-main border border-border-subtle">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-text-primary">{p.platform}</span>
                    <span className="text-[10px] font-mono text-brand-blue font-semibold">
                      {p.shareOfVerifiedViews}% Views
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-text-secondary">
                    <div className="flex justify-between">
                      <span>Total Verified Views:</span>
                      <strong className="text-text-primary">
                        {p.totalVerifiedViews.toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Rata-rata Views / Video:</span>
                      <strong className="text-text-primary">
                        {p.averageViewsPerVideo.toLocaleString("id-ID")}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Approved / Submitted:</span>
                      <strong className="text-text-primary">
                        {p.approvedCount} / {p.submittedCount}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Approval Rate:</span>
                      <strong className="text-text-primary">
                        {p.approvalRate !== null ? `${p.approvalRate}%` : "N/A"}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Reward & Biaya Riil */}
          <div>
            <h2 className="text-xs font-bold text-brand-blue uppercase tracking-wider mb-3">
              4. Beban Reward & Efisiensi Biaya (CPV)
            </h2>
            <div className="p-3 rounded-xl bg-bg-main border border-border-subtle text-xs space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-text-secondary uppercase">Total Beban Kas Riil</span>
                  <p className="text-base font-bold text-text-primary">
                    Rp{rewardCosts.totalAttributableCostIdr.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase">
                    Cost per 1.000 Views (CPV)
                  </span>
                  <p className="text-base font-bold text-brand-blue">
                    {rewardCosts.costPerThousandViewsIdr !== null
                      ? `Rp${rewardCosts.costPerThousandViewsIdr.toLocaleString("id-ID")}`
                      : "Data biaya belum lengkap."}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary uppercase">Poin Reward Ditukar</span>
                  <p className="text-base font-bold text-text-primary">
                    {kpis.rewardsPointsSpent.toLocaleString("id-ID")} Poin
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Factual Management Takeaways */}
          <div className="p-4 rounded-xl bg-card-surface border border-border-subtle text-xs space-y-1.5">
            <h3 className="font-bold text-text-primary uppercase tracking-wider text-[11px]">
              Temuan Faktual Evaluasi Triwulan:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-text-secondary text-[11px]">
              <li>
                Sebanyak <strong>{kpis.participatingCreators} kreator</strong> berpartisipasi dengan total{" "}
                <strong>{kpis.totalSubmissions} video diajukan</strong> pada periode ini.
              </li>
              <li>
                Total views terverifikasi yang berhasil dicapai adalah{" "}
                <strong>{kpis.totalVerifiedViews.toLocaleString("id-ID")} views</strong> melalui{" "}
                <strong>{kpis.approvedCount} video yang disetujui</strong>.
              </li>
              <li>
                Platform dengan kontribusi views terbesar pada kuartal ini adalah{" "}
                <strong>
                  {platformComparison[0]?.shareOfVerifiedViews >= platformComparison[1]?.shareOfVerifiedViews
                    ? platformComparison[0]?.platform
                    : platformComparison[1]?.platform}
                </strong>
                .
              </li>
              <li>
                {rewardCosts.costPerThousandViewsIdr !== null ? (
                  <>
                    Efisiensi biaya riil tercatat pada{" "}
                    <strong>Rp{rewardCosts.costPerThousandViewsIdr.toLocaleString("id-ID")}</strong> per
                    1.000 verified views.
                  </>
                ) : (
                  <>Data beban kas riil kampanye belum lengkap untuk perhitungan CPV.</>
                )}
              </li>
            </ul>
          </div>

          {/* Signoff Footer */}
          <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-[10px] text-text-secondary">
            <span>
              Mr.BOB Kampung Inggris Pare • Creator Hub Analytics System • Generated:{" "}
              {new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
            </span>
            <span className="font-mono">Methodology v1.0</span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
