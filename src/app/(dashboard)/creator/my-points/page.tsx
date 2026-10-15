"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import {
  fetchWalletSummary,
  fetchPointLots,
  fetchPointTransactions,
} from "@/lib/supabase/wallet";
import {
  WalletSummary,
  PointLot,
  PointTransaction,
  getDaysUntilExpiration,
} from "@/lib/types/wallet";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Coins,
  Hourglass,
  CheckCircle2,
  AlertTriangle,
  History,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Gift,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { formatPoints, formatDateTimeWIB, formatShortDateWIB } from "@/lib/utils";

function getActivityLabel(type: string): {
  label: string;
  variant: "success" | "brand" | "warning" | "error" | "neutral";
} {
  switch (type) {
    case "earned":
      return { label: "Poin Masuk", variant: "success" };
    case "redeemed":
      return { label: "Penukaran Hadiah", variant: "warning" };
    case "expired":
      return { label: "Poin Kadaluarsa", variant: "error" };
    case "adjustment":
      return { label: "Penyesuaian Poin", variant: "neutral" };
    case "bonus":
      return { label: "Bonus Poin", variant: "brand" };
    default:
      return { label: "Poin Masuk", variant: "neutral" };
  }
}

function getReadableLotSource(lot: PointLot): {
  label: string;
  url?: string | null;
} {
  if (lot.sourceType === "views") {
    if (lot.sourcePlatform === "instagram") {
      return { label: "Konten Instagram", url: lot.sourceUrl };
    }
    if (lot.sourcePlatform === "tiktok") {
      return { label: "Konten TikTok", url: lot.sourceUrl };
    }
    return { label: "Konten Video", url: lot.sourceUrl };
  }
  if (lot.sourceType === "bonus") {
    return { label: "Bonus dari Admin" };
  }
  if (lot.sourceType === "adjustment") {
    return { label: "Penyesuaian Poin" };
  }
  return { label: "Poin Masuk" };
}

