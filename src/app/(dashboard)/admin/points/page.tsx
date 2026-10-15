"use client";

import React, { useEffect, useState } from "react";
import {
  fetchAdminWalletMetrics,
  fetchCreatorsWithBalances,
  fetchAdminTransactionLedger,
  issuePointsLot,
  triggerExpireOverdueLots,
} from "@/lib/supabase/wallet";
import { PointSourceType, PointTransaction } from "@/lib/types/wallet";
import { StatCard } from "@/components/dashboard/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  Coins,
  Shield,
  History,
  PlusCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  Sparkles,
  Layers,
} from "lucide-react";
import { formatPoints, formatDateTimeWIB } from "@/lib/utils";

interface CreatorBalance {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  availablePoints: number;
  expiringSoonPoints: number;
  totalEarned: number;
}

export default function AdminPointsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalIssued: 0,
    totalRedeemed: 0,
    totalExpired: 0,
    totalInCirculation: 0,
  });
  const [creators, setCreators] = useState<CreatorBalance[]>([]);
  const [transactions, setTransactions] = useState<
    Array<PointTransaction & { userFullName?: string; userEmail?: string }>
  >([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"creators" | "ledger">("creators");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Modal State for Point Issuance
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [issuePoints, setIssuePoints] = useState<number>(50);
  const [issueSourceType, setIssueSourceType] = useState<PointSourceType>("views");
  const [issueDescription, setIssueDescription] = useState<string>("Penerbitan Poin Konten Video");
  const [issuing, setIssuing] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Expire audit state
  const [auditing, setAuditing] = useState(false);
  const [auditNotice, setAuditNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchAdminWalletMetrics(),
      fetchCreatorsWithBalances(),
      fetchAdminTransactionLedger(100),
    ])
      .then(([metricsData, creatorsData, txData]) => {
        if (!active) return;
        setMetrics(metricsData);
        setCreators(creatorsData);
        setTransactions(txData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading admin points data:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [refreshTrigger]);

  const handleOpenIssueModal = (creatorId?: string) => {
    if (creatorId) {
      setSelectedUserId(creatorId);
    } else if (creators.length > 0 && !selectedUserId) {
      setSelectedUserId(creators[0].id);
    }
    setModalFeedback(null);
    setIsIssueModalOpen(true);
  };

  const handleIssueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalFeedback({ type: "error", message: "Pilih kreator penerima terlebih dahulu." });
      return;
    }
    if (issuePoints <= 0) {
      setModalFeedback({ type: "error", message: "Jumlah poin harus lebih besar dari 0." });
      return;
    }
    if (!issueDescription || issueDescription.trim().length < 10) {
      setModalFeedback({
        type: "error",
        message: "Alasan audit wajib diisi minimal 10 karakter untuk pertanggungjawaban buku besar.",
      });
      return;
    }

    setIssuing(true);
    setModalFeedback(null);
    try {
      const idempotencyKey = `admin-issue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await issuePointsLot(
        selectedUserId,
        issuePoints,
        issueSourceType,
        undefined,
        issueDescription,
        idempotencyKey
      );
      setModalFeedback({
        type: "success",
        message: `Berhasil menerbitkan ${formatPoints(issuePoints)} Poin dengan masa aktif 6 bulan!`,
      });
      setRefreshTrigger((prev) => prev + 1);
      setTimeout(() => {
        setIsIssueModalOpen(false);
        setModalFeedback(null);
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menerbitkan poin.";
      setModalFeedback({ type: "error", message: msg });
    } finally {
      setIssuing(false);
    }
  };

  const handleTriggerAudit = async () => {
    setAuditing(true);
    setAuditNotice(null);
    try {
      const res = await triggerExpireOverdueLots();
      setAuditNotice(
        `Audit selesai: ${res.lotsExpiredCount} lot (${formatPoints(res.totalPointsExpired)} Poin) telah disesuaikan sebagai kedaluwarsa.`
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menjalankan audit kedaluwarsa.";
      setAuditNotice(`Error: ${msg}`);
    } finally {
      setAuditing(false);
    }
  };

  const filteredCreators = creators.filter((c) => {
    const q = searchQuery.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const filteredTransactions = transactions.filter((tx) => {
    if (txTypeFilter === "all") return true;
    return tx.transactionType === txTypeFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="warning" size="sm">
              <Shield className="w-3 h-3" />
              Admin Portal
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Manajemen Dompet Poin & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Pengelolaan buku besar mutasi poin terpusat (Immutable Ledger), lot kedaluwarsa 6 bulan, dan penerbitan poin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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

          <Button
            variant="secondary"
            size="sm"
            onClick={handleTriggerAudit}
            disabled={auditing}
            className="text-xs gap-1.5"
            title="Periksa lot yang telah melewati masa aktif 6 bulan"
          >
            <Clock className={`w-3.5 h-3.5 ${auditing ? "animate-spin" : ""}`} />
            <span>Audit Kedaluwarsa</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenIssueModal()}
            className="text-xs gap-1.5 shadow-md shadow-brand-blue/20"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Terbitkan Poin</span>
          </Button>
        </div>
      </div>

      {auditNotice && (
        <div className="p-4 rounded-2xl bg-card-surface border border-brand-blue/30 text-xs text-brand-blue flex items-center justify-between">
          <span>{auditNotice}</span>
          <button
            onClick={() => setAuditNotice(null)}
            className="text-text-secondary hover:text-text-primary ml-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* 4 System-wide Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Poin Diterbitkan"
          value={formatPoints(metrics.totalIssued)}
          unit="Poin"
          subtitle="Seluruh lot poin yang pernah dibuat"
          icon={Coins}
          accentColor="blue"
        />

        <StatCard
          title="Total Poin Beredar"
          value={formatPoints(metrics.totalInCirculation)}
          unit="Poin"
          subtitle="Saldo aktif yang belum kedaluwarsa"
          icon={Layers}
          accentColor="green"
          badge="Masa Aktif 6 Bulan"
        />

        <StatCard
          title="Total Poin Ditukarkan"
          value={formatPoints(metrics.totalRedeemed)}
          unit="Poin"
          subtitle="Total penukaran reward resmi"
          icon={Sparkles}
          accentColor="yellow"
        />

        <StatCard
          title="Total Poin Kedaluwarsa"
          value={formatPoints(metrics.totalExpired)}
          unit="Poin"
          subtitle="Melewati masa berlaku 6 bulan"
          icon={Clock}
          accentColor="red"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle/80 pb-3">
        <button
          onClick={() => setActiveTab("creators")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "creators"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Saldo Kreator ({creators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === "ledger"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Buku Besar Transaksi ({transactions.length})</span>
        </button>
      </div>

      {/* Tab 1: Creator Balances Overview */}
      {activeTab === "creators" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Cari nama atau email kreator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card-surface border border-border-subtle rounded-xl pl-9 pr-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-blue"
              />
            </div>

            <span className="text-xs text-text-secondary">
              Menampilkan {filteredCreators.length} dari {creators.length} kreator
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card-surface">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle/80 bg-card-elevated/50 text-text-secondary font-semibold">
                  <th className="py-3.5 px-4">Kreator</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Saldo Poin Tersedia</th>
                  <th className="py-3.5 px-4">Poin Segera Berakhir (&lt; 30 Hari)</th>
                  <th className="py-3.5 px-4">Total Pernah Didapat</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/40">
                {filteredCreators.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">
                      Tidak ada kreator yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredCreators.map((creator) => (
                    <tr
                      key={creator.id}
                      className="hover:bg-card-elevated/30 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            name={creator.fullName}
                            src={creator.avatarUrl || undefined}
                            size="sm"
                          />
                          <span className="font-bold text-text-primary">
                            {creator.fullName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary font-mono">
                        {creator.email}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-blue">
                        {formatPoints(creator.availablePoints)} Poin
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {creator.expiringSoonPoints > 0 ? (
                          <span className="text-status-warning font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {formatPoints(creator.expiringSoonPoints)} Poin
                          </span>
                        ) : (
                          <span className="text-text-secondary/70">0 Poin</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-text-primary">
                        {formatPoints(creator.totalEarned)} Poin
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenIssueModal(creator.id)}
                          className="text-[11px] h-8 px-2.5 gap-1"
                        >
                          <PlusCircle className="w-3 h-3 text-brand-blue" />
                          <span>Terbitkan</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Global Transaction Ledger */}
      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-card-surface border border-border-subtle text-xs">
              {["all", "earned", "redeemed", "expired", "bonus", "adjustment"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTxTypeFilter(t)}
                  className={`px-3 py-1 rounded-lg transition-colors capitalize ${
                    txTypeFilter === t
                      ? "bg-brand-blue text-white font-semibold"
                      : "text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {t === "all" ? "Semua" : t}
                </button>
              ))}
            </div>

            <span className="text-xs text-text-secondary font-mono">
              {filteredTransactions.length} Transaksi Tercatat
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border-subtle bg-card-surface">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-subtle/80 bg-card-elevated/50 text-text-secondary font-semibold">
                  <th className="py-3.5 px-4">Waktu (WIB)</th>
                  <th className="py-3.5 px-4">Kreator</th>
                  <th className="py-3.5 px-4">Tipe Mutasi</th>
                  <th className="py-3.5 px-4">Deskripsi Transaksi</th>
                  <th className="py-3.5 px-4">Idempotency / Ref</th>
                  <th className="py-3.5 px-4 text-right">Jumlah Poin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/40">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-text-secondary">
                      Belum ada transaksi untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPositive =
                      tx.transactionType === "earned" ||
                      tx.transactionType === "bonus" ||
                      (tx.transactionType === "adjustment" && tx.amount > 0);

                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-card-elevated/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-text-secondary font-mono">
                          {formatDateTimeWIB(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-text-primary">
                            {tx.userFullName || "Kreator"}
                          </div>
                          <div className="text-[10px] text-text-secondary font-mono">
                            {tx.userEmail || tx.userId.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              tx.transactionType === "earned"
                                ? "success"
                                : tx.transactionType === "bonus"
                                ? "brand"
                                : tx.transactionType === "redeemed"
                                ? "warning"
                                : tx.transactionType === "expired"
                                ? "error"
                                : "neutral"
                            }
                            size="sm"
                            className="capitalize"
                          >
                            {tx.transactionType === "earned" && <ArrowUpRight className="w-3 h-3 mr-1" />}
                            {tx.transactionType === "redeemed" && <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {tx.transactionType}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-text-primary font-medium">
                          {tx.description}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[10px] text-text-secondary/70">
                          {tx.idempotencyKey || tx.referenceId || tx.id.slice(0, 8)}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-mono font-bold ${
                            isPositive ? "text-status-success" : "text-status-error"
                          }`}
                        >
                          {isPositive ? `+${formatPoints(tx.amount)}` : `-${formatPoints(tx.amount)}`} Poin
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual Point Issuance Modal */}
      <Dialog
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        title="Terbitkan Lot Poin Baru"
        description="Penerbitan poin akan mencatat lot aktif baru dengan masa berlaku 6 bulan kalender dan entri pada buku besar mutasi."
      >
        <form onSubmit={handleIssueSubmit} className="space-y-4">
          {modalFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                modalFeedback.type === "success"
                  ? "bg-status-success/15 border-status-success/30 text-status-success"
                  : "bg-status-error/15 border-status-error/30 text-status-error"
              }`}
            >
              {modalFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{modalFeedback.message}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Pilih Kreator Penerima
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full bg-card-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-blue"
            >
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.email}) — Saldo: {formatPoints(c.availablePoints)} Poin
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Input
                label="Jumlah Poin"
                type="number"
                min="1"
                value={issuePoints}
                onChange={(e) => setIssuePoints(parseInt(e.target.value, 10) || 0)}
                placeholder="50"
                required
              />
              <span className="text-[10px] text-text-secondary/70">
                10 Poin = 1.000 Views
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Kategori Sumber
              </label>
              <select
                value={issueSourceType}
                onChange={(e) => setIssueSourceType(e.target.value as PointSourceType)}
                className="w-full bg-card-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-blue"
              >
                <option value="views">Views Konten Video</option>
                <option value="bonus">Bonus Khusus</option>
                <option value="challenge">Challenge / Event</option>
                <option value="adjustment">Penyesuaian Manual</option>
              </select>
            </div>
          </div>

          <div>
            <Input
              label="Alasan / Catatan Audit Wajib (Min. 10 Karakter)"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="Contoh: Bonus verifikasi konten viral TikTok (Batch #1)"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5 text-brand-blue font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Masa Berlaku Otomatis</span>
            </div>
            <p>
              Poin ini akan kedaluwarsa 6 bulan sejak hari penerbitan. Saat kreator menukarkan reward, lot dengan tanggal kedaluwarsa terdekat akan dialokasikan lebih dulu.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsIssueModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={issuing}
              className="gap-1.5"
            >
              <PlusCircle className={`w-3.5 h-3.5 ${issuing ? "animate-spin" : ""}`} />
              <span>{issuing ? "Memproses..." : "Terbitkan Poin"}</span>
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
