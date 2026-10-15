"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { Card } from "@/components/ui/card";
import { isProfileComplete } from "@/lib/supabase/auth";
import { AlertCircle, Loader2 } from "lucide-react";

interface GoogleSignInCardProps {
  title?: string;
}

export function GoogleSignInCard({
  title = "Masuk ke Creator Hub",
}: GoogleSignInCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";
  const errorParam = searchParams.get("error");

  const { signInWithGoogle, user, loading, isAdmin, isConfigured } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const displayError = formError || errorParam || null;

  // If already logged in, redirect to appropriate destination
  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) {
        router.push("/admin/dashboard");
      } else if (!isProfileComplete(user)) {
        router.push("/complete-profile");
      } else if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push("/creator/dashboard");
      }
    }
  }, [user, loading, isAdmin, redirectUrl, router]);

  const handleGoogleSignIn = async () => {
    setFormError(null);

    if (!isConfigured) {
      setFormError(
        "Layanan autentikasi Mr.BOB Creator Hub sedang dalam pemeliharaan. Silakan coba kembali sesaat lagi."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithGoogle(redirectUrl || "/creator/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(
        error.message || "Gagal menghubungkan ke Google. Silakan coba kembali."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 sm:p-8 rounded-[24px] bg-card-surface border-border-subtle shadow-2xl relative overflow-hidden">
      {/* Subtle top ambient accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-brand-blue to-transparent" />

      {/* Header */}
      <div className="text-center mb-6 pt-1">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {title}
        </h2>
      </div>

      {/* Error alert */}
      {displayError && (
        <div className="mb-6 p-4 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{displayError}</span>
        </div>
      )}

      {/* Main Google Action */}
      <div>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || !isConfigured}
          className="w-full relative flex items-center justify-center gap-3.5 px-6 py-4 rounded-2xl bg-white hover:bg-slate-100 active:scale-[0.99] text-[#1F2937] font-semibold text-sm sm:text-base shadow-lg shadow-black/20 border border-white/20 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin text-brand-blue" />
          ) : (
            <svg
              className="w-5 h-5 shrink-0 transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
            >
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}

          <span>
            {isSubmitting ? "Menghubungkan ke Google..." : "Continue with Google"}
          </span>
        </button>
      </div>

      {/* Footer Info */}
      <div className="mt-8 pt-5 border-t border-border-subtle/50 text-center text-xs text-text-secondary/60 leading-relaxed">
        Dengan masuk, kamu menyetujui Ketentuan Layanan Mr.BOB Creator Hub.
      </div>
    </Card>
  );
}
