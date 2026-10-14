"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SupabaseStatusBanner } from "@/components/auth/supabase-status-banner";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Phone,
  AtSign,
  CheckCircle2,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading, isConfigured } = useAuth();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tiktokUsername, setTiktokUsername] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.push("/creator/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessInfo(null);

    if (!displayName.trim() || !email.trim() || !password) {
      setFormError("Nama, email, dan kata sandi wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setFormError("Kata sandi minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    if (!isConfigured) {
      setFormError(
        "Koneksi Supabase belum dikonfigurasi. Silakan periksa petunjuk setup di atas."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await register({
        displayName: displayName.trim(),
        email: email.trim(),
        password,
        tiktokUsername: tiktokUsername.trim().replace(/^@/, ""),
        instagramUsername: instagramUsername.trim().replace(/^@/, ""),
        phoneNumber: phoneNumber.trim(),
      });

      if (result.needsEmailConfirmation) {
        setSuccessInfo(
          "Pendaftaran berhasil! Tautan konfirmasi telah dikirim ke email Anda. Silakan verifikasi email Anda sebelum login."
        );
      } else {
        router.push("/creator/dashboard");
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Pendaftaran gagal. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <SupabaseStatusBanner />

      <Card className="p-6 sm:p-8 rounded-[20px] bg-card-surface border-border-subtle shadow-2xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="brand" size="sm">
              <Sparkles className="w-3 h-3" /> Tanpa Minimal Followers
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Gabung Sebagai Creator
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Mulai post video TikTok & IG Reels seputar Mr.BOB, kumpulkan poin, dan tukarkan hadiahmu!
          </p>
        </div>

        {successInfo && (
          <div className="mb-5 p-3.5 rounded-xl bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successInfo}</span>
          </div>
        )}

        {formError && (
          <div className="mb-5 p-3.5 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nama Lengkap"
            placeholder="misal: Amanda Clarissa"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            leftIcon={<User className="w-4 h-4" />}
            required
          />

          <Input
            label="Email"
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
            autoComplete="email"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Kata Sandi"
              type="password"
              placeholder="Min. 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              required
            />

            <Input
              label="Ulangi Sandi"
              type="password"
              placeholder="Ketik ulang sandi"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Username TikTok (Opsional)"
              placeholder="@username"
              value={tiktokUsername}
              onChange={(e) => setTiktokUsername(e.target.value)}
              leftIcon={<AtSign className="w-4 h-4" />}
            />

            <Input
              label="Username Instagram (Opsional)"
              placeholder="@username"
              value={instagramUsername}
              onChange={(e) => setInstagramUsername(e.target.value)}
              leftIcon={<AtSign className="w-4 h-4" />}
            />
          </div>

          <Input
            label="Nomor WhatsApp (Opsional)"
            placeholder="0812xxxxxxx"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
            helperText="Digunakan untuk koordinasi pengiriman hadiah merchandise."
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isSubmitting}
              disabled={!isConfigured}
            >
              Daftar Sekarang
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-border-subtle/60 text-center">
          <p className="text-xs text-text-secondary">
            Sudah punya akun?{" "}
            <Link
              href="/login"
              className="font-semibold text-brand-blue hover:text-brand-blue-hover transition-colors"
            >
              Masuk di sini
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
