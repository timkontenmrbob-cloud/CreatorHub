"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { FileCheck2 } from "lucide-react";

export default function AdminRedemptionsPage() {
  return (
    <ComingSoonModule
      title="Redemption Requests & Fulfillment"
      phase="Phase 5"
      description="Pemrosesan permohonan klaim reward dari kreator, input resi ekspedisi paket, dan aktivasi kode program belajar."
      features={[
        "Antrean klaim penukaran: Menunggu Diproses, Dikirim, Selesai",
        "Input nomor resi pengiriman merchandise fisik",
        "Pemberian kode voucher / link registrasi kelas kursus Pare",
        "Riwayat audit konsumsi point lots FEFO",
      ]}
      icon={FileCheck2}
      backHref="/admin/dashboard"
    />
  );
}
