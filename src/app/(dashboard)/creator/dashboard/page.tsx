"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { fetchWalletSummary } from "@/lib/supabase/wallet";
import {
  fetchCreatorSubmissions,
  fetchCreatorSubmissionStats,
} from "@/lib/supabase/submissions";
import { WalletSummary, getDaysUntilExpiration } from "@/lib/types/wallet";
import { Submission } from "@/lib/types/submission";
import { OFFICIAL_REWARDS, Redemption } from "@/lib/types/reward";
import { fetchCreatorRedemptions } from "@/lib/supabase/rewards";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Coins,
  Hourglass,
  Eye,
  Film,
  PlusCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Gift,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  XCircle,
} from "lucide-react";
import { formatPoints, formatViews, formatDate } from "@/lib/utils";

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);
  const [stats, setStats] = useState<{
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    totalClaimedViews: number;
    totalEstimatedPendingPoints: number;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const userId = user?.uid;
    if (!userId) return;

    Promise.all([
      fetchWalletSummary(userId),
      fetchCreatorSubmissionStats(userId),
      fetchCreatorSubmissions(userId),
      fetchCreatorRedemptions(userId),
    ])
      .then(([walletData, statsData, subsData, redemptionsData]) => {
        if (!active) return;
        setWallet(walletData);
        setStats(statsData);
        setSubmissions(subsData);
        setRecentRedemptions(redemptionsData);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading dashboard data:", err);
      });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  const availablePoin = wallet ? wallet.availablePoints : (user?.totalAvailablePoin || 0);
  const pendingPoin = wallet
    ? wallet.pendingPoints
    : stats
    ? stats.totalEstimatedPendingPoints
    : (user?.pendingPoin || 0);
  const verifiedViews =
    submissions
      .filter((s) => s.status === "approved")
      .reduce((acc, s) => acc + (s.verifiedViews || 0), 0) ||
    (user?.totalVerifiedViews || 0);

  const submissionCount = stats ? stats.totalSubmissions : (user?.submissionCount || 0);
  const expiringSoonPoin = wallet?.expiringSoonPoints || 0;
  const nearestExpDate = wallet?.nearestExpirationDate;
  const daysUntilExp = nearestExpDate ? getDaysUntilExpiration(nearestExpDate) : null;

  // Most recent approved submission for notification
  const recentApprovedSub = submissions.find((s) => s.status === "approved");
  const revisionRequiredSub = submissions.find((s) => s.status === "requires_revision");
  const latestRedemption = recentRedemptions.length > 0 ? recentRedemptions[0] : null;

  // Dynamic next target reward from official 13 catalog items
  const sortedRewards = [...OFFICIAL_REWARDS].sort((a, b) => a.requiredPoin - b.requiredPoin);
  const nextReward =
    sortedRewards.find((r) => r.requiredPoin > availablePoin) ||
    sortedRewards[sortedRewards.length - 1];
  const progressPercent = nextReward
    ? Math.min(100, Math.round((availablePoin / nextReward.requiredPoin) * 100))
    : 100;
  const pointsRemaining = Math.max(0, nextReward.requiredPoin - availablePoin);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-[20px] bg-gradient-to-r from-card-surface via-card-surface to-card-elevated border border-border-subtle relative overflow-hidden shadow-xl">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Sparkles className="w-3 h-3" />
              Creator Dashboard
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Halo, {user?.displayName || "Creator"}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
            Selamat datang di Mr.BOB Creator Hub. Post video TikTok & IG Reels seputar keseruan di Mr.BOB, kumpulkan views, dan tukarkan reward favoritmu!
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Link href="/creator/submit">
            <Button
              variant="primary"
              size="lg"
              className="w-full sm:w-auto shadow-lg shadow-brand-blue/30 gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Submit Konten Baru</span>
            </Button>
          </Link>
        </div>

        {/* Ambient subtle background glow */}
        <div className="absolute right-0 top-0 w-80 h-full bg-brand-blue/5 blur-2xl pointer-events-none" />
      </div>

      {/* Verification Success Notification Banner */}
      {recentApprovedSub && (
        <div className="p-4 sm:p-5 rounded-[20px] bg-status-success/10 border border-status-success/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-status-success/20 text-status-success shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  Kontenmu berhasil diverifikasi!
                </span>
                <Badge variant="success" size="sm">
                  +{formatPoints(recentApprovedSub.approvedPoints || 0)} Poin
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Kamu mendapatkan <strong>{formatPoints(recentApprovedSub.approvedPoints || 0)} Poin</strong> dari video {recentApprovedSub.platform === "tiktok" ? "TikTok" : "Instagram Reels"} yang sudah disetujui.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/creator/my-points">
              <Button variant="primary" size="sm" className="text-xs shadow-md shadow-brand-blue/20">
                Buka Dompet Poin →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Revision Required Alert Banner */}
      {revisionRequiredSub && (
        <div className="p-4 sm:p-5 rounded-[20px] bg-status-warning/10 border border-status-warning/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-status-warning/20 text-status-warning shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-text-primary block">
                Perlu Bukti Tambahan dari Admin
              </span>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Admin meminta bukti insight analitik tambahan untuk salah satu video yang kamu ajukan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/creator/my-contents">
              <Button variant="secondary" size="sm" className="text-xs">
                Upload Bukti Sekarang →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Recent Redemption Notification Banner */}
      {latestRedemption && (
        <div className="p-4 sm:p-5 rounded-[20px] bg-brand-blue/10 border border-brand-blue/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-blue/20 text-brand-blue shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  Status Hadiah: {latestRedemption.rewardNameSnapshot}
                </span>
                <Badge
                  variant={
                    latestRedemption.status === "completed"
                      ? "success"
                      : latestRedemption.status === "rejected"
                      ? "error"
                      : "warning"
                  }
                  size="sm"
                >
                  {latestRedemption.status === "pending"
                    ? "Menunggu Diproses"
                    : latestRedemption.status === "processing"
                    ? "Sedang Diproses"
                    : latestRedemption.status === "ready"
                    ? "Siap Digunakan"
                    : latestRedemption.status === "completed"
                    ? "Selesai"
                    : "Ditolak"}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                {latestRedemption.status === "completed"
                  ? "Hadiahmu telah selesai diproses oleh tim Mr.BOB."
                  : latestRedemption.status === "rejected"
                  ? "Klaim reward dibatalkan dan poin telah dikembalikan ke dompetmu."
                  : "Poinmu sudah digunakan dan hadiah sedang menunggu proses dari tim Mr.BOB."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/creator/my-rewards">
              <Button variant="secondary" size="sm" className="text-xs">
                Detail Hadiah Saya →
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Expiration Notification Banner (if points are expiring within 30 days) */}
      {expiringSoonPoin > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-[20px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
            daysUntilExp !== null && daysUntilExp <= 7
              ? "bg-status-error/10 border-status-error/30"
              : "bg-status-warning/10 border-status-warning/30"
          }`}
        >
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2.5 rounded-xl shrink-0 ${
                daysUntilExp !== null && daysUntilExp <= 7
                  ? "bg-status-error/20 text-status-error"
                  : "bg-status-warning/20 text-status-warning"
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">
                  Poin yang Akan Kadaluarsa
                </span>
                <Badge
                  variant={daysUntilExp !== null && daysUntilExp <= 7 ? "error" : "warning"}
                  size="sm"
                >
                  {daysUntilExp !== null && daysUntilExp <= 1
                    ? "Hari Terakhir!"
                    : daysUntilExp !== null
                    ? `${daysUntilExp} Hari Lagi`
                    : "Segera Kadaluarsa"}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">
                Kamu memiliki <strong>{formatPoints(expiringSoonPoin)} Poin</strong> yang masa berlakunya akan berakhir. Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu saat kamu menukar hadiah. Gunakan sebelum hangus!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href="/creator/reward-shop">
              <Button
                variant={daysUntilExp !== null && daysUntilExp <= 7 ? "danger" : "primary"}
                size="sm"
                className="text-xs"
              >
                Tukar Hadiah Sekarang
              </Button>
            </Link>
            <Link href="/creator/my-points">
              <Button variant="ghost" size="sm" className="text-xs text-text-secondary hover:text-text-primary">
                Rincian Lot
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Saldo Poin Tersedia"
          value={formatPoints(availablePoin)}
          unit="Poin"
          subtitle="Poin kedaluwarsa terdekat digunakan lebih dulu"
          icon={Coins}
          accentColor="blue"
          badge="Masa Aktif 6 Bulan"
        />

        <StatCard
          title="Poin Pending"
          value={formatPoints(pendingPoin)}
          unit="Poin"
          subtitle="Menunggu verifikasi admin"
          icon={Hourglass}
          accentColor="yellow"
        />

        <StatCard
          title="Total Views Disetujui"
          value={formatViews(verifiedViews)}
          unit="Views"
          subtitle="Dari submission yang lolos review"
          icon={Eye}
          accentColor="green"
        />

        <StatCard
          title="Total Video Diajukan"
          value={submissionCount}
          unit="Video"
          subtitle="Submission terkirim"
          icon={Film}
          accentColor="red"
        />
      </div>

      {/* Smart Submission Reminder & Dynamic Target Reward */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smart Submission Reminder Info Card */}
        <Card className="lg:col-span-2 p-6 bg-card-surface border-border-subtle flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-blue" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Smart Submission Reminder
                </h3>
              </div>
              <Badge variant="brand" size="sm">
                Aturan 30 Hari
              </Badge>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              Video hanya dapat diajukan dalam kurun <strong>30 hari kalender</strong> sejak tanggal publikasi (Hari publikasi = Hari ke-1). Setelah hari ke-30 berakhir, video tidak lagi memenuhi syarat reward.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle text-xs space-y-1">
                <span className="text-status-success font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 15–30 Hari
                </span>
                <p className="text-[11px] text-text-secondary">
                  Masih banyak waktu kumpulin views sebelum submit.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle text-xs space-y-1">
                <span className="text-status-warning font-semibold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 4–14 Hari
                </span>
                <p className="text-[11px] text-text-secondary">
                  Waktu submission aktif, siap diajukan atau simpan draft.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle text-xs space-y-1">
                <span className="text-status-error font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> 1–3 Hari
                </span>
                <p className="text-[11px] text-text-secondary">
                  Last Chance! Segera submit sebelum batas waktu berakhir.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-border-subtle/50 flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Punya video baru yang siap diajukan?
            </span>
            <Link href="/creator/submit">
              <Button variant="secondary" size="sm" className="text-xs">
                Mulai Submit <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Dynamic Next Target Reward Progress */}
        <Card className="p-6 bg-card-surface border-border-subtle flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-status-warning" />
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Target Reward Terdekat
                </h3>
              </div>
              <Badge variant="warning" size="sm">
                {nextReward.category}
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">{nextReward.name}</span>
                <span className="text-brand-blue font-mono font-bold">
                  {formatPoints(nextReward.requiredPoin)} Poin
                </span>
              </div>
              <p className="text-[11px] text-text-secondary line-clamp-2">
                {nextReward.description}
              </p>

              {/* Dynamic Progress Bar */}
              <div className="pt-2">
                <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary font-mono mt-1">
                  <span>{formatPoints(availablePoin)} Poin</span>
                  <span>{formatPoints(nextReward.requiredPoin)} Poin</span>
                </div>
                <p className="text-[10px] text-text-secondary/80 mt-1">
                  {pointsRemaining > 0
                    ? `Kurang ${formatPoints(pointsRemaining)} Poin lagi untuk menukar reward ini.`
                    : "Poinmu sudah mencukupi! Hadiah ini siap kamu tukarkan."}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle/50 flex flex-col gap-2">
            <Link href="/creator/reward-shop" className="block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Lihat Semua 13 Hadiah
              </Button>
            </Link>
            <Link href="/creator/my-points" className="block w-full text-center">
              <span className="text-[11px] text-brand-blue hover:underline">
                Kelola Dompet Poin & Masa Aktif →
              </span>
            </Link>
          </div>
        </Card>
      </div>

      {/* Wallet Health Assurance Card (when no points are expiring soon) */}
      {expiringSoonPoin === 0 && availablePoin > 0 && (
        <Card className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-status-success/10 text-status-success shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-primary">
                Masa Aktif Poin Aman
              </p>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Semua {formatPoints(availablePoin)} Poin milikmu masih dalam masa aktif 6 bulan. Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu saat kamu menukar hadiah.
              </p>
            </div>
          </div>
          <Link href="/creator/my-points" className="shrink-0 hidden sm:inline-block">
            <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
              Lihat Dompet Poin
            </Button>
          </Link>
        </Card>
      )}

      {/* Recent Submissions Section with Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Pengajuan Video Terakhir
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Pantau status verifikasi dan poin dari video yang kamu submit.
            </p>
          </div>
          <Link href="/creator/my-contents">
            <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
              Lihat Semua Konten
            </Button>
          </Link>
        </div>

        {submissions.length === 0 ? (
          <EmptyState
            icon={Film}
            title="Belum Ada Video yang Disubmit"
            description="Kamu belum mengajukan video TikTok atau IG Reels. Mulai buat konten bertema Mr.BOB dan kumpulkan Poin pertamamu!"
            actionLabel="Submit Video Sekarang"
            onAction={() => {
              router.push("/creator/submit");
            }}
          />
        ) : (
          <div className="space-y-3">
            {submissions.slice(0, 3).map((sub) => (
              <Card
                key={sub.id}
                className="p-4 sm:p-5 bg-card-surface border-border-subtle rounded-2xl hover:border-border-subtle/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={sub.platform === "tiktok" ? "brand" : "warning"}
                      size="sm"
                      className="capitalize font-semibold text-[11px]"
                    >
                      {sub.platform === "tiktok" ? "TikTok" : "Instagram Reels"}
                    </Badge>

                    {sub.status === "approved" && (
                      <Badge variant="success" size="sm" className="gap-1 text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Disetujui
                      </Badge>
                    )}
                    {sub.status === "under_review" && (
                      <Badge variant="warning" size="sm" className="gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> Sedang Direview
                      </Badge>
                    )}
                    {sub.status === "requires_revision" && (
                      <Badge variant="warning" size="sm" className="gap-1 text-[11px]">
                        <AlertTriangle className="w-3 h-3" /> Perlu Bukti
                      </Badge>
                    )}
                    {sub.status === "rejected" && (
                      <Badge variant="error" size="sm" className="gap-1 text-[11px]">
                        <XCircle className="w-3 h-3" /> Ditolak
                      </Badge>
                    )}
                    {sub.status === "submitted" && (
                      <Badge variant="brand" size="sm" className="gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> Menunggu Review
                      </Badge>
                    )}

                    <span className="text-[11px] text-text-secondary hidden sm:inline">
                      • Diajukan {formatDate(sub.submittedAt)}
                    </span>
                  </div>

                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs sm:text-sm font-bold text-text-primary hover:text-brand-blue flex items-center gap-1.5 truncate group"
                  >
                    <span className="truncate">{sub.videoUrl}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                  </a>

                  <p className="text-[11px] text-text-secondary">
                    Tanggal Posting: {formatDate(sub.postingDate)}
                  </p>
                </div>

                <div className="flex items-center gap-5 shrink-0 border-t sm:border-t-0 sm:border-l border-border-subtle pt-2 sm:pt-0 sm:pl-5">
                  <div>
                    <span className="text-[10px] text-text-secondary block">Views</span>
                    <span className="text-xs sm:text-sm font-bold text-text-primary font-mono flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-text-secondary" />
                      {formatViews(sub.claimedViews)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-text-secondary block">
                      {sub.status === "approved" ? "Poin" : "Estimasi Poin"}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-brand-blue font-mono flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5" />
                      {sub.status === "approved" && typeof sub.approvedPoints === "number"
                        ? formatPoints(sub.approvedPoints)
                        : formatPoints(sub.estimatedPoints ?? 0)}{" "}
                      Poin
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
