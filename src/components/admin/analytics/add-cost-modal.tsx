"use client";

import React, { useState } from "react";
import { QuarterName, CampaignCostCategory, CAMPAIGN_COST_CATEGORY_LABELS } from "@/lib/types/analytics";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AddCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  quarter: QuarterName;
  onCostAdded: () => void;
}

export function AddCostModal({ isOpen, onClose, year, quarter, onCostAdded }: AddCostModalProps) {
  const [category, setCategory] = useState<CampaignCostCategory>("merchandise");
  const [description, setDescription] = useState("");
  const [amountIdr, setAmountIdr] = useState<string>("");
  const [expenseDate, setExpenseDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountIdr);

    if (!description.trim()) {
      setErrorMsg("Deskripsi pengeluaran wajib diisi.");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setErrorMsg("Nominal pengeluaran harus berupa angka lebih besar dari Rp0.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_cost",
          year,
          quarter,
          category,
          description: description.trim(),
          amountIdr: amount,
          expenseDate,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mencatat biaya.");
      }

      onCostAdded();
      onClose();
      setDescription("");
      setAmountIdr("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Catat Beban Kampanye Riil (${quarter} ${year})`}
      description="Catatkan pengeluaran kas riil perusahaan untuk reward atau operasional UGC."
      className="max-w-md bg-bg-secondary border border-border-subtle"
    >
      <form onSubmit={handleSubmit} className="space-y-4 my-2">
          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Kategori Pengeluaran
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CampaignCostCategory)}
              className="w-full bg-bg-main border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {(Object.keys(CAMPAIGN_COST_CATEGORY_LABELS) as CampaignCostCategory[]).map((k) => (
                <option key={k} value={k}>
                  {CAMPAIGN_COST_CATEGORY_LABELS[k]}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Deskripsi Pengeluaran
            </label>
            <input
              type="text"
              placeholder="Contoh: Produksi 150 pcs T-shirt official Mr.BOB"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-bg-main border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {/* Nominal IDR */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Nominal Riil (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-text-secondary">
                Rp
              </span>
              <input
                type="number"
                min="1000"
                step="1000"
                placeholder="0"
                value={amountIdr}
                onChange={(e) => setAmountIdr(e.target.value)}
                className="w-full bg-bg-main border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <span className="text-[10px] text-text-secondary/70 block mt-1">
              Catat biaya riil (COGS / beban kas), bukan nilai nominal voucher atau harga jual kelas.
            </span>
          </div>

          {/* Expense Date */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1">
              Tanggal Pengeluaran
            </label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-bg-main border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>

          {errorMsg && (
            <p className="text-xs p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Pengeluaran</span>
              )}
            </Button>
          </div>
        </form>
    </Dialog>
  );
}
