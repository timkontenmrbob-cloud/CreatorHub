"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Gift } from "lucide-react";

export default function RewardShopPage() {
  return (
    <ComingSoonModule
      title="Official Reward Shop"
      phase="Phase 5"
      description="Toko penukaran reward resmi Mr.BOB dengan stok dinamis, verifikasi kuota, dan sistem penukaran FEFO."
      features={[
        "13 pilihan katalog resmi mulai 10 Poin (Keychain) hingga 50.000 Poin (Program 3 Bulan)",
        "Validasi saldo poin real-time mencegah over-spending",
        "Formulir data pengiriman merchandise atau nomor pendaftaran program kelas",
        "Status ketersediaan stok & kuota kuartal",
      ]}
      icon={Gift}
      backHref="/creator/dashboard"
    />
  );
}
