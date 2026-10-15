import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchQuarterlyAnalytics } from "@/lib/supabase/analytics";
import { QuarterName, CAMPAIGN_COST_CATEGORY_LABELS } from "@/lib/types/analytics";

function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes(";")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!adminRole || !["admin", "superadmin", "super_admin"].includes(adminRole.role as string)) {
      return NextResponse.json(
        { error: "Forbidden: Unduh laporan terbatas untuk administrator." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const yearParam = searchParams.get("year");
    const quarterParam = searchParams.get("quarter") as QuarterName | null;

    const currentYear = new Date().getFullYear();
    const year = yearParam ? parseInt(yearParam, 10) : currentYear;
    const quarter: QuarterName =
      quarterParam && ["Q1", "Q2", "Q3", "Q4"].includes(quarterParam)
        ? quarterParam
        : "Q3";

    const data = await fetchQuarterlyAnalytics(year, quarter);

    const lines: string[] = [];

    // Header
    const calendarStatus = data.period.isCurrentQuarter ? "Sedang Berjalan" : "Periode Berakhir";
    const reportStatus = data.activeSnapshot
      ? (data.activeSnapshot.status === "revised" ? "Revisi" : "Final")
      : "Draft";

    lines.push("MR.BOB CREATOR HUB — LAPORAN KINERJA KAMPANYE UGC");
    lines.push(`Periode,${escapeCsvCell(data.period.quarterLabel)},${escapeCsvCell(data.period.label)}`);
    lines.push(`Status Periode,${escapeCsvCell(calendarStatus)}`);
    lines.push(`Status Laporan,${escapeCsvCell(reportStatus)}`);
    lines.push(`Tanggal Generate,${escapeCsvCell(new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))} WIB`);
    lines.push("");

    // 1. KPI UTAMA
    lines.push("1. RINGKASAN KPI UTAMA (CORE METRICS)");
    lines.push("Metrik,Nilai,Catatan");
    lines.push(`Total Konten UGC Diajukan,${data.kpis.totalSubmissions},Semua pengajuan non-draft pada kuartal ini`);
    lines.push(`Kreator Berpartisipasi,${data.kpis.participatingCreators},Jumlah unik kreator aktif`);
    lines.push(`Total Verified Views,${data.kpis.totalVerifiedViews},Akumulasi views video disetujui`);
    lines.push(`Total Poin UGC Diterbitkan,${data.kpis.totalPointsIssued},Poin reward dompet kreator`);
    lines.push(
      `Tingkat Persetujuan (Approval Rate),${
        data.kpis.approvalRate !== null ? `${data.kpis.approvalRate}%` : "N/A"
      },Rasio Approved vs Disetujui + Ditolak`
    );
    lines.push(`Video Disetujui (Approved),${data.kpis.approvedCount},Lolos verifikasi views`);
    lines.push(`Video Ditolak (Rejected),${data.kpis.rejectedCount},Tidak memenuhi pedoman`);
    lines.push(`Video Sedang Direview (Pending),${data.kpis.pendingCount},Menunggu keputusan admin`);
    lines.push(`Total Klaim Reward Diajukan,${data.kpis.totalRewardsClaimed},Permintaan penukaran reward`);
    lines.push(`Klaim Selesai (Completed),${data.kpis.rewardsCompletedCount},Fulfillment tuntas`);
    lines.push(`Klaim Dalam Proses / Siap,${data.kpis.rewardsPendingCount},Sedang disiapkan / dikirim`);
    lines.push(`Klaim Ditolak / Batal,${data.kpis.rewardsRejectedCount},Poin dikembalikan`);
    lines.push(`Total Poin Reward Dibelanjakan,${data.kpis.rewardsPointsSpent},Total poin yang ditukar`);
    lines.push("");

    // 2. PERBANDINGAN QOQ
    lines.push(`2. PERBANDINGAN DENGAN KUARTAL SEBELUMNYA (${data.previousPeriod.quarterLabel})`);
    lines.push("Indikator,Kuartal Ini,Kuartal Lalu,Selisih,Pertumbuhan (%)");
    const qoqRows = [
      { name: "Total Konten UGC", q: data.qoq.submissions },
      { name: "Kreator Berpartisipasi", q: data.qoq.creators },
      { name: "Video Disetujui", q: data.qoq.approvedVideos },
      { name: "Total Verified Views", q: data.qoq.verifiedViews },
      { name: "Total Poin Diterbitkan", q: data.qoq.pointsIssued },
      { name: "Total Klaim Reward", q: data.qoq.rewardsClaimed },
    ];
    for (const r of qoqRows) {
      const pct =
        r.q.percentageChange !== null
          ? `${r.q.percentageChange > 0 ? "+" : ""}${r.q.percentageChange}%`
          : r.q.comparisonNote || "N/A";
      lines.push(
        `${escapeCsvCell(r.name)},${r.q.current},${r.q.previous},${
          r.q.difference > 0 ? `+${r.q.difference}` : r.q.difference
        },${escapeCsvCell(pct)}`
      );
    }
    lines.push("");

    // 3. BULANAN
    lines.push("3. RINCIAN KINERJA BULANAN");
    lines.push("Bulan,Video Diajukan,Verified Views,Kreator Aktif,Poin Diterbitkan");
    for (const m of data.monthlyBreakdown) {
      lines.push(
        `${escapeCsvCell(m.monthName)},${m.submittedVideos},${m.verifiedViews},${m.participatingCreators},${m.pointsIssued}`
      );
    }
    lines.push("");

    // 4. PLATFORM
    lines.push("4. PERBANDINGAN PLATFORM (TIKTOK VS INSTAGRAM REELS)");
    lines.push(
      "Platform,Pengajuan,Disetujui,Total Verified Views,Rata-rata Views/Video,Approval Rate,Pangsa Views (%)"
    );
    for (const p of data.platformComparison) {
      const rate = p.approvalRate !== null ? `${p.approvalRate}%` : "N/A";
      lines.push(
        `${escapeCsvCell(p.platform)},${p.submittedCount},${p.approvedCount},${
          p.totalVerifiedViews
        },${p.averageViewsPerVideo},${escapeCsvCell(rate)},${p.shareOfVerifiedViews}%`
      );
    }
    lines.push("");

    // 5. FORMAT KONTEN
    lines.push("5. ANALISIS FORMAT KONTEN");
    lines.push("Format Kategori,Video Disetujui,Total Verified Views,Rata-rata Views,Pangsa Views (%)");
    if (data.contentFormats.length === 0) {
      lines.push("Kategori konten belum tersedia.,0,0,0,0%");
    } else {
      for (const f of data.contentFormats) {
        lines.push(
          `${escapeCsvCell(f.category)},${f.approvedVideos},${f.totalVerifiedViews},${
            f.averageViewsPerVideo
          },${f.shareOfViews}%`
        );
      }
    }
    lines.push("");

    // 6. TOP 10 KREATOR
    lines.push("6. TOP 10 KREATOR TERBAIK KUARTAL INI");
    lines.push("Peringkat,Nama Kreator,Handle Media Sosial,Video Disetujui,Total Verified Views,Poin Diperoleh");
    if (data.topCreators.length === 0) {
      lines.push("Belum ada kreator dengan konten terverifikasi pada kuartal ini.,,,,");
    } else {
      for (const c of data.topCreators) {
        lines.push(
          `${c.rank},${escapeCsvCell(c.name)},${escapeCsvCell(c.handle || "-")},${c.approvedVideos},${
            c.totalViews
          },${c.totalPoints}`
        );
      }
    }
    lines.push("");

    // 7. TOP 10 VIDEO
    lines.push("7. TOP 10 VIDEO DENGAN VIEWS TERBANYAK");
    lines.push("Peringkat,Kreator,Platform,Tanggal Posting,Verified Views,Poin,URL Video");
    if (data.topVideos.length === 0) {
      lines.push("Belum ada video terverifikasi pada kuartal ini.,,,,,,");
    } else {
      for (const v of data.topVideos) {
        lines.push(
          `${v.rank},${escapeCsvCell(v.creatorName)},${escapeCsvCell(v.platform)},${
            v.postingDate
          },${v.views},${v.points},${escapeCsvCell(v.videoUrl)}`
        );
      }
    }
    lines.push("");

    // 8. BIAYA REWARD & EFISIENSI KAMPANYE
    lines.push("8. BIAYA REWARD & EFISIENSI KAMPANYE (CPV)");
    lines.push(
      `Total Pengeluaran Kampanye (IDR),Rp${data.rewardCosts.totalAttributableCostIdr.toLocaleString("id-ID")}`
    );
    lines.push(
      `Cost per 1.000 Verified Views (CPV),${
        data.rewardCosts.costPerThousandViewsIdr !== null
          ? `Rp${data.rewardCosts.costPerThousandViewsIdr.toLocaleString("id-ID")}`
          : data.rewardCosts.note || "Data biaya belum lengkap."
      }`
    );
    lines.push("");
    lines.push("Rincian Pengeluaran Terverifikasi:");
    lines.push("Tanggal Beban,Kategori Biaya,Deskripsi Pengeluaran,Nominal (IDR)");
    if (data.rewardCosts.costs.length === 0) {
      lines.push("Data biaya riil belum dicatatkan untuk kuartal ini.,,,");
    } else {
      for (const c of data.rewardCosts.costs) {
        const catLabel =
          CAMPAIGN_COST_CATEGORY_LABELS[c.category] || c.category;
        lines.push(
          `${c.expenseDate},${escapeCsvCell(catLabel)},${escapeCsvCell(c.description)},${c.amountIdr}`
        );
      }
    }

    // Prepend UTF-8 BOM so Excel opens with proper encoding
    const csvContent = "\uFEFF" + lines.join("\r\n");

    const fileName = `ugc-analytics-${quarter.toLowerCase()}-${year}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      throw error;
    }
    console.error("CSV Export Error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengekspor data CSV.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
