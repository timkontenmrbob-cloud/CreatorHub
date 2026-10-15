"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/context/auth-context";
import {
  fetchAdminRedemptions,
  processAdminRedemption,
} from "@/lib/supabase/rewards";
import {
  Redemption,
  RedemptionStatus,
  REDEMPTION_STATUS_LABELS,
} from "@/lib/types/reward";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Sparkles,
  RefreshCw,
  Phone,
  Gift,
  XCircle,
} from "lucide-react";
import { formatPoints, formatDateTimeWIB } from "@/lib/utils";

type FilterTab = "all" | RedemptionStatus;

export default function AdminRedemptionsPage() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Process Modal state
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [targetAction, setTargetAction] = useState<"processing" | "ready" | "completed" | "reject">("processing");
  const [fulfillmentNotes, setFulfillmentNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    let active = true;

    fetchAdminRedemptions(filter)
      .then((data) => {
        if (!active) return;
        setRedemptions(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading admin redemptions:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filter, refreshTrigger]);

  const handleOpenProcessModal = (red: Redemption) => {
    setSelectedRedemption(red);
    setFulfillmentNotes(red.fulfillmentNotes || "");
    setRejectionReason("");
    setActionError("");
    setActionSuccess("");

    // Default target action based on current status
    if (red.status === "pending") {
      setTargetAction("processing");
    } else if (red.status === "processing") {
      setTargetAction("ready");
    } else if (red.status === "ready") {
      setTargetAction("completed");
    } else {
      setTargetAction("completed");
    }
  };

  const handleExecuteProcess = async () => {
    if (!selectedRedemption || !user?.uid) return;

    if (targetAction === "reject" && !rejectionReason.trim()) {
      setActionError("Alasan penolakan wajib diisi untuk mengembalikan poin ke kreator.");
      return;
    }

    setSubmitting(true);
    setActionError("");

    try {
      const res = await processAdminRedemption({
        redemptionId: selectedRedemption.id,
        adminId: user.uid,
        action: targetAction,
        fulfillmentNotes: fulfillmentNotes.trim() || undefined,
        rejectionReason: targetAction === "reject" ? rejectionReason.trim() : undefined,
      });

      setActionSuccess(res.message);
      setTimeout(() => {
        setSelectedRedemption(null);
        setRefreshTrigger((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses permohonan penukaran.";
      setActionError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: Redemption["status"]) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-semibold">
            <Clock className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.pending}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="warning" size="sm" className="gap-1 font-semibold bg-amber-500/20 text-amber-300 border-amber-500/30">
            <Truck className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.processing}
          </Badge>
        );
      case "ready":
        return (
          <Badge variant="brand" size="sm" className="gap-1 font-semibold">
            <Sparkles className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.ready}
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="success" size="sm" className="gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.completed}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="error" size="sm" className="gap-1 font-semibold">
            <XCircle className="w-3 h-3" />
            {REDEMPTION_STATUS_LABELS.rejected}
          </Badge>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const pendingCount = redemptions.filter((r) => r.status === "pending").length;
  const processingCount = redemptions.filter((r) => r.status === "processing").length;
  const readyCount = redemptions.filter((r) => r.status === "ready").length;
  const completedCount = redemptions.filter((r) => r.status === "completed").length;

  if (!isAdmin && !loading) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-status-error">Akses Ditolak</h2>
        <p className="text-sm text-text-secondary mt-1">Halaman ini hanya dapat diakses oleh Administrator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <FileCheck2 className="w-3 h-3" />
              Fulfillment Portal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Manajemen Penukaran Hadiah
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Proses permohonan klaim reward dari kreator, input resi paket fisik, dan aktivasi kode voucher kursus.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setRefreshTrigger((prev) => prev + 1);
            }}
            disabled={loading}
            className="text-xs text-text-secondary hover:text-text-primary gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Perbarui</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-card-surface border border-border-subtle text-xs">
        <button
          onClick={() => setFilter("all")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "all"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Semua ({redemptions.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "pending"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Menunggu Diproses ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("processing")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "processing"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Sedang Diproses ({processingCount})
        </button>
        <button
          onClick={() => setFilter("ready")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "ready"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Siap Digunakan ({readyCount})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "completed"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Selesai ({completedCount})
        </button>
        <button
          onClick={() => setFilter("rejected")}
          className={`px-3.5 py-1.5 rounded-xl font-medium transition-colors ${
            filter === "rejected"
              ? "bg-brand-blue text-white font-semibold"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Ditolak
        </button>
      </div>

      {/* Redemptions Queue Table */}
      {loading ? (
        <Card className="p-8 text-center bg-card-surface border-border-subtle rounded-2xl animate-pulse">
          <p className="text-xs text-text-secondary">Memuat antrean penukaran hadiah...</p>
        </Card>
      ) : redemptions.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Tidak ada permohonan penukaran"
          description="Belum ada data penukaran hadiah untuk filter status ini."
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card-surface shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-subtle/80 bg-card-elevated/50 text-text-secondary font-semibold">
                <th className="py-3.5 px-4">Kreator</th>
                <th className="py-3.5 px-4">Hadiah Ditukar</th>
                <th className="py-3.5 px-4">Poin</th>
                <th className="py-3.5 px-4">Tanggal Klaim</th>
                <th className="py-3.5 px-4">Status Fulfillment</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40">
              {redemptions.map((red) => (
                <tr
                  key={red.id}
                  className="hover:bg-card-elevated/30 transition-colors"
                >
                  {/* Creator Identity */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        src={red.creatorAvatar || undefined}
                        name={red.creatorName || "Creator"}
                        size="sm"
                        className="rounded-full border border-border-subtle"
                      />
                      <div className="min-w-0">
                        <span className="font-bold text-text-primary block truncate max-w-[140px]">
                          {red.creatorName || "Creator"}
                        </span>
                        <span className="text-[11px] text-text-secondary truncate block max-w-[140px]">
                          {red.creatorEmail || "-"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Reward Name & Type */}
                  <td className="py-3.5 px-4 font-semibold text-text-primary">
                    <div>{red.rewardNameSnapshot}</div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider font-normal">
                      {red.rewardType === "merchandise"
                        ? "Merchandise Fisik"
                        : red.rewardType === "voucher"
                        ? "Voucher Digital"
                        : "Program Beasiswa"}
                    </span>
                  </td>

                  {/* Points */}
                  <td className="py-3.5 px-4 font-mono font-bold text-brand-blue">
                    {formatPoints(red.requiredPointsSnapshot)} Poin
                  </td>

                  {/* Requested Date */}
                  <td className="py-3.5 px-4 text-text-secondary font-mono">
                    {formatDateTimeWIB(red.requestedAt)}
                  </td>

                  {/* Status Badge & Notes preview */}
                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {getStatusBadge(red.status)}
                      {red.fulfillmentNotes && (
                        <p className="text-[10px] text-text-secondary truncate max-w-[180px]">
                          {red.fulfillmentNotes}
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant={red.status === "completed" ? "ghost" : "primary"}
                      size="sm"
                      onClick={() => handleOpenProcessModal(red)}
                      className="text-xs"
                    >
                      {red.status === "completed" ? "Lihat Detail" : "Proses Klaim"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PROCESS REDEMPTION MODAL */}
      <Dialog
        isOpen={!!selectedRedemption}
        onClose={() => !submitting && setSelectedRedemption(null)}
        title="Proses Penukaran Hadiah"
        className="max-w-xl p-6 sm:p-7"
      >
        {selectedRedemption && (
          <div className="space-y-5">
            {/* Creator & Reward Info Card */}
            <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Kreator:</span>
                <span className="font-bold text-text-primary">
                  {selectedRedemption.creatorName} ({selectedRedemption.creatorEmail})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">Hadiah:</span>
                <span className="font-bold text-brand-blue">
                  {selectedRedemption.rewardNameSnapshot} ({formatPoints(selectedRedemption.requiredPointsSnapshot)} Poin)
                </span>
              </div>

              {selectedRedemption.recipientName && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/50">
                  <span className="text-text-secondary">Nama Penerima Paket:</span>
                  <span className="font-bold text-text-primary">
                    {selectedRedemption.recipientName}
                  </span>
                </div>
              )}

              {selectedRedemption.contactWhatsapp && (
                <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/50">
                  <span className="text-text-secondary flex items-center gap-1">
                    <Phone className="w-3 h-3 text-status-success" /> WhatsApp Koordinasi Ongkir:
                  </span>
                  <a
                    href={`https://wa.me/${selectedRedemption.contactWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-status-success hover:underline font-bold"
                  >
                    {selectedRedemption.contactWhatsapp} ↗
                  </a>
                </div>
              )}

              {selectedRedemption.shippingAddress && (
                <div className="text-xs pt-1 border-t border-border-subtle/50 space-y-1">
                  <span className="text-text-secondary block mb-0.5">Alamat Pengiriman Merchandise:</span>
                  <p className="text-text-primary bg-bg-secondary p-2 rounded-xl text-[11px] leading-relaxed">
                    {selectedRedemption.shippingAddress}
                  </p>
                  <p className="text-[10px] text-brand-blue font-medium">
                    *Biaya ongkir ditanggung oleh peserta dan dikoordinasikan langsung via WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* State Transition Actions */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider block">
                Pilih Status Pemrosesan Baru:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetAction("processing")}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    targetAction === "processing"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500"
                      : "bg-bg-secondary text-text-secondary border-border-subtle hover:text-text-primary"
                  }`}
                >
                  Sedang Diproses
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAction("ready")}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    targetAction === "ready"
                      ? "bg-brand-blue/20 text-brand-blue border-brand-blue"
                      : "bg-bg-secondary text-text-secondary border-border-subtle hover:text-text-primary"
                  }`}
                >
                  Siap Digunakan
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAction("completed")}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    targetAction === "completed"
                      ? "bg-status-success/20 text-status-success border-status-success"
                      : "bg-bg-secondary text-text-secondary border-border-subtle hover:text-text-primary"
                  }`}
                >
                  Selesai
                </button>

                <button
                  type="button"
                  onClick={() => setTargetAction("reject")}
                  className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                    targetAction === "reject"
                      ? "bg-status-error/20 text-status-error border-status-error"
                      : "bg-bg-secondary text-text-secondary border-border-subtle hover:text-status-error"
                  }`}
                >
                  Tolak & Refund
                </button>
              </div>
            </div>

            {/* Input Fulfillment Details (Resi, Voucher code, notes) */}
            {targetAction !== "reject" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-primary block">
                  Informasi Fulfillment / Resi Pengiriman / Kode Voucher:
                </label>
                <textarea
                  value={fulfillmentNotes}
                  onChange={(e) => setFulfillmentNotes(e.target.value)}
                  placeholder="Contoh: Resi JNE: 0123456789 atau Kode Voucher: BOB250-KURSUS-Pare"
                  rows={3}
                  className="w-full text-xs rounded-xl bg-bg-secondary border border-border-subtle p-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-brand-blue"
                />
                <p className="text-[11px] text-text-secondary">
                  Catatan ini akan langsung terlihat oleh kreator di menu Hadiah Saya.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 p-3 rounded-xl bg-status-error/10 border border-status-error/30">
                <label className="text-xs font-bold text-status-error flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Alasan Penolakan (Wajib Diisi):</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Jelaskan alasan pembatalan klaim reward..."
                  rows={3}
                  className="w-full text-xs rounded-xl bg-bg-secondary border border-status-error/40 p-3 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-status-error"
                />
                <p className="text-[11px] text-text-secondary">
                  Poin yang masih dalam masa aktif 6 bulan akan secara otomatis dikembalikan ke saldo dompet kreator secara aman dan tercatat di buku besar audit.
                </p>
              </div>
            )}

            {/* Feedback messages */}
            {actionError && (
              <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-status-success/10 border border-status-success/30 text-status-success text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => setSelectedRedemption(null)}
                className="text-xs text-text-secondary"
              >
                Tutup
              </Button>

              <Button
                variant={targetAction === "reject" ? "danger" : "primary"}
                size="sm"
                disabled={submitting}
                onClick={handleExecuteProcess}
                className="text-xs gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Simpan Perubahan</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
