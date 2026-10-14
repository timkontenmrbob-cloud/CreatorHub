"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Sparkles } from "lucide-react";

export default function MyRewardsPage() {
  return (
    <ComingSoonModule
      title="My Rewards History"
      phase="Phase 5"
      description="Riwayat klaim reward yang telah kamu lakukan, resi pengiriman merchandise, dan kode voucher program kelas."
      features={[
        "Status fulfillment: Diproses, Dikirim, Selesai",
        "Nomor resi ekspedisi untuk pengiriman barang merchandise",
        "Voucher kode unik & instruksi aktivasi program kursus Pare",
      ]}
      icon={Sparkles}
      backHref="/creator/dashboard"
    />
  );
}
