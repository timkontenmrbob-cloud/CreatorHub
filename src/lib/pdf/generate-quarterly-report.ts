import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QuarterlyAnalyticsData } from "../types/analytics";
import { MRBOB_LOGO_BASE64 } from "./logo-base64";

/**
 * Format numbers in Indonesian locale (e.g. 35.900)
 */
function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("id-ID");
}

/**
 * Format currency in Indonesian Rupiah
 */
function formatRupiah(amount: number): string {
  return "Rp " + amount.toLocaleString("id-ID");
}

/**
 * Format percentage
 */
function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined) return "Belum dapat dibandingkan";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

/**
 * Generates an official, clean, management-ready PDF executive report for Mr.BOB Creator Hub.
 * Strict A4 Portrait, white paper background, dark text, brand-blue accents, and crisp tables.
 */
export function generateQuarterlyPDF(data: QuarterlyAnalyticsData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const COLOR_PRIMARY = [26, 29, 36] as [number, number, number]; // Dark Charcoal #1A1D24
  const COLOR_SECONDARY = [95, 105, 120] as [number, number, number]; // Slate Gray #5F6978
  const COLOR_BRAND = [57, 123, 232] as [number, number, number]; // Mr.BOB Blue #397BE8
  const COLOR_LIGHT_BG = [246, 248, 252] as [number, number, number]; // Soft Slate #F6F8FC
  const COLOR_BORDER = [222, 227, 237] as [number, number, number]; // Subtle Border #DEE3ED
  const COLOR_WARNING = [217, 119, 6] as [number, number, number]; // Amber #D97706
  const COLOR_SUCCESS = [16, 149, 93] as [number, number, number]; // Green #10955D

  const nowWib = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) + " WIB";

  // Helper to draw standard header on every page
  const drawPageHeader = (pageNumber: number = 1) => {
    void pageNumber;
    // Logo
    try {
      doc.addImage(MRBOB_LOGO_BASE64, "PNG", margin, 10, 18, 18 * (5586 / 5600), undefined, "FAST");
    } catch {
      // Fallback if image fails
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text("Mr.BOB Kampung Inggris", margin + 22, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text("Creator Hub • Laporan Eksekutif Kinerja Kampanye UGC", margin + 22, 21);
    doc.text("Kuartal: " + data.period.quarterLabel + " (" + data.period.label + ")", margin + 22, 25);

    // Right-aligned status badge with clear separation of Calendar Period vs Report Status
    const calendarStatus = data.period.isCurrentQuarter ? "Sedang Berjalan" : "Periode Berakhir";
    const reportStatus = data.activeSnapshot
      ? (data.activeSnapshot.status === "revised" ? "Revisi" : "Final")
      : "Draft";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    if (reportStatus === "Final") {
      doc.setTextColor(...COLOR_SUCCESS);
    } else if (reportStatus === "Revisi") {
      doc.setTextColor(...COLOR_PRIMARY);
    } else {
      doc.setTextColor(...COLOR_WARNING);
    }
    doc.text(`STATUS LAPORAN: ${reportStatus.toUpperCase()}`, pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(`Status Periode: ${calendarStatus}`, pageWidth - margin, 19.5, { align: "right" });
    doc.text("Dicetak: " + nowWib, pageWidth - margin, 24, { align: "right" });

    // Separator line
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.line(margin, 31, pageWidth - margin, 31);
  };

  // Helper to draw standard footer on every page
  const drawPageFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 12;
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text("Dokumen Resmi Manajemen Mr.BOB Kampung Inggris • Rahasia & Terbatas", margin, footerY + 2);
    doc.text(`Halaman ${pageNumber} dari ${totalPages}`, pageWidth - margin, footerY + 2, { align: "right" });
  };

  // ==========================================================================
  // PAGE 1 — EXECUTIVE SUMMARY & CORE KPIS
  // ==========================================================================
  drawPageHeader(1);

  let currentY = 40;

  // Title Banner
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("RINGKASAN EKSEKUTIF KINERJA UGC", margin, currentY);

  currentY += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text(
    `Periode evaluasi resmi kuartal ${data.period.quarterLabel} (${data.period.label}). Waktu acuan: Asia/Jakarta (WIB).`,
    margin,
    currentY
  );

  currentY += 8;

  // 6 Core KPI Cards (2 rows x 3 columns)
  const cardWidth = (contentWidth - 8) / 3;
  const cardHeight = 24;

  const kpisToRender = [
    {
      title: "TOTAL KONTEN UGC",
      value: formatNum(data.kpis.totalSubmissions),
      unit: "Video Diajukan",
      sub: `${data.kpis.approvedCount} Disetujui • ${data.kpis.pendingCount} Menunggu`,
    },
    {
      title: "CREATOR BERPARTISIPASI",
      value: formatNum(data.kpis.participatingCreators),
      unit: "Creator Unik",
      sub: "Kontributor aktif periode ini",
    },
    {
      title: "TOTAL VERIFIED VIEWS",
      value: formatNum(data.kpis.totalVerifiedViews),
      unit: "Organic Views",
      sub: "Hanya video disetujui resmi",
    },
    {
      title: "TOTAL POIN DITERBITKAN",
      value: formatNum(data.kpis.totalPointsIssued),
      unit: "Poin UGC",
      sub: "1.000 verified views = 10 poin",
    },
    {
      title: "APPROVAL RATE",
      value: data.kpis.approvalRate !== null ? `${data.kpis.approvalRate}%` : "N/A",
      unit: "Tingkat Kelayakan",
      sub: `${data.kpis.rejectedCount} konten tidak lolos`,
    },
    {
      title: "TOTAL REWARD DIKLAIM",
      value: formatNum(data.kpis.totalRewardsClaimed),
      unit: "Klaim Hadiah",
      sub: `${formatNum(data.kpis.rewardsPointsSpent)} poin ditukarkan`,
    },
  ];

  kpisToRender.forEach((card, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = margin + col * (cardWidth + 4);
    const y = currentY + row * (cardHeight + 4);

    // Box background & border
    doc.setFillColor(...COLOR_LIGHT_BG);
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(card.title, x + 3.5, y + 5);

    // Main Value
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLOR_BRAND);
    doc.text(card.value, x + 3.5, y + 13);

    // Unit
    const valueWidth = doc.getTextWidth(card.value);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_PRIMARY);
    doc.text(card.unit, x + 3.5 + valueWidth + 2, y + 13);

    // Subtitle
    doc.setFontSize(6.5);
    doc.setTextColor(...COLOR_SECONDARY);
    doc.text(card.sub, x + 3.5, y + 19);
  });

  currentY += cardHeight * 2 + 12;

  // QoQ Comparison Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Perbandingan Kinerja Antar-Kuartal (Quarter-over-Quarter)", margin, currentY);

  currentY += 3;

  const qoqTableBody = [
    [
      "Total Konten UGC Diajukan",
      formatNum(data.kpis.totalSubmissions),
      formatNum(data.previousKpis.totalSubmissions),
      (data.qoq.submissions.difference > 0 ? "+" : "") + formatNum(data.qoq.submissions.difference),
      formatPercent(data.qoq.submissions.percentageChange),
    ],
    [
      "Creator Berpartisipasi (Unik)",
      formatNum(data.kpis.participatingCreators),
      formatNum(data.previousKpis.participatingCreators),
      (data.qoq.creators.difference > 0 ? "+" : "") + formatNum(data.qoq.creators.difference),
      formatPercent(data.qoq.creators.percentageChange),
    ],
    [
      "Konten Video Disetujui",
      formatNum(data.kpis.approvedCount),
      formatNum(data.previousKpis.approvedCount),
      (data.qoq.approvedVideos.difference > 0 ? "+" : "") + formatNum(data.qoq.approvedVideos.difference),
      formatPercent(data.qoq.approvedVideos.percentageChange),
    ],
    [
      "Total Verified Views",
      formatNum(data.kpis.totalVerifiedViews),
      formatNum(data.previousKpis.totalVerifiedViews),
      (data.qoq.verifiedViews.difference > 0 ? "+" : "") + formatNum(data.qoq.verifiedViews.difference),
      formatPercent(data.qoq.verifiedViews.percentageChange),
    ],
    [
      "Total Poin Diterbitkan",
      formatNum(data.kpis.totalPointsIssued),
      formatNum(data.previousKpis.totalPointsIssued),
      (data.qoq.pointsIssued.difference > 0 ? "+" : "") + formatNum(data.qoq.pointsIssued.difference),
      formatPercent(data.qoq.pointsIssued.percentageChange),
    ],
    [
      "Klaim Hadiah (Redemptions)",
      formatNum(data.kpis.totalRewardsClaimed),
      formatNum(data.previousKpis.totalRewardsClaimed),
      (data.qoq.rewardsClaimed.difference > 0 ? "+" : "") + formatNum(data.qoq.rewardsClaimed.difference),
      formatPercent(data.qoq.rewardsClaimed.percentageChange),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Metrik Evaluasi",
        `Kuartal Ini (${data.period.quarterLabel})`,
        "Kuartal Lalu",
        "Selisih (+/-)",
        "Pertumbuhan (%)",
      ],
    ],
    body: qoqTableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center" },
      4: { halign: "center", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // Brief Executive Callout box at bottom of Page 1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page1LastY = (doc as any).lastAutoTable?.finalY || currentY + 50;
  const calloutY = page1LastY + 6;
  doc.setFillColor(240, 246, 255);
  doc.setDrawColor(...COLOR_BRAND);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, calloutY, contentWidth, 22, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_BRAND);
  doc.text("POIN KUNCI MANAJEMEN:", margin + 4, calloutY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_PRIMARY);
  const calloutText =
    `Pada periode ${data.period.quarterLabel}, program Creator Hub menghasilkan ${formatNum(
      data.kpis.totalVerifiedViews
    )} tayangan organik terverifikasi dari ${formatNum(data.kpis.approvedCount)} konten disetujui. ` +
    `Efektivitas peninjauan konten berada pada tingkat persetujuan ${
      data.kpis.approvalRate !== null ? data.kpis.approvalRate + "%" : "100%"
    }, dengan ${formatNum(data.kpis.totalPointsIssued)} poin resmi diterbitkan kepada kreator terpilih.`;
  doc.text(doc.splitTextToSize(calloutText, contentWidth - 8), margin + 4, calloutY + 11);

  // ==========================================================================
  // PAGE 2 — CAMPAIGN PERFORMANCE (MONTHLY, PLATFORM & TOP RANKINGS)
  // ==========================================================================
  doc.addPage();
  drawPageHeader(2);

  currentY = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("1. KINERJA BULANAN & PLATFORM MEDIA SOSIAL", margin, currentY);

  currentY += 6;

  // Monthly breakdown table
  const monthlyTableBody = data.monthlyBreakdown.map((m) => [
    m.monthName,
    formatNum(m.submittedVideos),
    formatNum(m.verifiedViews),
    formatNum(m.participatingCreators),
    formatNum(m.pointsIssued),
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Bulan Evaluasi", "Video Diajukan", "Verified Views", "Creator Aktif", "Poin Diterbitkan"]],
    body: monthlyTableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 45 },
      1: { halign: "center" },
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY + 8;

  // Platform comparison table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Perbandingan Platform: Instagram Reels vs TikTok", margin, currentY);

  currentY += 3;

  const platformTableBody = data.platformComparison.map((p) => [
    p.platform,
    formatNum(p.submittedCount),
    formatNum(p.approvedCount),
    formatNum(p.totalVerifiedViews),
    formatNum(p.averageViewsPerVideo),
    p.approvalRate !== null ? `${p.approvalRate}%` : "—",
    `${p.shareOfVerifiedViews}%`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        "Platform Media Sosial",
        "Pengajuan",
        "Disetujui",
        "Total Views",
        "Rata-rata Views/Video",
        "Approval Rate",
        "Pangsa Views (%)",
      ],
    ],
    body: platformTableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.8,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 40 },
      1: { halign: "center" },
      2: { halign: "center" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" },
      5: { halign: "center" },
      6: { halign: "center", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY + 8;

  // Top Creators & Top Videos
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Top 5 Creator Terbaik (Berdasarkan Poin Diterima)", margin, currentY);

  currentY += 3;

  const topCreatorsBody = data.topCreators.slice(0, 5).map((c) => [
    `#${c.rank}`,
    c.name,
    c.handle ? `@${c.handle}` : "—",
    formatNum(c.approvedVideos),
    formatNum(c.totalViews),
    formatNum(c.totalPoints),
  ]);

  if (topCreatorsBody.length === 0) {
    topCreatorsBody.push(["—", "Belum ada data creator periode ini", "—", "0", "0", "0"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Rank", "Nama Creator", "Username Sosial", "Video Disetujui", "Verified Views", "Poin Diterima"]],
    body: topCreatorsBody,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: 16 },
      1: { fontStyle: "bold" },
      2: { textColor: COLOR_SECONDARY },
      3: { halign: "center" },
      4: { halign: "center" },
      5: { halign: "center", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY + 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Top 5 Konten Video Terbaik (Berdasarkan Verified Views)", margin, currentY);

  currentY += 3;

  const topVideosBody = data.topVideos.slice(0, 5).map((v) => [
    `#${v.rank}`,
    v.platform === "instagram" ? "Instagram Reels" : "TikTok",
    v.creatorName,
    formatNum(v.views),
    formatNum(v.points),
    v.videoUrl.length > 36 ? v.videoUrl.slice(0, 36) + "..." : v.videoUrl,
  ]);

  if (topVideosBody.length === 0) {
    topVideosBody.push(["—", "—", "Belum ada video terverifikasi", "0", "0", "—"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Rank", "Platform", "Creator", "Verified Views", "Poin", "Tautan Konten Asli"]],
    body: topVideosBody,
    theme: "grid",
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { halign: "center", fontStyle: "bold", cellWidth: 16 },
      1: { cellWidth: 28 },
      2: { fontStyle: "bold" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" },
      5: { textColor: COLOR_BRAND, fontSize: 7 },
    },
    margin: { left: margin, right: margin },
  });

  // ==========================================================================
  // PAGE 3 — REWARDS, CAMPAIGN COSTS & ROI
  // ==========================================================================
  doc.addPage();
  drawPageHeader(3);

  currentY = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("2. DISTRIBUSI HADIAH, BIAYA KAMPANYE & EFISIENSI (ROI)", margin, currentY);

  currentY += 6;

  // Reward points summary box
  doc.setFillColor(...COLOR_LIGHT_BG);
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, currentY, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text("STATUS POIN & REWARD FULFILLMENT:", margin + 4, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text(
    `• Total Poin Diterbitkan : ${formatNum(data.kpis.totalPointsIssued)} Poin\n` +
      `• Total Hadiah Diklaim   : ${formatNum(data.kpis.totalRewardsClaimed)} Pengajuan (${formatNum(
        data.kpis.rewardsPointsSpent
      )} Poin Terpakai)\n` +
      `• Rincian Status Hadiah  : ${data.kpis.rewardsCompletedCount} Selesai / Terkirim • ${data.kpis.rewardsPendingCount} Dalam Proses • ${data.kpis.rewardsRejectedCount} Dibatalkan`,
    margin + 4,
    currentY + 11
  );

  currentY += 30;

  // Campaign Cost Table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Rincian Beban Biaya Kampanye (Recorded Campaign Costs)", margin, currentY);

  currentY += 3;

  const costsTableBody = data.rewardCosts.costs.map((c) => [
    new Date(c.expenseDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    c.category === "merchandise"
      ? "Merchandise Fisik"
      : c.category === "voucher"
      ? "Voucher Belajar"
      : c.category === "class_program"
      ? "Akses Program Kelas"
      : "Operasional",
    c.description,
    formatRupiah(c.amountIdr),
  ]);

  if (costsTableBody.length === 0) {
    costsTableBody.push(["—", "Belum ada pencatatan biaya", "Data biaya operasional belum diinput untuk kuartal ini", "Rp 0"]);
  }

  autoTable(doc, {
    startY: currentY,
    head: [["Tanggal", "Kategori Biaya", "Deskripsi Pengeluaran", "Nominal (IDR)"]],
    body: costsTableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: COLOR_PRIMARY,
      lineColor: COLOR_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COLOR_LIGHT_BG,
      textColor: COLOR_PRIMARY,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 40, fontStyle: "bold" },
      2: {},
      3: { halign: "right", fontStyle: "bold", cellWidth: 35 },
    },
    margin: { left: margin, right: margin },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentY = (doc as any).lastAutoTable?.finalY + 8;

  // CPV Highlight Box
  doc.setFillColor(245, 250, 247);
  doc.setDrawColor(...COLOR_SUCCESS);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, currentY, contentWidth, 26, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_SUCCESS);
  doc.text("ANALISIS EFISIENSI BIAYA KONTEN (COST PER 1.000 VIEWS - CPV)", margin + 4, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);

  if (data.rewardCosts.totalAttributableCostIdr > 0 && data.kpis.totalVerifiedViews > 0) {
    doc.text(
      `Total Pengeluaran Tercatat : ${formatRupiah(data.rewardCosts.totalAttributableCostIdr)}\n` +
        `Total Verified Views Dihasilkan : ${formatNum(data.kpis.totalVerifiedViews)} Views\n` +
        `Biaya per 1.000 Verified Views (CPV) : ${formatRupiah(
          data.rewardCosts.costPerThousandViewsIdr || 0
        )} / 1.000 views [Formula: (Total Biaya / Total Views) × 1.000]`,
      margin + 4,
      currentY + 12
    );
  } else {
    doc.text(
      "Data biaya belum lengkap untuk kuartal ini. " +
        "Nilai CPV akan otomatis dihitung setelah admin mencatat pengeluaran riil kampanye melalui Admin Portal.",
      margin + 4,
      currentY + 14
    );
  }

  currentY += 34;

  // Management Conclusions & Sign-off Box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("3. Rekomendasi & Catatan Manajemen", margin, currentY);

  currentY += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_PRIMARY);
  const narrative =
    `Berdasarkan data analitik kuartal ${data.period.quarterLabel}, program Creator Hub terbukti aktif menggerakkan member dan alumni ` +
    `dalam memproduksi konten edukatif serta ulasan kelas berkualitas. Pertahankan standar verifikasi bukti analitik 30 hari untuk menjamin keaslian impresi organik. ` +
    `Disarankan untuk meningkatkan apresiasi bagi kreator dengan rata-rata views tinggi guna memacu pertumbuhan kampanye kuartal berikutnya.`;
  doc.text(doc.splitTextToSize(narrative, contentWidth), margin, currentY);

  currentY += 16;

  // Signature Block
  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigY = currentY + 4;

  // Left Sign-off
  doc.setDrawColor(...COLOR_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, sigY, sigBoxWidth, 28, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text("DISIAPKAN SECARA OTOMATIS OLEH:", margin + 3.5, sigY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_PRIMARY);
  doc.text("Sistem UGC Analytics Mr.BOB", margin + 3.5, sigY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text(`Tervalidasi pada: ${nowWib}`, margin + 3.5, sigY + 22);

  // Right Sign-off
  doc.roundedRect(margin + sigBoxWidth + 10, sigY, sigBoxWidth, 28, 2, 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text("DISETUJUI & DIVERIFIKASI OLEH:", margin + sigBoxWidth + 13.5, sigY + 5.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_BRAND);
  doc.text("Super Admin Mr.BOB", margin + sigBoxWidth + 13.5, sigY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_SECONDARY);
  doc.text("leadersosmed@gmail.com", margin + sigBoxWidth + 13.5, sigY + 22);

  // ==========================================================================
  // FINAL PASS: DRAW FOOTERS WITH DYNAMIC TOTAL PAGES
  // ==========================================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(i, totalPages);
  }

  return doc;
}
