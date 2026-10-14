"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SupabaseStatusBanner } from "@/components/auth/supabase-status-banner";
import { Mail, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const resetSuccess = searchParams.get("reset") === "success";

  const { login, user, loading, isAdmin, isConfigured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // If already logged in, redirect automatically
  useEffect(() => {
    if (!loading && user) {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (isAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.push("/creator/dashboard");
      }
    }
  }, [user, loading, isAdmin, redirectUrl, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email.trim() || !password) {
      setFormError("Silakan isi email dan kata sandi.");
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
      await login(email.trim(), password);
      // Navigation will trigger via useEffect once user state updates
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Gagal masuk. Periksa kembali email dan sandi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 rounded-[20px] bg-card-surface border-border-subtle shadow-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text-primary tracking-tight">
          Masuk ke Akun
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Lanjutkan untuk kelola video, cek poin, dan klaim reward.
        </p>
      </div>

      {resetSuccess && (
        <div className="mb-5 p-3.5 rounded-xl bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Tautan reset kata sandi telah dikirim ke email Anda. Silakan periksa inbox/spam.</span>
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
          label="Email"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="w-4 h-4" />}
          autoComplete="email"
          required
        />

        <Input
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="w-4 h-4" />}
          autoComplete="current-password"
          required
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
            Masuk Sekarang
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-border-subtle/60 text-center">
        <p className="text-xs text-text-secondary">
          Belum punya akun Creator?{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-blue hover:text-brand-blue-hover transition-colors"
          >
            Daftar Gratis di sini
          </Link>
        </p>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full">
      <SupabaseStatusBanner />
      <Suspense
        fallback={
          <Card className="p-8 text-center text-text-secondary flex flex-col items-center justify-center min-h-[300px]">
            <Loader2 className="w-6 h-6 animate-spin text-brand-blue mb-2" />
            <span className="text-xs">Memuat halaman login...</span>
          </Card>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
