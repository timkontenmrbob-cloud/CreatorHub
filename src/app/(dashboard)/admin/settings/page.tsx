"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Shield,
  Clock,
  Coins,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setErrorMessage(null);

    if (!targetEmail || !bootstrapSecret) {
      setErrorMessage("Silakan masukkan email target dan kunci rahasia bootstrap.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail.trim(),
          secret: bootstrapSecret.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses promosi admin.");
      }

      setStatusMessage(data.message || "Berhasil mempromosikan pengguna.");
      setTargetEmail("");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Terjadi kesalahan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          System Settings & Policy Parameters
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Parameter kebijakan bisnis resmi platform Mr.BOB Creator Hub.
        </p>
      </div>

      {/* Core Business Rules Reference Card */}
      <Card className="p-6 bg-card-surface border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle/60">
          <Settings className="w-4 h-4 text-brand-blue" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Parameter Bisnis Terkonfigurasi (Master Blueprint)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle space-y-1">
            <span className="text-text-secondary font-medium">Batas Waktu Pengajuan (Submission Window)</span>
            <div className="text-base font-bold text-text-primary flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 text-brand-blue" />
              <span>30 Hari Kalender</span>
            </div>
            <p className="text-[11px] text-text-secondary/70">
              Hari publikasi = Hari ke-1. Deadline berakhir Hari ke-30 pukul 23:59:59 WIB.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle space-y-1">
            <span className="text-text-secondary font-medium">Nilai Tukar Poin Resmi</span>
            <div className="text-base font-bold text-text-primary flex items-center gap-2 font-mono">
              <Coins className="w-4 h-4 text-brand-blue" />
              <span>1.000 Views = 10 Poin</span>
            </div>
            <p className="text-[11px] text-text-secondary/70">
              Formula: floor(verifiedViews / 100). Mata uang resmi adalah Poin.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle space-y-1">
            <span className="text-text-secondary font-medium">Masa Kedaluwarsa Poin (Expiration)</span>
            <div className="text-base font-bold text-text-primary flex items-center gap-2 font-mono">
              <Calendar className="w-4 h-4 text-brand-blue" />
              <span>6 Bulan Kalender</span>
            </div>
            <p className="text-[11px] text-text-secondary/70">
              Setiap batch penerbitan memiliki lot mandiri. Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu saat penukaran hadiah.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle space-y-1">
            <span className="text-text-secondary font-medium">Platform & Bukti yang Didukung</span>
            <div className="text-base font-bold text-text-primary flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-status-success" />
              <span>TikTok & Instagram Reels</span>
            </div>
            <p className="text-[11px] text-text-secondary/70">
              Screenshot analitik views maks. 5 MB (JPG, JPEG, PNG, WEBP).
            </p>
          </div>
        </div>
      </Card>

      {/* Admin Role Bootstrap Tool Card */}
      <Card className="p-6 bg-card-surface border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border-subtle/60">
          <Shield className="w-4 h-4 text-brand-red" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            Administrative Role Bootstrap
          </h3>
        </div>

        <p className="text-xs text-text-secondary leading-relaxed">
          Sesuai Blueprint Bagian 3, akun admin tidak boleh dibuat melalui registrasi publik biasa. Gunakan fitur bootstrap aman ini dengan memasukkan <code>ADMIN_BOOTSTRAP_SECRET</code> server untuk mempromosikan akun admin baru.
        </p>

        {statusMessage && (
          <div className="p-3.5 rounded-xl bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handlePromoteAdmin} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Akun yang Ingin Dipromosikan"
              placeholder="admin@mrbobkampunginggris.com"
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              required
            />

            <Input
              label="Bootstrap Secret Key"
              placeholder="Masukkan secret key dari server"
              type="password"
              value={bootstrapSecret}
              onChange={(e) => setBootstrapSecret(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>Promosikan ke Role Admin</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
