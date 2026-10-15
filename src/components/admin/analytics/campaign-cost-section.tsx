"use client";

import React, { useState } from "react";
import {
  CostAnalysisSummary,
  CoreKPIs,
  QuarterName,
  CAMPAIGN_COST_CATEGORY_LABELS,
} from "@/lib/types/analytics";
import { AddCostModal } from "./add-cost-modal";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Plus,
  HelpCircle,
  Trash2,
  TrendingDown,
} from "lucide-react";

interface CampaignCostSectionProps {
  costSummary: CostAnalysisSummary;
  kpis: CoreKPIs;
  year: number;
  quarter: QuarterName;
  onRefresh: () => void;
}

export function CampaignCostSection({
  costSummary,
  kpis,
  year,
  quarter,
  onRefresh,
}: CampaignCostSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(costId: string) {
    if (!confirm("Hapus catatan pengeluaran ini?")) return;

    try {
      setDeletingId(costId);
      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_cost", costId }),
      });
      if (res.ok) {
        onRefresh();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-5 sm:p-6 shadow-sm">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-blue" />
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Beban Reward & Efisiensi Kampanye
            </h3>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Pencatatan pengeluaran riil perusahaan dan metrik Cost per 1.000 Verified Views (CPV).
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white text-xs font-semibold self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Catat Biaya Kampanye</span>
        </Button>
      </div>

      {/* Primary Cost & Efficiency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
        {/* Total Cost */}
        <div className="bg-bg-main border border-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Total Beban Riil Kampanye
            </span>
            <p className="text-2xl font-black text-text-primary mt-1">
              Rp{costSummary.totalAttributableCostIdr.toLocaleString("id-ID")}
            </p>
          </div>
          <span className="text-[10px] text-text-secondary/70 mt-3 pt-2 border-t border-border-subtle/50">
            {costSummary.costs.length} transaksi pengeluaran tercatat
          </span>
        </div>

        {/* CPV */}
        <div className="bg-bg-main border border-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                Cost Per 1.000 Verified Views (CPV)
              </span>
              <TrendingDown className="w-4 h-4 text-brand-blue" />
            </div>
            <p className="text-2xl font-black text-brand-blue mt-1">
              {costSummary.costPerThousandViewsIdr !== null ? (
                <>Rp{costSummary.costPerThousandViewsIdr.toLocaleString("id-ID")}</>
              ) : (
                <span className="text-sm font-medium text-amber-400">
                  Data biaya belum lengkap.
                </span>
              )}
            </p>
          </div>
          <span className="text-[10px] text-text-secondary/70 mt-3 pt-2 border-t border-border-subtle/50">
            Rumus: (Total Beban / Total Verified Views) × 1.000
          </span>
        </div>

        {/* Points Redemption Total */}
        <div className="bg-bg-main border border-border-subtle rounded-xl p-4 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
              Total Poin Ditukarkan
            </span>
            <p className="text-2xl font-black text-text-primary mt-1">
              {kpis.rewardsPointsSpent.toLocaleString("id-ID")}{" "}
              <span className="text-sm font-normal text-text-secondary">Poin</span>
            </p>
          </div>
          <div className="text-[11px] text-text-secondary mt-3 pt-2 border-t border-border-subtle/50 flex items-center justify-between">
            <span>{kpis.totalRewardsClaimed} klaim reward</span>
            <span className="text-emerald-400 font-semibold">{kpis.rewardsCompletedCount} tuntas</span>
          </div>
        </div>
      </div>

      {/* Cost Records Table */}
      <div className="mt-6">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3">
          Rincian Transaksi Pengeluaran ({quarter} {year})
        </h4>

        {costSummary.costs.length === 0 ? (
          <div className="text-center py-8 bg-bg-main rounded-xl border border-border-subtle text-xs text-text-secondary">
            Belum ada catatan biaya riil yang diinput untuk kuartal ini.
          </div>
        ) : (
          <div className="overflow-x-auto bg-bg-main rounded-xl border border-border-subtle">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle text-[11px] font-semibold text-text-secondary uppercase tracking-wider bg-bg-secondary/40">
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4">Kategori</th>
                  <th className="py-2.5 px-4">Deskripsi</th>
                  <th className="py-2.5 px-4 text-right">Nominal (IDR)</th>
                  <th className="py-2.5 px-4 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {costSummary.costs.map((c) => (
                  <tr key={c.id} className="hover:bg-card-surface/40 transition">
                    <td className="py-2.5 px-4 text-text-secondary font-mono">{c.expenseDate}</td>
                    <td className="py-2.5 px-4 font-semibold text-text-primary">
                      {CAMPAIGN_COST_CATEGORY_LABELS[c.category] || c.category}
                    </td>
                    <td className="py-2.5 px-4 text-text-primary">{c.description}</td>
                    <td className="py-2.5 px-4 text-right font-black text-text-primary">
                      Rp{c.amountIdr.toLocaleString("id-ID")}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="p-1 rounded text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Hapus biaya"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclosures & Policy Note */}
      <div className="mt-4 p-3 rounded-xl bg-bg-main border border-border-subtle/50 flex items-start gap-2 text-xs text-text-secondary">
        <HelpCircle className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" />
        <span>
          <strong className="text-text-primary">Keterbukaan Data Biaya:</strong> Biaya riil mencakup
          pembelian merchandise fisik, beban kas voucher, dan operasional langsung. Nilai voucher tidak
          disamakan dengan harga jual kursus, dan ongkos kirim yang ditanggung peserta tidak dicatat
          sebagai beban perusahaan.
        </span>
      </div>

      <AddCostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        year={year}
        quarter={quarter}
        onCostAdded={onRefresh}
      />
    </div>
  );
}
