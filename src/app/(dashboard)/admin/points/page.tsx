"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Coins } from "lucide-react";

export default function AdminPointsPage() {
  return (
    <ComingSoonModule
      title="Points Management & Ledger"
      phase="Phase 2"
      description="Buku besar mutasi poin terpusat (Immutable Ledger), pemantauan lot kedaluwarsa 6 bulan, dan rekonsiliasi poin."
      features={[
        "Ledger transaksi poin: Earned, Redeemed, Reversed, Expired",
        "Pemantauan point lots per batch pengajuan",
        "Audit trail perubahan saldo yang terverifikasi aman",
        "Simulasi & rekonsiliasi masa aktif FEFO",
      ]}
      icon={Coins}
      backHref="/admin/dashboard"
    />
  );
}
