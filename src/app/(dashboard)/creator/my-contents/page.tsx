"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Film } from "lucide-react";

export default function MyContentsPage() {
  return (
    <ComingSoonModule
      title="My Contents & Drafts"
      phase="Phase 3"
      description="Daftar lengkap seluruh video yang telah kamu ajukan beserta riwayat draft submission yang belum selesai."
      features={[
        "Status tracking: Draft, Submitted, Under Review, Approved, Rejected, Additional Evidence",
        "Penyimpanan draft sementara dengan deadline countdown",
        "Rincian views yang diajukan vs views yang diverifikasi oleh admin",
        "Catatan verifikasi dari tim kurasi Mr.BOB",
      ]}
      icon={Film}
      backHref="/creator/dashboard"
    />
  );
}
