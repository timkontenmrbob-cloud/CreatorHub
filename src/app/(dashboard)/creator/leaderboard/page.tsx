"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { Trophy } from "lucide-react";

export default function CreatorLeaderboardPage() {
  return (
    <ComingSoonModule
      title="Creator & Video Leaderboard"
      phase="Phase 6"
      description="Papan peringkat kreator dan konten berkinerja tertinggi berdasarkan views terverifikasi kuartalan."
      features={[
        "Dua klasemen independen: Top Performing Creators & Top Performing Videos",
        "Filter periode: 3 Bulan Terakhir, Q1, Q2, Q3, dan Q4",
        "Kategori konten: Daily Life, Review Kelas, Educational, Comedy, POV, Facilities, Challenge",
      ]}
      icon={Trophy}
      backHref="/creator/dashboard"
    />
  );
}
