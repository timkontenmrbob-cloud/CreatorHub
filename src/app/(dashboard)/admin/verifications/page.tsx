"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { CheckSquare } from "lucide-react";

export default function AdminVerificationsPage() {
  return (
    <ComingSoonModule
      title="Content Verification Queue"
      phase="Phase 4"
      description="Pusat pemeriksaan bukti screenshot insight, tanggal posting asli, evaluasi views, dan persetujuan penerbitan Poin resmi."
      features={[
        "Antrean review video dengan status filter (Submitted, Under Review, Approved, Rejected)",
        "Review visual screenshot analitik dengan fitur zoom & perbandingan claimed vs verified views",
        "Validasi tanggal posting maksimal 30 hari kalender",
        "Penentuan verified views oleh admin (dapat mengoreksi bila ada deviasi)",
        "Pemberian catatan/alasan penolakan atau permintaan bukti tambahan",
        "Operasi atomik penerbitan point lots setelah disetujui",
      ]}
      icon={CheckSquare}
      backHref="/admin/dashboard"
    />
  );
}