export default function MyPointsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [lots, setLots] = useState<PointLot[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [filterType, setFilterType] = useState<"all" | "active" | "expiring">("all");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let active = true;
    const userId = user?.uid;
    if (!userId) {
      return;
    }

    Promise.all([
      fetchWalletSummary(userId),
      fetchPointLots(userId),
      fetchPointTransactions(userId, 50),
    ])
      .then(([walletData, lotsData, txData]) => {
        if (!active) return;
        setWallet(walletData);
        setLots(lotsData);
        setTransactions(txData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading points data:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, refreshTrigger]);

  const availablePoints = wallet?.availablePoints || 0;
  const pendingPoints = wallet?.pendingPoints || 0;
  const redeemedPoints = wallet?.redeemedPoints || 0;
  const expiredPoints = wallet?.expiredPoints || 0;
  const expiringSoonPoints = wallet?.expiringSoonPoints || 0;

  // Active lots with remaining points and unexpired
  const activeLots = lots.filter((l) => {
    const days = getDaysUntilExpiration(l.expiresAt);
    return l.remainingPoints > 0 && days > 0;
  });

  const filteredLots = lots
    .filter((lot) => {
      const days = getDaysUntilExpiration(lot.expiresAt);
      if (filterType === "active") return lot.remainingPoints > 0 && days > 0;
      if (filterType === "expiring") return lot.remainingPoints > 0 && days > 0 && days <= 30;
      return true;
    })
    .sort((a, b) => {
      if (filterType === "expiring") {
        // Nearest expiration date first
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      }
      // Newest issuance first
      return new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime();
    });

  const hasAnyData = lots.length > 0 || transactions.length > 0 || availablePoints > 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Coins className="w-3 h-3" />
              Dompet Poin Kreator
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Poin & Mutasi
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Pantau saldo aktif, jadwal kedaluwarsa 6 bulan, dan riwayat buku besar transaksimu.
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

          <Link href="/creator/reward-shop">
            <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-md shadow-brand-blue/20">
              <Gift className="w-4 h-4" />
              <span>Tukar Hadiah</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Point Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Saldo Poin Tersedia"
          value={formatPoints(availablePoints)}
          unit="Poin"
          subtitle="Siap ditukarkan ke reward katalog"
          icon={Coins}
          accentColor="blue"
          badge="Masa Aktif 6 Bulan"
        />

        <StatCard
          title="Poin Pending"
          value={formatPoints(pendingPoints)}
          unit="Poin"
          subtitle="Menunggu verifikasi admin"
          icon={Hourglass}
          accentColor="yellow"
        />

        <StatCard
          title="Total Poin Ditukarkan"
          value={formatPoints(redeemedPoints)}
          unit="Poin"
          subtitle="Klaim reward yang telah digunakan"
          icon={Gift}
          accentColor="green"
        />

        <StatCard
          title="Poin Kedaluwarsa"
          value={formatPoints(expiredPoints)}
          unit="Poin"
          subtitle="Melewati masa berlaku 6 bulan"
          icon={Clock}
          accentColor="red"
        />
      </div>

      {/* Expiration Policy Banner */}
      <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Aturan Masa Aktif & Alokasi Poin
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Setiap lot poin berlaku selama <strong>6 bulan kalender</strong> sejak diterbitkan. Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu saat kamu menukar hadiah. Gunakan poinmu sebelum masa berlakunya habis.
            </p>
          </div>
        </div>

        {expiringSoonPoints > 0 ? (
          <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-status-warning/10 border border-status-warning/30 text-status-warning text-xs shrink-0 font-medium">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{formatPoints(expiringSoonPoints)} Poin segera berakhir (&lt; 30 hari)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 px-3 rounded-xl bg-status-success/10 border border-status-success/30 text-status-success text-xs shrink-0 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Semua poin aktif aman</span>
          </div>
        )}
      </Card>

      {!hasAnyData && !loading ? (
        <EmptyState
          icon={Coins}
          title="Belum ada poin nih"
          description="Yuk, mulai kumpulkan poin dari konten pertamamu! Buat video TikTok atau Reels tentang Mr.BOB dan kumpulkan ribuan views."
          actionLabel="Submit Video Sekarang"
          onAction={() => router.push("/creator/submit")}
        />
      ) : (
        <>
          {/* Section 1: Active Point Batches & Expiration */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-blue" />
                <h2 className="text-base font-bold text-text-primary">
                  Poin & Masa Berlaku
                </h2>
                <Badge variant="brand" size="sm">
                  {activeLots.length} Poin Aktif
                </Badge>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card-surface border border-border-subtle text-xs">
                <button
                  onClick={() => setFilterType("all")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterType === "all"
                      ? "bg-brand-blue text-white font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Semua ({lots.length})
                </button>
                <button
                  onClick={() => setFilterType("active")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterType === "active"
                      ? "bg-brand-blue text-white font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Aktif ({activeLots.length})
                </button>
                <button
                  onClick={() => setFilterType("expiring")}
                  className={`px-3 py-1 rounded-lg transition-colors ${
                    filterType === "expiring"
                      ? "bg-brand-blue text-white font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  Segera Berakhir ({lots.filter((l) => l.remainingPoints > 0 && getDaysUntilExpiration(l.expiresAt) <= 30 && getDaysUntilExpiration(l.expiresAt) > 0).length})
                </button>
              </div>
            </div>

            {filteredLots.length === 0 ? (
              <Card className="p-8 text-center bg-card-surface border-border-subtle rounded-2xl">
                <p className="text-xs text-text-secondary">
                  Tidak ada data poin untuk kategori ini.
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card-surface">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle/80 bg-card-elevated/50 text-text-secondary font-semibold">
                      <th className="py-3.5 px-4">Sumber Poin</th>
                      <th className="py-3.5 px-4">Tanggal Diperoleh</th>
                      <th className="py-3.5 px-4">Poin Awal</th>
                      <th className="py-3.5 px-4">Sisa Poin</th>
                      <th className="py-3.5 px-4">Tanggal Kadaluarsa</th>
                      <th className="py-3.5 px-4">Sisa Waktu</th>
                      <th className="py-3.5 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40">
                    {filteredLots.map((lot) => {
                      const daysRemaining = getDaysUntilExpiration(lot.expiresAt);
                      const isExpired = daysRemaining <= 0;
                      const isDepleted = lot.remainingPoints === 0;
                      const source = getReadableLotSource(lot);

                      let statusBadge = (
                        <Badge variant="success" size="sm">
                          Aktif
                        </Badge>
                      );
                      if (isDepleted) {
                        statusBadge = (
                          <Badge variant="neutral" size="sm" className="bg-bg-secondary text-text-secondary">
                            Habis Terpakai
                          </Badge>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <Badge variant="error" size="sm">
                            Kedaluwarsa
                          </Badge>
                        );
                      } else if (daysRemaining <= 7) {
                        statusBadge = (
                          <Badge variant="error" size="sm">
                            Kritis ({daysRemaining} Hari)
                          </Badge>
                        );
                      } else if (daysRemaining <= 30) {
                        statusBadge = (
                          <Badge variant="warning" size="sm">
                            {daysRemaining} Hari Lagi
                          </Badge>
                        );
                      }

                      return (
                        <tr
                          key={lot.id}
                          className="hover:bg-card-elevated/30 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-text-primary">
                              {source.label}
                            </div>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline mt-0.5"
                              >
                                <span>Lihat Konten</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary font-mono">
                            {formatDateTimeWIB(lot.issuedAt)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-text-primary">
                            {formatPoints(lot.originalPoints)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-brand-blue">
                            {formatPoints(lot.remainingPoints)}
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary font-mono">
                            {formatDateTimeWIB(lot.expiresAt)}
                          </td>
                          <td className="py-3.5 px-4 font-medium">
                            {isDepleted ? (
                              <span className="text-text-secondary">-</span>
                            ) : isExpired ? (
                              <span className="text-status-error">Sudah berakhir</span>
                            ) : (
                              <span
                                className={
                                  daysRemaining <= 7
                                    ? "text-status-error font-bold"
                                    : daysRemaining <= 30
                                    ? "text-status-warning font-semibold"
                                    : "text-text-primary"
                                }
                              >
                                {daysRemaining} Hari
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: Clean Point History Table */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-blue" />
                <h2 className="text-base font-bold text-text-primary">
                  Riwayat Poin
                </h2>
                <Badge variant="brand" size="sm">
                  {transactions.length} Transaksi
                </Badge>
              </div>
            </div>

            {transactions.length === 0 ? (
              <Card className="p-8 text-center bg-card-surface border-border-subtle rounded-2xl">
                <p className="text-xs text-text-secondary">
                  Belum ada riwayat mutasi poin yang tercatat.
                </p>
              </Card>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card-surface">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border-subtle/80 bg-card-elevated/50 text-text-secondary font-semibold">
                      <th className="py-3.5 px-4">Tanggal</th>
                      <th className="py-3.5 px-4">Aktivitas</th>
                      <th className="py-3.5 px-4">Keterangan</th>
                      <th className="py-3.5 px-4 text-right">Poin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/40">
                    {transactions.map((tx) => {
                      const isPositive =
                        tx.transactionType === "earned" ||
                        tx.transactionType === "bonus" ||
                        (tx.transactionType === "adjustment" && tx.amount > 0);
                      const activity = getActivityLabel(tx.transactionType);

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-card-elevated/30 transition-colors"
                        >
                          <td
                            className="py-3.5 px-4 text-text-secondary font-mono"
                            title={formatDateTimeWIB(tx.createdAt)}
                          >
                            {formatShortDateWIB(tx.createdAt)}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={activity.variant}
                              size="sm"
                              className="gap-1 capitalize"
                            >
                              {isPositive ? (
                                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 mr-0.5" />
                              )}
                              {activity.label}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-text-primary">
                            {tx.description}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-bold ${
                              isPositive ? "text-status-success" : "text-status-error"
                            }`}
                          >
                            {isPositive ? `+${formatPoints(tx.amount)}` : `-${formatPoints(tx.amount)}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
