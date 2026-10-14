"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
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
} from "lucide-react";
import { formatPoints, formatViews } from "@/lib/utils";

export default function CreatorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const availablePoin = user?.totalAvailablePoin || 0;
  const pendingPoin = user?.pendingPoin || 0;
  const verifiedViews = user?.totalVerifiedViews || 0;
  const submissionCount = user?.submissionCount || 0;

  // Next target reward (Keychain = 10 Poin)
  const nextTargetPoin = 10;
  const progressPercent = Math.min(100, Math.round((availablePoin / nextTargetPoin) * 100));

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

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Saldo Poin Tersedia"
          value={formatPoints(availablePoin)}
          unit="Poin"
          subtitle="Siap ditukarkan ke reward katalog"
          icon={Coins}
          accentColor="blue"
          badge="FEFO 6 Bulan"
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

      {/* Smart Submission Reminder & Next Reward Progress */}
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

        {/* Next Target Reward Progress */}
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
                Level 1
              </Badge>
            </div>

            <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary">Keychain Mr.BOB</span>
                <span className="text-brand-blue font-mono font-bold">10 Poin</span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Gantungan kunci official Mr.BOB Kampung Inggris.
              </p>

              {/* Progress Bar */}
              <div className="pt-2">
                <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-brand-blue rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-text-secondary font-mono mt-1">
                  <span>{availablePoin} Poin</span>
                  <span>{nextTargetPoin} Poin</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle/50">
            <Link href="/creator/reward-shop" className="block w-full">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Lihat Semua 13 Hadiah
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Recent Submissions Section (Empty State in Phase 1) */}
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

        <EmptyState
          icon={Film}
          title="Belum Ada Video yang Disubmit"
          description="Kamu belum mengajukan video TikTok atau IG Reels. Mulai buat konten bertema Mr.BOB dan kumpulkan Poin pertamamu!"
          actionLabel="Submit Video Sekarang"
          onAction={() => {
            router.push("/creator/submit");
          }}
        />
      </div>
    </div>
  );
}
