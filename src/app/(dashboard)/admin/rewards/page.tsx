"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Gift } from "lucide-react";

export default function AdminRewardsPage() {
  return (
    <ComingSoonModule
      title="Reward Inventory Management"
      phase="Phase 5"
      description="Manajemen katalog 13 hadiah resmi Mr.BOB, penyesuaian stok fisik merchandise, kuota kelas, dan status ketersediaan reward."
      features={[
        "Kelola 13 reward resmi: Merchandise, Voucher, dan Program Kelas",
        "Atur stok fisik dan batasan kuota per kuartal",
        "Penetapan poin yang dibutuhkan per reward",
        "Status ketersediaan reward (Aktif / Habis)",
      ]}
      icon={Gift}
      backHref="/admin/dashboard"
    />
  );
}
