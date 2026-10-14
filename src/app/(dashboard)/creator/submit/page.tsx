"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { UploadCloud } from "lucide-react";

export default function SubmitContentPage() {
  return (
    <ComingSoonModule
      title="Submit Content Module"
      phase="Phase 3"
      description="Modul pengajuan video TikTok & IG Reels dengan formulir bukti insight views, upload screenshot, penghitungan estimasi poin otomatis, dan Smart Submission Reminder."
      features={[
        "Pilihan Platform: TikTok & Instagram Reels",
        "Input URL video & verifikasi tanggal posting manual",
        "Smart Submission Reminder dengan indikator sisa batas 30 hari",
        "Dua opsi aksi: 'Submit Sekarang' & 'Simpan Draft'",
        "Upload screenshot analitik insight views (JPG/PNG/WEBP maks 5 MB)",
        "Estimasi perolehan Poin instan (1.000 views = 10 Poin)",
        "Deteksi duplikasi submission video",
      ]}
      icon={UploadCloud}
      backHref="/creator/dashboard"
    />
  );
}
