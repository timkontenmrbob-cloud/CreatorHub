"use client";

import React, { useState } from "react";
import { QuarterlySnapshot, QuarterPeriod } from "@/lib/types/analytics";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ShieldCheck, History, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface SnapshotBannerProps {
  period: QuarterPeriod;
  snapshots: QuarterlySnapshot[];
  activeSnapshot?: QuarterlySnapshot | null;
  onSnapshotSaved: () => void;
}

export function SnapshotBanner({
  period,
  snapshots,
  activeSnapshot,
  onSnapshotSaved,
}: SnapshotBannerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasFinalized = Boolean(activeSnapshot);
  const currentVersion = activeSnapshot ? activeSnapshot.version : 0;
  const isRevision = hasFinalized;

  async function handleFinalize() {
    if (isRevision && !revisionReason.trim()) {
      setErrorMsg("Alasan revisi resmi wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "finalize_snapshot",
          year: period.year,
          quarter: period.quarter,
          revisionReason: isRevision ? revisionReason.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memfinalisasi snapshot.");
      }

      onSnapshotSaved();
      setIsModalOpen(false);
      setRevisionReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="bg-bg-secondary border border-border-subtle rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border mt-0.5 shrink-0 ${
                hasFinalized
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
            >
              {hasFinalized ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-text-primary">
                  {hasFinalized
                    ? `Snapshot Resmi ${period.quarterLabel} (Versi ${activeSnapshot?.version})`
                    : `Status Laporan: Draft (${period.quarterLabel})`}
                </h4>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    !hasFinalized
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : activeSnapshot?.status === "revised"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {!hasFinalized || !activeSnapshot
                    ? "Draft"
                    : activeSnapshot.status === "revised"
                    ? `Revisi (v${activeSnapshot.version})`
                    : `Final (v${activeSnapshot.version})`}
                </span>
              </div>

              <p className="text-xs text-text-secondary mt-1">
                {hasFinalized ? (
                  <>
                    Laporan resmi telah difinalisasi dan dibekukan pada{" "}
                    <span className="font-mono text-text-primary">
                      {new Date(activeSnapshot!.cutoffAt).toLocaleString("id-ID", {
                        timeZone: "Asia/Jakarta",
                      })}{" "}
                      WIB
                    </span>
                    . {activeSnapshot?.revisionReason && `Catatan: ${activeSnapshot.revisionReason}`}
                  </>
                ) : period.isCurrentQuarter ? (
                  <>
                    Periode kalender masih berjalan. Angka laporan saat ini berstatus <strong>Draft</strong> dan
                    dihitung secara real-time dari data operasional harian.
                  </>
                ) : (
                  <>
                    Periode kalender telah berakhir. Angka laporan saat ini berstatus <strong>Draft</strong> hingga
                    manajemen melakukan finalisasi laporan resmi kuartal ini.
                  </>
                )}
              </p>

              {snapshots.length > 1 && (
                <div className="flex items-center gap-2 mt-2 text-[11px] text-text-secondary">
                  <History className="w-3.5 h-3.5 text-brand-blue" />
                  <span>
                    Riwayat: {snapshots.length} versi snapshot tersimpan (v1 s.d. v
                    {snapshots[0].version})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className={`text-xs font-semibold ${
                hasFinalized
                  ? "bg-bg-main hover:bg-card-surface text-text-primary border border-border-subtle"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
            >
              {hasFinalized ? "Buat Revisi Resmi" : "Finalisasi Laporan Kuartal"}
            </Button>
          </div>
        </div>
      </div>

      {/* Finalize / Revise Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          isRevision
            ? `Revisi Snapshot ${period.quarterLabel} (Menjadi Versi ${currentVersion + 1})`
            : `Finalisasi Laporan ${period.quarterLabel}`
        }
        description={
          isRevision
            ? "Menyimpan snapshot versi baru dengan mempertahankan riwayat versi sebelumnya untuk audit."
            : "Membekukan angka kinerja kuartal ini ke dalam snapshot resmi yang tidak dapat diubah tanpa proses revisi."
        }
        className="max-w-md bg-bg-secondary border border-border-subtle"
      >
        <div className="space-y-4 my-2 text-xs">
            {period.isProvisional && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Peringatan:</strong> Kuartal {period.quarterLabel} saat ini masih berjalan.
                  Biasanya finalisasi dilakukan setelah periode kuartal berakhir secara kalender.
                </span>
              </div>
            )}

            {isRevision && (
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Alasan Revisi Resmi (Wajib)
                </label>
                <textarea
                  rows={3}
                  placeholder="Contoh: Penyesuaian verifikasi views terlambat untuk 2 video approved"
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  className="w-full bg-bg-main border border-border-subtle rounded-xl p-3 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            )}

            {errorMsg && (
              <p className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30">
                {errorMsg}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>{isRevision ? "Simpan Revisi" : "Konfirmasi Finalisasi"}</span>
              )}
            </Button>
          </div>
      </Dialog>
    </>
  );
}
