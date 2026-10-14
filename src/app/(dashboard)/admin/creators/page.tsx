"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Users } from "lucide-react";

export default function AdminCreatorsPage() {
  return (
    <ComingSoonModule
      title="Creator Management"
      phase="Phase 4"
      description="Manajemen direktori kreator terdaftar, riwayat pengajuan video, audit saldo poin, dan verifikasi profil."
      features={[
        "Daftar kreator dengan pencarian nama, email, dan username TikTok/IG",
        "Inspeksi riwayat pengajuan video per kreator",
        "Audit saldo poin (Tersedia, Pending, Terpakai, Expired)",
        "Pengaturan status akun kreator",
      ]}
      icon={Users}
      backHref="/admin/dashboard"
    />
  );
}
