"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Shield,
  CheckSquare,
  Users,
  Coins,
  FileCheck2,
  Server,
  Database,
  Key,
} from "lucide-react";
import { formatPoints } from "@/lib/utils";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { isConfigured } = useAuth();
  const [healthStatus, setHealthStatus] = useState<{
    adminConfigured?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setHealthStatus(data))
      .catch((err) => console.error("Health check error:", err));
  }, []);

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="p-6 sm:p-8 rounded-[20px] bg-gradient-to-r from-card-surface via-card-surface to-card-elevated border border-border-subtle relative overflow-hidden shadow-xl">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              <Shield className="w-3 h-3" />
              Portal Pengawasan Admin
            </Badge>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              v1.0.0 (Phase 1)
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Administrative Overview
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
            Pusat verifikasi konten TikTok/Reels, kurasi tanggal posting, penerbitan Poin, manajemen reward, dan analitik kuartalan Mr.BOB Creator Hub.
          </p>
        </div>

        {/* Ambient red subtle glow */}
        <div className="absolute right-0 top-0 w-80 h-full bg-brand-red/5 blur-2xl pointer-events-none" />
      </div>

      {/* 4 Key Admin Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Antrean Verifikasi"
          value="0"
          unit="Konten"
          subtitle="Submission menunggu verifikasi admin"
          icon={CheckSquare}
          accentColor="yellow"
          badge="SLA 24 Jam"
        />

        <StatCard
          title="Creator Terdaftar"
          value="0"
          unit="Akun"
          subtitle="Total kreator aktif di platform"
          icon={Users}
          accentColor="blue"
        />

        <StatCard
          title="Total Poin Diterbitkan"
          value={formatPoints(0)}
          unit="Poin"
          subtitle="Poin hasil verified views"
          icon={Coins}
          accentColor="green"
        />

        <StatCard
          title="Permintaan Klaim Reward"
          value="0"
          unit="Klaim"
          subtitle="Menunggu proses fulfillment"
          icon={FileCheck2}
          accentColor="red"
        />
      </div>

      {/* Verification Queue & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Verification Queue Preview (Phase 1 empty state) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Antrean Verifikasi Konten Terbaru
              </h3>
              <p className="text-xs text-text-secondary">
                Verifikasi keaslian tanggal posting (maks. 30 hari) dan screenshot views.
              </p>
            </div>
            <Link href="/admin/verifications">
              <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                Buka Antrean Lengkap
              </Button>
            </Link>
          </div>

          <EmptyState
            icon={CheckSquare}
            title="Antrean Verifikasi Kosong"
            description="Saat ini belum ada pengajuan video baru dari kreator yang memerlukan tindakan verifikasi."
            actionLabel="Pelajari Alur Verifikasi (Phase 4)"
            onAction={() => {
              router.push("/admin/verifications");
            }}
          />
        </div>

        {/* System & Architecture Status Card */}
        <Card className="p-6 bg-card-surface border-border-subtle flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-brand-blue" />
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                  Status Sistem
                </h4>
              </div>
              <Badge variant="brand" size="sm">
                Next.js 16 App Router
              </Badge>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between">
                <span className="text-text-secondary flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-brand-blue" />
                  Firebase Client SDK
                </span>
                <Badge
                  variant={isConfigured ? "success" : "warning"}
                  size="sm"
                >
                  {isConfigured ? "Terhubung" : "Belum Dikonfigurasi"}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between">
                <span className="text-text-secondary flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-status-warning" />
                  Firebase Admin SDK
                </span>
                <Badge
                  variant={healthStatus?.adminConfigured ? "success" : "neutral"}
                  size="sm"
                >
                  {healthStatus?.adminConfigured ? "Aktif (Server)" : "Standby"}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between">
                <span className="text-text-secondary flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-status-success" />
                  Role Check
                </span>
                <Badge variant="success" size="sm">
                  Server Verified
                </Badge>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle/50 text-[11px] text-text-secondary">
            Konfigurasi dapat diatur melalui file <code className="text-brand-blue">.env.local</code>.
          </div>
        </Card>
      </div>
    </div>
  );
}
