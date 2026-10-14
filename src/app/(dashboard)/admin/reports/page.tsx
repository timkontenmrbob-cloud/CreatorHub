"use client";

import React from "react";
import { ComingSoonModule } from "@/components/dashboard/coming-soon-card";
import { FileSpreadsheet } from "lucide-react";

export default function AdminReportsPage() {
  return (
    <ComingSoonModule
      title="Reports & Data Export"
      phase="Phase 7"
      description="Ekspor laporan resmi kuartalan dalam format CSV/Excel untuk keperluan evaluasi internal manajemen Mr.BOB."
      features={[
        "Ekspor rekap performa submission per kuartal",
        "Ekspor riwayat klaim reward & fulfillment",
        "Laporan pengeluaran poin & efisiensi marketing UGC",
        "Snapshot data terarsip yang tidak berubah setelah kuartal ditutup",
      ]}
      icon={FileSpreadsheet}
      backHref="/admin/dashboard"
    />
  );
}
