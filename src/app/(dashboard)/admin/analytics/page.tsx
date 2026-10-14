"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { BarChart3 } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <ComingSoonModule
      title="Quarterly Analytics & Research"
      phase="Phase 7"
      description="Analisis performa konten, pertumbuhan views, efektivitas platform (TikTok vs IG Reels), dan ekonomi Poin."
      features={[
        "Metrik kuartal: Total Kreator, Valid UGC, Total Views, Rata-rata Views per Video",
        "Perbandingan performa antar kuartal (Q1, Q2, Q3, Q4)",
        "Biaya reward riil per 1.000 verified views",
        "Distribusi kategori konten terbaik (Daily Life, Review, POV, dll)",
      ]}
      icon={BarChart3}
      backHref="/admin/dashboard"
    />
  );
}
