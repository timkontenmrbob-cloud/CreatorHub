"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { isProfileComplete } from "@/lib/supabase/auth";
import { Loader2, ShieldAlert, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "creator" | "admin" | "super_admin";
}

export function ProtectedRoute({
  children,
  requiredRole = "creator",
}: ProtectedRouteProps) {
  const { user, loading, isAdmin, isSuperAdmin, isConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && isConfigured) {
      if (!user) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (!isAdmin && !isProfileComplete(user) && pathname !== "/complete-profile") {
        router.push("/complete-profile");
      }
    }
  }, [loading, isConfigured, user, isAdmin, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-card-surface border border-border-subtle flex items-center justify-center text-brand-blue mb-4 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
        </div>
        <p className="text-sm font-medium text-text-secondary">
          Memverifikasi sesi aman Mr.BOB Creator Hub...
        </p>
      </div>
    );
  }

  // If system configuration is pending
  if (!isConfigured) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-status-warning/10 text-status-warning border border-status-warning/20 mx-auto flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Layanan Sedang Disiapkan
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Untuk mengakses portal {requiredRole === "admin" ? "Admin" : "Creator"}, layanan autentikasi Mr.BOB Creator Hub sedang dalam konfigurasi.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login">
              <Button variant="secondary" className="w-full">
                Ke Halaman Masuk
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                Kembali ke Beranda
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect via useEffect
  }

  // Mandatory profile completion for creators
  if (!isAdmin && !isProfileComplete(user)) {
    return null; // Will redirect via useEffect to /complete-profile
  }

  // Role check: If super_admin is required but user is not super_admin
  if (requiredRole === "super_admin" && !isSuperAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-status-error/15 text-status-error border border-status-error/30 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Akses Ditolak
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Halaman ini dikhususkan untuk <strong>Super Administrator</strong> Mr.BOB Creator Hub. Akun Anda saat ini memiliki hak akses sebagai <strong>{user.role}</strong>.
            </p>
          </div>
          <div className="pt-2 flex gap-3 justify-center">
            <Link href="/admin/dashboard">
              <Button variant="primary">
                Ke Admin Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                Beranda
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Role check: If admin is required but user is not admin
  if (requiredRole === "admin" && !isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-status-error/15 text-status-error border border-status-error/30 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-text-primary">
              Akses Ditolak
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Halaman ini dikhususkan untuk Administrator Mr.BOB Creator Hub. Akun Anda saat ini memiliki hak akses sebagai <strong>{user.role}</strong>.
            </p>
          </div>
          <div className="pt-2 flex gap-3 justify-center">
            <Link href="/creator/dashboard">
              <Button variant="primary">
                Ke Dashboard Creator
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                Beranda
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
