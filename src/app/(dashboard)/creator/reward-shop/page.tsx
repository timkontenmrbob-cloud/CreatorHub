"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { fetchRewardsCatalog, redeemReward } from "@/lib/supabase/rewards";
import { fetchWalletSummary } from "@/lib/supabase/wallet";
import { Reward } from "@/lib/types/reward";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RewardCatalogCard } from "@/components/rewards/reward-catalog-card";
import {
  Coins,
  Gift,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Sparkles,
  MapPin,
  Phone,
  Package,
  Truck,
  X,
} from "lucide-react";
import { formatPoints } from "@/lib/utils";

export default function RewardShopPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);

  // Detail Modal state
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [formError, setFormError] = useState("");

  // Confirmation Dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Success Dialog state
  const [successInfo, setSuccessInfo] = useState<{
    rewardName: string;
    pointsSpent: number;
    remainingBalance: number;
  } | null>(null);

  // Image load error fallback state
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchRewardsCatalog(),
      user?.uid ? fetchWalletSummary(user.uid) : Promise.resolve(null),
    ])
      .then(([catalog, wallet]) => {
        if (!active) return;
        setRewards(catalog);
        if (wallet) {
          setAvailablePoints(wallet.availablePoints);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading reward shop data:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const handleOpenDetail = (reward: Reward) => {
    setSelectedReward(reward);
    setFormError("");
    setShippingAddress("");
    setRecipientName(user?.displayName || "");
    if (user?.phoneNumber) {
      setContactWhatsapp(user.phoneNumber);
    }
  };

  const handleProceedToConfirm = () => {
    if (!selectedReward) return;

    if (availablePoints < selectedReward.requiredPoin) {
      setFormError("Saldo poinmu tidak mencukupi untuk menukar reward ini.");
      return;
    }

    if (selectedReward.rewardType === "merchandise") {
      if (!recipientName.trim()) {
        setFormError("Nama lengkap penerima wajib diisi.");
        return;
      }
      if (!shippingAddress.trim()) {
        setFormError("Alamat lengkap pengiriman wajib diisi untuk reward merchandise.");
        return;
      }
      if (!contactWhatsapp.trim()) {
        setFormError("Nomor WhatsApp aktif wajib diisi.");
        return;
      }
    }

    setFormError("");
    setConfirmOpen(true);
  };

  const handleConfirmRedemption = async () => {
    if (!selectedReward || !user?.uid) return;

    setSubmitting(true);
    setFormError("");

    try {
      const idempotencyKey = `redeem_${user.uid}_${selectedReward.id}_${Date.now()}`;
      const res = await redeemReward({
        creatorId: user.uid,
        rewardId: selectedReward.id,
        recipientName: recipientName.trim() || undefined,
        shippingAddress: shippingAddress.trim() || undefined,
        contactWhatsapp: contactWhatsapp.trim() || undefined,
        idempotencyKey,
      });

      // Update local available points
      setAvailablePoints(res.remainingBalance);
      setSuccessInfo({
        rewardName: res.rewardName,
        pointsSpent: res.pointsSpent,
        remainingBalance: res.remainingBalance,
      });

      // Close confirm and detail
      setConfirmOpen(false);
      setSelectedReward(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memproses penukaran poin.";
      setFormError(msg);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Gift className="w-3 h-3" />
              Katalog Resmi
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Reward Shop
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Tukarkan akumulasi poin videomu dengan merchandise official Mr.BOB dan program beasiswa kursus Pare.
          </p>
        </div>

        {/* Creator Available Points Badge */}
        <div className="flex items-center gap-3">
          <Card className="px-4 py-2.5 bg-card-surface border-border-subtle flex items-center gap-3 rounded-2xl shadow-sm">
            <div className="p-2 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                Poin Tersedia
              </span>
              <span className="text-base sm:text-lg font-extrabold text-text-primary font-mono leading-none">
                {formatPoints(availablePoints)}{" "}
                <span className="text-xs font-normal text-text-secondary">Poin</span>
              </span>
            </div>
          </Card>

          <Link href="/creator/my-rewards">
            <Button variant="secondary" size="sm" className="text-xs gap-1.5 h-11">
              <Package className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hadiah Saya</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Compact reward catalog */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card
              key={i}
              className="flex items-center gap-3 p-3 bg-card-surface border-border-subtle rounded-2xl animate-pulse"
            >
              <div className="h-[76px] w-[76px] sm:h-20 sm:w-20 shrink-0 bg-card-elevated rounded-xl" />
              <div className="flex-1 min-w-0 space-y-4">
                <div className="h-4 bg-card-elevated rounded w-3/4" />
                <div className="h-3 bg-card-elevated rounded w-1/2" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {rewards.map((reward) => (
            <RewardCatalogCard
              key={reward.id}
              reward={reward}
              onOpenDetail={handleOpenDetail}
              variant="shop"
            />
          ))}
        </div>
      )}

      {/* REWARD DETAIL MODAL */}
      <Dialog
        isOpen={!!selectedReward}
        onClose={() => {
          setSelectedReward(null);
          setFormError("");
        }}
        hideHeader
        className="max-w-xl max-h-[90dvh] flex flex-col p-0 overflow-hidden"
      >
        {selectedReward && (
          <div className="flex flex-col h-full max-h-[90dvh] min-h-0">
            {/* Sticky Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle/80 bg-card-surface shrink-0 z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Gift className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-text-primary tracking-tight">
                  Detail Reward & Penukaran
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedReward(null);
                  setFormError("");
                }}
                className="rounded-xl p-1.5 text-text-secondary hover:text-text-primary hover:bg-card-elevated transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-5 min-h-0">
              {/* Large Image Header */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-card-elevated shrink-0 border border-border-subtle">
                {selectedReward.image && !brokenImages[selectedReward.id] ? (
                  <Image
                    src={selectedReward.image}
                    alt={selectedReward.name}
                    fill
                    className="object-cover"
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [selectedReward.id]: true }))
                    }
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-card-elevated text-text-secondary">
                    <Gift className="w-12 h-12 text-brand-blue/40 mb-2" />
                    <span className="text-xs font-semibold">Mr.BOB Kampung Inggris</span>
                  </div>
                )}
              </div>

              {/* Title & Point Requirement */}
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight">
                  {selectedReward.name}
                </h2>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-lg sm:text-xl font-extrabold text-brand-blue font-mono">
                    {formatPoints(selectedReward.requiredPoin)} Poin
                  </span>
                  <span className="text-xs text-text-secondary font-medium">• Biaya Penukaran</span>
                </div>
              </div>

              {/* Balance & Eligibility Evaluation */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  availablePoints >= selectedReward.requiredPoin
                    ? "bg-status-success/10 border-status-success/30 text-status-success"
                    : "bg-status-warning/10 border-status-warning/30 text-status-warning"
                }`}
              >
                <div className="flex items-center gap-3">
                  {availablePoints >= selectedReward.requiredPoin ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-bold block text-text-primary">
                      {availablePoints >= selectedReward.requiredPoin
                        ? "Poinmu Mencukupi!"
                        : "Poin Belum Mencukupi"}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {availablePoints >= selectedReward.requiredPoin
                        ? `Saldo aktifmu (${formatPoints(availablePoints)} Poin) cukup untuk menukar hadiah ini.`
                        : `Kurang ${formatPoints(selectedReward.requiredPoin - availablePoints)} Poin lagi untuk menukar reward ini.`}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block">
                    Saldo Kamu
                  </span>
                  <span className="text-sm font-mono font-bold text-text-primary">
                    {formatPoints(availablePoints)} Poin
                  </span>
                </div>
              </div>

              {/* Description & Terms */}
              <div className="space-y-3 text-xs leading-relaxed text-text-secondary bg-card-elevated/40 p-4 rounded-2xl border border-border-subtle/60">
                <div>
                  <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-1">
                    Deskripsi Reward
                  </h4>
                  <p>{selectedReward.description}</p>
                </div>

                {selectedReward.redemptionTerms && (
                  <div className="pt-2 border-t border-border-subtle/50">
                    <h4 className="font-bold text-text-primary uppercase tracking-wider text-[11px] mb-1">
                      Ketentuan Penukaran
                    </h4>
                    <p>{selectedReward.redemptionTerms}</p>
                  </div>
                )}
              </div>

              {/* Required Fulfillment Inputs for Merchandise */}
              {selectedReward.rewardType === "merchandise" && (
                <div className="space-y-3.5 pt-2 border-t border-border-subtle/60">
                  <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-brand-blue" />
                    <span>Data Pengiriman Merchandise</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-secondary">
                      Nama Lengkap Penerima <span className="text-status-error">*</span>
                    </label>
                    <Input
                      value={recipientName}
                      onChange={(e) => {
                        setRecipientName(e.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="Nama penerima paket"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-secondary">
                      Alamat Lengkap Pengiriman (Kota, Kecamatan, Kode Pos) <span className="text-status-error">*</span>
                    </label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => {
                        setShippingAddress(e.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="Contoh: Jl. Flamboyan No. 12, RT 02/RW 03, Tulungrejo, Pare, Kediri, Jawa Timur, 64212"
                      rows={2}
                      className="w-full text-xs rounded-xl bg-bg-secondary border border-border-subtle px-3 py-2 text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-brand-blue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-text-secondary flex items-center gap-1">
                      <Phone className="w-3 h-3 text-text-secondary" />
                      <span>Nomor WhatsApp Aktif untuk Koordinasi Resi & Ongkir <span className="text-status-error">*</span></span>
                    </label>
                    <Input
                      value={contactWhatsapp}
                      onChange={(e) => {
                        setContactWhatsapp(e.target.value);
                        if (formError) setFormError("");
                      }}
                      placeholder="08123456789"
                    />
                  </div>

                  {/* Shipping Cost Notice Banner */}
                  <div className="p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs flex items-start gap-2.5">
                    <Truck className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-text-primary block text-[11px] uppercase tracking-wider">
                        Informasi Pengiriman & Ongkir:
                      </span>
                      <p className="text-text-secondary leading-relaxed">
                        Biaya ongkir ditanggung oleh peserta dan akan diinformasikan oleh admin sesuai alamat tujuan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Error Message */}
              {formError && (
                <div className="p-3 rounded-xl bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 sm:p-5 border-t border-border-subtle bg-card-surface flex items-center justify-end gap-3 shrink-0 rounded-b-[20px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedReward(null);
                  setFormError("");
                }}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Batal
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={availablePoints < selectedReward.requiredPoin}
                onClick={handleProceedToConfirm}
                className="text-xs shadow-md shadow-brand-blue/20"
              >
                Tukarkan Poin →
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* CONFIRMATION DIALOG — "Tukarkan poinmu?" */}
      <Dialog
        isOpen={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Tukarkan poinmu?"
        className="max-w-md p-6"
      >
        {selectedReward && (
          <div className="space-y-5">
            <p className="text-xs text-text-secondary leading-relaxed">
              Kamu akan menukarkan poin untuk reward berikut. Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu.
            </p>

            <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Reward Dipilih:</span>
                <span className="font-bold text-text-primary">{selectedReward.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Poin Dibutuhkan:</span>
                <span className="font-mono font-bold text-brand-blue">
                  -{formatPoints(selectedReward.requiredPoin)} Poin
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Saldo Poin Saat Ini:</span>
                <span className="font-mono font-medium text-text-primary">
                  {formatPoints(availablePoints)} Poin
                </span>
              </div>
              <div className="pt-2 border-t border-border-subtle/50 flex justify-between items-center font-bold">
                <span className="text-text-primary">Sisa Saldo Setelah Tukar:</span>
                <span className="font-mono text-status-success">
                  {formatPoints(Math.max(0, availablePoints - selectedReward.requiredPoin))} Poin
                </span>
              </div>
            </div>

            {/* Repeat Shipping Notice in Confirmation Modal */}
            {selectedReward.rewardType === "merchandise" && (
              <div className="p-3 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs flex items-center gap-2 text-text-secondary">
                <Truck className="w-4 h-4 text-brand-blue shrink-0" />
                <p className="text-[11px] leading-relaxed">
                  <strong className="text-text-primary">Catatan Ongkir:</strong> Biaya ongkir ditanggung oleh peserta dan akan diinformasikan oleh admin sesuai alamat tujuan.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="text-xs text-text-secondary"
              >
                Batal
              </Button>

              <Button
                variant="primary"
                size="sm"
                disabled={submitting}
                onClick={handleConfirmRedemption}
                className="text-xs shadow-md shadow-brand-blue/20 gap-1.5"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Konfirmasi Penukaran</span>
                )}
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* SUCCESS CONFIRMATION MODAL */}
      <Dialog
        isOpen={!!successInfo}
        onClose={() => setSuccessInfo(null)}
        title="Berhasil! Hadiahmu sudah diajukan."
        className="max-w-md p-6"
      >
        {successInfo && (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-full bg-status-success/20 text-status-success flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">
                {successInfo.rewardName}
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Poinmu sudah digunakan dan hadiah sedang menunggu proses dari tim Mr.BOB. Kamu dapat memantau status fulfillment dan pengiriman di menu <strong>Hadiah Saya</strong>.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle flex justify-between items-center text-xs font-mono">
              <span className="text-text-secondary">Sisa Saldo Poin:</span>
              <span className="font-bold text-brand-blue">
                {formatPoints(successInfo.remainingBalance)} Poin
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccessInfo(null)}
                className="text-xs text-text-secondary"
              >
                Tutup
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSuccessInfo(null);
                  router.push("/creator/my-rewards");
                }}
                className="text-xs gap-1.5 shadow-md shadow-brand-blue/20"
              >
                <span>Lihat Hadiah Saya</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
