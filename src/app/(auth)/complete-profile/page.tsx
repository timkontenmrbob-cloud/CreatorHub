"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { isValidIndonesianPhone, isProfileComplete } from "@/lib/supabase/auth";
import { UserProfile } from "@/lib/types/user";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  AtSign,
  ArrowRight,
  AlertCircle,
  Loader2,
  LogOut,
} from "lucide-react";

interface CompleteProfileFormProps {
  user: UserProfile;
}

function CompleteProfileForm({ user }: CompleteProfileFormProps) {
  const router = useRouter();
  const { completeProfile, logout } = useAuth();

  const [fullName, setFullName] = useState(user.displayName || "");
  const [whatsappNumber, setWhatsappNumber] = useState(user.phoneNumber || "");
  const [tiktokUsername, setTiktokUsername] = useState(user.tiktokUsername || "");
  const [instagramUsername, setInstagramUsername] = useState(user.instagramUsername || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const cleanName = fullName.trim();
    const cleanPhone = whatsappNumber.trim().replace(/[\s-]/g, "");
    const cleanTiktok = tiktokUsername.trim().replace(/^@+/, "");
    const cleanInstagram = instagramUsername.trim().replace(/^@+/, "");

    // 1. Validate Full Name
    if (!cleanName) {
      setFormError("Nama Lengkap wajib diisi.");
      return;
    }

    // 2. Validate WhatsApp Number
    if (!cleanPhone) {
      setFormError("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (!isValidIndonesianPhone(cleanPhone)) {
      setFormError("Format nomor WhatsApp tidak valid (contoh: 08123456789 atau +628123456789).");
      return;
    }

    // 3. Validate at least one social media handle
    if (!cleanTiktok && !cleanInstagram) {
      setFormError("Harap isi minimal satu username media sosial (TikTok atau Instagram).");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Save profile & 2. Mark completed & 3. Re-fetch from server
      await completeProfile({
        fullName: cleanName,
        whatsappNumber: cleanPhone,
        tiktokUsername: cleanTiktok || undefined,
        instagramUsername: cleanInstagram || undefined,
      });

      // 4. Authoritative redirect to dashboard with router refresh
      router.refresh();
      router.push("/creator/dashboard");
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message || "Gagal menyimpan data profil. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <Card className="p-6 sm:p-8 rounded-[24px] bg-card-surface border-border-subtle shadow-2xl relative overflow-hidden">
      {/* Subtle top accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-brand-blue to-transparent" />

      {/* Header */}
      <div className="mb-6 pt-1">
        <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          Lengkapi Profilmu
        </h2>
        <p className="text-sm text-text-secondary mt-1.5">
          Isi data dirimu untuk verifikasi konten dan klaim hadiah.
        </p>
      </div>

      {/* Error alert */}
      {formError && (
        <div className="mb-5 p-3.5 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{formError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Nama Lengkap */}
        <Input
          label="Nama Lengkap"
          type="text"
          placeholder="Nama lengkap kamu"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          leftIcon={<User className="w-4 h-4" />}
          required
        />

        {/* 2. Email (Read-only Google Email) */}
        <Input
          label="Email Akun Google"
          type="email"
          value={user.email}
          disabled
          leftIcon={<Mail className="w-4 h-4" />}
          className="cursor-not-allowed opacity-60 bg-bg-elevated/40"
        />

        {/* 3. Nomor WhatsApp */}
        <Input
          label="Nomor WhatsApp"
          type="tel"
          placeholder="08123456789 atau +628123456789"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          leftIcon={<Phone className="w-4 h-4" />}
          required
        />

        {/* 4. TikTok Username */}
        <Input
          label="TikTok Username (Opsional)"
          type="text"
          placeholder="username (tanpa @)"
          value={tiktokUsername}
          onChange={(e) => setTiktokUsername(e.target.value)}
          leftIcon={<AtSign className="w-4 h-4" />}
        />

        {/* 5. Instagram Username */}
        <Input
          label="Instagram Username (Opsional)"
          type="text"
          placeholder="username (tanpa @)"
          value={instagramUsername}
          onChange={(e) => setInstagramUsername(e.target.value)}
          leftIcon={<AtSign className="w-4 h-4" />}
        />

        {/* Primary CTA Submit Button */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full h-12 text-sm font-semibold shadow-lg shadow-brand-blue/20"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Simpan & Masuk Dashboard
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>

      {/* Account Switcher / Logout */}
      <div className="mt-6 pt-5 border-t border-border-subtle/50 flex items-center justify-between text-xs text-text-secondary">
        <span>{user.email}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-text-secondary hover:text-status-error transition-colors font-medium cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Ganti Akun</span>
        </button>
      </div>
    </Card>
  );
}

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  // Route protection guards
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (isAdmin) {
        router.push("/admin/dashboard");
      } else if (isProfileComplete(user)) {
        router.push("/creator/dashboard");
      }
    }
  }, [user, loading, isAdmin, router]);

  // Show loading state while checking session
  if (loading || !user) {
    return (
      <Card className="p-8 text-center text-text-secondary flex flex-col items-center justify-center min-h-[360px] rounded-[24px] bg-card-surface border-border-subtle">
        <Loader2 className="w-7 h-7 animate-spin text-brand-blue mb-3" />
        <span className="text-sm font-medium text-text-secondary">
          Memeriksa status akun...
        </span>
      </Card>
    );
  }

  // Once user is loaded and verified to have incomplete profile
  return <CompleteProfileForm user={user} />;
}
