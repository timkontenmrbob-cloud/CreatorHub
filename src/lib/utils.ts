import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format points with thousand separators (e.g. 10.000 Poin)
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.max(0, Math.floor(points)));
}

/**
 * Format view counts with Indonesian conventions (e.g. 12.500 views or 1.2M views)
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (views >= 10_000) {
    return `${(views / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return new Intl.NumberFormat("id-ID").format(Math.max(0, Math.floor(views)));
}

/**
 * Core business rule: 1.000 verified views = 10 Poin
 * Equivalent formula: points = floor(verifiedViews / 100)
 */
export function calculatePointsFromViews(views: number): number {
  if (!views || views <= 0) return 0;
  return Math.floor(views / 100);
}

/**
 * Format dates in Indonesian locale (e.g. 14 Oktober 2026)
 */
export function formatDate(date: string | number | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

/**
 * Format date & time with WIB (Asia/Jakarta) timezone suffix
 */
export function formatDateTimeWIB(date: string | number | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return (
    new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d) + " WIB"
  );
}

/**
 * Format short date in Indonesian locale (e.g. 15 Okt 2026)
 */
export function formatShortDateWIB(date: string | number | Date): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Calculate submission window:
 * A video can only be submitted during its first 30 calendar days after publication.
 * The publication date counts as Day 1.
 * Final eligible day is Day 30, ending at 23:59:59 Asia/Jakarta time.
 */
export function getSubmissionDeadlineInfo(postingDateInput: string | Date) {
  const postingDate = new Date(postingDateInput);
  if (isNaN(postingDate.getTime())) {
    return {
      isValid: false,
      daysRemaining: 0,
      isExpired: true,
      deadlineDate: null,
      message: "Tanggal posting tidak valid.",
      urgency: "error" as const,
    };
  }

  // Publication date is Day 1. Deadline is Day 30 at end of day (29 days after posting date at 23:59:59)
  const deadline = new Date(postingDate);
  deadline.setDate(deadline.getDate() + 29);
  deadline.setHours(23, 59, 59, 999);

  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs <= 0 || daysRemaining <= 0) {
    return {
      isValid: true,
      daysRemaining: 0,
      isExpired: true,
      deadlineDate: deadline,
      message: "Masa submit konten ini sudah berakhir.",
      urgency: "error" as const,
    };
  }

  if (daysRemaining <= 3) {
    return {
      isValid: true,
      daysRemaining,
      isExpired: false,
      deadlineDate: deadline,
      message: `Last Chance! Segera submit sebelum deadline (${daysRemaining} hari lagi).`,
      urgency: "warning" as const,
    };
  }

  if (daysRemaining <= 14) {
    return {
      isValid: true,
      daysRemaining,
      isExpired: false,
      deadlineDate: deadline,
      message: `Kontenmu masih punya ${daysRemaining} hari. Mau submit sekarang atau simpan dulu?`,
      urgency: "notice" as const,
    };
  }

  return {
    isValid: true,
    daysRemaining,
    isExpired: false,
    deadlineDate: deadline,
    message: `Masih banyak waktu buat kumpulin views! (${daysRemaining} hari tersisa)`,
    urgency: "safe" as const,
  };
}
