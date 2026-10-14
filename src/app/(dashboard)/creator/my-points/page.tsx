"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Coins } from "lucide-react";

export default function MyPointsPage() {
  return (
    <ComingSoonModule
      title="Point Wallet & Expiration Tracker"
      phase="Phase 2"
      description="Dompet poin komprehensif dengan rincian lot kedaluwarsa 6 bulan, alokasi FEFO (First Expired, First Out), dan riwayat mutasi poin."
      features={[
        "Rincian Available Points, Pending Points, Redeemed Points, dan Expired Points",
        "Pemberitahuan lot poin kedaluwarsa (30 hari, 7 hari, 1 hari)",
        "Buku besar transaksi poin yang tidak dapat diubah (Immutable Ledger)",
        "Daftar lot poin per submission video",
      ]}
      icon={Coins}
      backHref="/creator/dashboard"
    />
  );
}
