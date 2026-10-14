"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Trophy } from "lucide-react";

export default function AdminLeaderboardPage() {
  return (
    <ComingSoonModule
      title="Leaderboard Management"
      phase="Phase 6"
      description="Konfigurasi dan pengawasan papan peringkat performa kreator dan video terbaik untuk riset kuartalan."
      features={[
        "Pengawasan klasemen Top Creators & Top Videos",
        "Kategorisasi konten kreator (Daily Life, Review Kelas, Edukasi, dll)",
        "Finalisasi leaderboard kuartal",
        "Publikasi hall of fame ke beranda publik",
      ]}
      icon={Trophy}
      backHref="/admin/dashboard"
    />
  );
}
