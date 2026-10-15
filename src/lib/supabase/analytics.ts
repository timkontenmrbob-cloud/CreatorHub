import { createClient } from "./client";
import {
  QuarterName,
  QuarterPeriod,
  CoreKPIs,
  QoQMetric,
  MonthlyBreakdownItem,
  PlatformComparisonItem,
  ContentFormatBreakdownItem,
  CampaignCostRecord,
  CostAnalysisSummary,
  QuarterlySnapshot,
  QuarterlyAnalyticsData,
  AddCampaignCostInput,
  ContentCategory,
  CampaignCostCategory,
} from "../types/analytics";
import { Json } from "../types/database";
import { LeaderboardCreator, LeaderboardVideo } from "../types/leaderboard";
import { fetchThumbnailsMap } from "./thumbnails";
import { getStoredRedemptions } from "./rewards";

// Fallback persistence stores for Campaign Costs, Snapshots, and Submission Categories
// Used when remote migrations are pending or during offline integration testing.
const inMemoryCosts: Map<string, CampaignCostRecord> = new Map();
const inMemorySnapshots: Map<string, QuarterlySnapshot> = new Map();
const inMemoryCategories: Map<string, ContentCategory> = new Map();

const COSTS_STORAGE_KEY = "mrbob_campaign_costs_v1";
const SNAPSHOTS_STORAGE_KEY = "mrbob_quarterly_snapshots_v1";
const CATEGORIES_STORAGE_KEY = "mrbob_content_categories_v1";

function loadFromStorage<T>(key: string, map: Map<string, T>) {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const arr = JSON.parse(raw) as (T & { id: string })[];
        for (const item of arr) {
          if (item && item.id) {
            map.set(item.id, item);
          }
        }
      }
    } catch {
      // ignore
    }
  }
}

function saveToStorage<T>(key: string, map: Map<string, T>) {
  if (typeof window !== "undefined") {
    try {
      const arr = Array.from(map.values());
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }
}

/**
 * Returns exact quarter date boundaries in Asia/Jakarta (WIB) timezone.
 * Uses half-open ranges: [startDate, endDate)
 * Q1: Jan 1 00:00:00+07 to Apr 1 00:00:00+07 (calendar: Jan 1 - Mar 31)
 * Q2: Apr 1 00:00:00+07 to Jul 1 00:00:00+07 (calendar: Apr 1 - Jun 30)
 * Q3: Jul 1 00:00:00+07 to Oct 1 00:00:00+07 (calendar: Jul 1 - Sep 30)
 * Q4: Oct 1 00:00:00+07 to Jan 1 (next year) 00:00:00+07 (calendar: Oct 1 - Dec 31)
 */
export function getQuarterPeriod(
  year: number,
  quarter: QuarterName,
  referenceDate?: Date
): QuarterPeriod {
  let startMonth: number;
  let endMonth: number; // inclusive calendar end month
  let nextQuarterMonth: number; // exclusive boundary month
  let nextQuarterYear = year;
  let endDay: number;

  switch (quarter) {
    case "Q1":
      startMonth = 1;
      endMonth = 3;
      endDay = 31;
      nextQuarterMonth = 4;
      break;
    case "Q2":
      startMonth = 4;
      endMonth = 6;
      endDay = 30;
      nextQuarterMonth = 7;
      break;
    case "Q3":
      startMonth = 7;
      endMonth = 9;
      endDay = 30;
      nextQuarterMonth = 10;
      break;
    case "Q4":
      startMonth = 10;
      endMonth = 12;
      endDay = 31;
      nextQuarterMonth = 1;
      nextQuarterYear = year + 1;
      break;
  }

  const pad = (n: number) => n.toString().padStart(2, "0");
  const startDateStr = `${year}-${pad(startMonth)}-01`;
  const endDateStr = `${year}-${pad(endMonth)}-${pad(endDay)}`;
  const exclusiveEndDateStr = `${nextQuarterYear}-${pad(nextQuarterMonth)}-01`;

  const startDate = new Date(`${startDateStr}T00:00:00+07:00`);
  const endDate = new Date(`${exclusiveEndDateStr}T00:00:00+07:00`);

  const monthNamesId = [
    "",
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  const label = `1 ${monthNamesId[startMonth]} – ${endDay} ${monthNamesId[endMonth]} ${year}`;
  const quarterLabel = `${quarter} ${year}`;

  // Current WIB time evaluation
  const ref = referenceDate || new Date();
  const isCurrentQuarter = ref >= startDate && ref < endDate;

  return {
    year,
    quarter,
    startDate,
    endDate,
    startDateStr,
    endDateStr,
    exclusiveEndDateStr,
    label,
    quarterLabel,
    isCurrentQuarter,
    isProvisional: isCurrentQuarter,
  };
}

/**
 * Returns the immediately preceding quarter.
 * Handles crossing calendar year boundaries:
 * e.g., Q1 2026 -> Q4 2025
 */
export function getPreviousQuarter(
  year: number,
  quarter: QuarterName
): { year: number; quarter: QuarterName } {
  switch (quarter) {
    case "Q1":
      return { year: year - 1, quarter: "Q4" };
    case "Q2":
      return { year, quarter: "Q1" };
    case "Q3":
      return { year, quarter: "Q2" };
    case "Q4":
      return { year, quarter: "Q3" };
  }
}

/**
 * Returns the latest completed quarter relative to current WIB time.
 */
export function getLatestCompletedQuarter(refDate?: Date): {
  year: number;
  quarter: QuarterName;
} {
  const ref = refDate || new Date();
  const wibParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(ref).split("-");

  const year = parseInt(wibParts[0], 10);
  const month = parseInt(wibParts[1], 10);

  if (month <= 3) {
    // Current is Q1, latest completed is Q4 of previous year
    return { year: year - 1, quarter: "Q4" };
  } else if (month <= 6) {
    return { year, quarter: "Q1" };
  } else if (month <= 9) {
    return { year, quarter: "Q2" };
  } else {
    return { year, quarter: "Q3" };
  }
}

/**
 * Calculate Quarter-over-Quarter comparison metrics.
 * Safely handles zero previous values ("Belum dapat dibandingkan").
 */
export function calculateQoQMetric(
  current: number,
  previous: number
): QoQMetric<number> {
  const difference = current - previous;

  if (previous === 0) {
    return {
      current,
      previous,
      difference,
      percentageChange: null,
      comparisonNote: "Belum dapat dibandingkan (kuartal sebelumnya: 0)",
      trend: current > 0 ? "positive" : "neutral",
    };
  }

  const percentageChange = Number((((current - previous) / previous) * 100).toFixed(1));
  let trend: "positive" | "negative" | "neutral" = "neutral";
  if (current > previous) trend = "positive";
  else if (current < previous) trend = "negative";

  return {
    current,
    previous,
    difference,
    percentageChange,
    trend,
  };
}

/**
 * Campaign Costs Persistence
 */
export async function fetchCampaignCosts(
  year: number,
  quarter: QuarterName
): Promise<CampaignCostRecord[]> {
  const supabase = createClient();
  loadFromStorage(COSTS_STORAGE_KEY, inMemoryCosts);

  // 1. Try remote Supabase table
  try {
    const { data, error } = await supabase
      .from("campaign_costs")
      .select("*")
      .eq("year", year)
      .eq("quarter", quarter)
      .order("expense_date", { ascending: false });

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((row: any) => ({
        id: row.id,
        year: row.year,
        quarter: row.quarter as QuarterName,
        category: row.category,
        description: row.description,
        amountIdr: Number(row.amount_idr),
        expenseDate: row.expense_date,
        recordedBy: row.recorded_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
  } catch (err) {
    console.warn("fetchCampaignCosts remote table error, falling back:", err);
  }

  // 2. Fallback to in-memory/storage
  const filtered = Array.from(inMemoryCosts.values()).filter(
    (c) => c.year === year && c.quarter === quarter
  );
  return filtered.sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));
}

export async function addCampaignCost(
  input: AddCampaignCostInput,
  recordedBy?: string
): Promise<CampaignCostRecord> {
  const supabase = createClient();
  loadFromStorage(COSTS_STORAGE_KEY, inMemoryCosts);

  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `cost-${Date.now()}`;
  const now = new Date().toISOString();

  const record: CampaignCostRecord = {
    id: newId,
    year: input.year,
    quarter: input.quarter,
    category: input.category,
    description: input.description.trim(),
    amountIdr: input.amountIdr,
    expenseDate: input.expenseDate,
    recordedBy: recordedBy || null,
    createdAt: now,
    updatedAt: now,
  };

  // Try insert remote table
  try {
    const { data, error } = await supabase
      .from("campaign_costs")
      .insert({
        id: newId,
        year: record.year,
        quarter: record.quarter,
        category: record.category,
        description: record.description,
        amount_idr: record.amountIdr,
        expense_date: record.expenseDate,
        recorded_by: record.recordedBy,
      })
      .select("*")
      .single();

    if (!error && data) {
      record.id = (data as { id?: string })?.id || newId;
    }
  } catch (err) {
    console.warn("addCampaignCost remote insert warning, saved to store:", err);
  }

  inMemoryCosts.set(record.id, record);
  saveToStorage(COSTS_STORAGE_KEY, inMemoryCosts);
  return record;
}

export async function deleteCampaignCost(costId: string): Promise<boolean> {
  const supabase = createClient();
  loadFromStorage(COSTS_STORAGE_KEY, inMemoryCosts);

  try {
    await supabase.from("campaign_costs").delete().eq("id", costId);
  } catch {
    // ignore
  }

  inMemoryCosts.delete(costId);
  saveToStorage(COSTS_STORAGE_KEY, inMemoryCosts);
  return true;
}

/**
 * Submission Content Category Assignment
 */
export async function assignSubmissionCategory(
  submissionId: string,
  category: ContentCategory
): Promise<boolean> {
  const supabase = createClient();
  loadFromStorage(CATEGORIES_STORAGE_KEY, inMemoryCategories);

  // Try remote column update
  try {
    const { error } = await supabase
      .from("submissions")
      .update({ content_category: category })
      .eq("id", submissionId);

    if (error) {
      console.warn("assignSubmissionCategory remote update error, falling back:", error.message);
    }
  } catch (err) {
    console.warn("assignSubmissionCategory remote update exception:", err);
  }

  inMemoryCategories.set(submissionId, category);
  saveToStorage(CATEGORIES_STORAGE_KEY, inMemoryCategories);
  return true;
}

export function getSubmissionCategoryMap(): Map<string, ContentCategory> {
  loadFromStorage(CATEGORIES_STORAGE_KEY, inMemoryCategories);
  return new Map(inMemoryCategories);
}

/**
 * Quarterly Snapshots Persistence
 */
export async function fetchQuarterlySnapshots(
  year: number,
  quarter: QuarterName
): Promise<QuarterlySnapshot[]> {
  const supabase = createClient();
  loadFromStorage(SNAPSHOTS_STORAGE_KEY, inMemorySnapshots);

  try {
    const { data, error } = await supabase
      .from("quarterly_snapshots")
      .select("*")
      .eq("year", year)
      .eq("quarter", quarter)
      .order("version", { ascending: false });

    if (!error && data && data.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((row: any) => ({
        id: row.id,
        year: row.year,
        quarter: row.quarter as QuarterName,
        version: row.version,
        status: row.status,
        kpiData: row.kpi_data,
        platformData: row.platform_data,
        costData: row.cost_data,
        monthlyData: row.monthly_data,
        contentData: row.content_data,
        methodologyVersion: row.methodology_version,
        cutoffAt: row.cutoff_at,
        finalizedBy: row.finalized_by,
        finalizedAt: row.finalized_at,
        revisionReason: row.revision_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }
  } catch {
    // fallback
  }

  const list = Array.from(inMemorySnapshots.values()).filter(
    (s) => s.year === year && s.quarter === quarter
  );
  return list.sort((a, b) => b.version - a.version);
}

export async function saveQuarterlySnapshot(
  snapshot: Omit<QuarterlySnapshot, "id" | "createdAt" | "updatedAt">
): Promise<QuarterlySnapshot> {
  const supabase = createClient();
  loadFromStorage(SNAPSHOTS_STORAGE_KEY, inMemorySnapshots);

  const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `snap-${Date.now()}`;
  const now = new Date().toISOString();

  const record: QuarterlySnapshot = {
    ...snapshot,
    id: newId,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const { data, error } = await supabase
      .from("quarterly_snapshots")
      .insert({
        id: newId,
        year: record.year,
        quarter: record.quarter,
        version: record.version,
        status: record.status,
        kpi_data: record.kpiData as unknown as Json,
        platform_data: record.platformData as unknown as Json,
        cost_data: record.costData as unknown as Json,
        monthly_data: record.monthlyData as unknown as Json,
        content_data: record.contentData as unknown as Json,
        methodology_version: record.methodologyVersion,
        cutoff_at: record.cutoffAt,
        finalized_by: record.finalizedBy,
        finalized_at: record.finalizedAt,
        revision_reason: record.revisionReason,
      })
      .select("*")
      .single();

    if (!error && data) {
      record.id = (data as { id?: string })?.id || newId;
    }
  } catch (err) {
    console.warn("saveQuarterlySnapshot remote insert fallback:", err);
  }

  inMemorySnapshots.set(record.id, record);
  saveToStorage(SNAPSHOTS_STORAGE_KEY, inMemorySnapshots);
  return record;
}

/**
 * Main Quarterly Analytics Aggregation Engine
 * Evaluates real Supabase records using strict attribution rules:
 * - Submissions volume & creator participation: submitted_at
 * - Content performance & verified views: verified posting_date
 * - Point issuance: issued_at (views lots only)
 * - Reward claims: requested_at
 * - Campaign costs: expense_date
 */
export async function fetchQuarterlyAnalytics(
  year: number,
  quarter: QuarterName,
  customClient?: ReturnType<typeof createClient>
): Promise<QuarterlyAnalyticsData> {
  const supabase = customClient || createClient();
  const period = getQuarterPeriod(year, quarter);
  const prevQuarterInfo = getPreviousQuarter(year, quarter);
  const prevPeriod = getQuarterPeriod(prevQuarterInfo.year, prevQuarterInfo.quarter);

  // 1. Fetch raw datasets for target period and previous period
  const [
    currentSubmissionsRes,
    previousSubmissionsRes,
    currentPointLotsRes,
    previousPointLotsRes,
    redeemedTxRes,
    costsList,
    snapshotsList,
  ] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, user_id, platform, video_url, posting_date, submitted_at, claimed_views, verified_views, approved_points, status")
      .order("submitted_at", { ascending: false }),
    supabase
      .from("submissions")
      .select("id, user_id, platform, posting_date, submitted_at, verified_views, approved_points, status"),
    supabase
      .from("point_lots")
      .select("id, user_id, source_type, original_points, issued_at")
      .eq("source_type", "views"),
    supabase
      .from("point_lots")
      .select("id, user_id, source_type, original_points, issued_at")
      .eq("source_type", "views"),
    supabase
      .from("point_transactions")
      .select("id, user_id, amount, description, created_at")
      .eq("transaction_type", "redeemed"),
    fetchCampaignCosts(year, quarter),
    fetchQuarterlySnapshots(year, quarter),
  ]);

  // Filter out any artificial test submissions (video_url contains 'test-artifact' or 'test-submission')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanSubs = (subs: any[] | null) =>
    (subs || []).filter((s) => {
      if (s.video_url && (s.video_url.includes("test-fixture") || s.video_url.includes("mock-unit-test"))) {
        return false;
      }
      return true;
    });

  const allSubmissions = cleanSubs(currentSubmissionsRes.data);
  const allPrevSubmissions = cleanSubs(previousSubmissionsRes.data);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allLots = (currentPointLotsRes.data || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPrevLots = (previousPointLotsRes.data || []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRedeemedTx = (redeemedTxRes?.data || []) as any[];

  // Attach fallback content category mapping
  const categoryMap = getSubmissionCategoryMap();
  for (const s of allSubmissions) {
    if (!s.content_category && categoryMap.has(s.id)) {
      s.content_category = categoryMap.get(s.id);
    }
  }

  // 2. Compute Core KPIs for a given period
  function computePeriodKPIs(
    p: QuarterPeriod,
    subs: typeof allSubmissions,
    lots: typeof allLots
  ): CoreKPIs {
    const pStart = p.startDate;
    const pEnd = p.endDate; // exclusive
    const pStartStr = p.startDateStr;
    const pEndStr = p.endDateStr;

    // A. Submissions cohort submitted within period
    const cohort = subs.filter((s) => {
      const subTime = new Date(s.submitted_at);
      return subTime >= pStart && subTime < pEnd;
    });

    const totalSubmissions = cohort.length;
    const participatingCreators = new Set(cohort.map((s) => s.user_id)).size;

    const approvedCohort = cohort.filter((s) => s.status === "approved");
    const rejectedCohort = cohort.filter((s) => s.status === "rejected");
    const pendingCohort = cohort.filter((s) =>
      ["submitted", "under_review", "requires_revision"].includes(s.status)
    );

    const approvedCount = approvedCohort.length;
    const rejectedCount = rejectedCohort.length;
    const pendingCount = pendingCohort.length;

    const finalizedDecisions = approvedCount + rejectedCount;
    const approvalRate =
      finalizedDecisions > 0
        ? Number(((approvedCount / finalizedDecisions) * 100).toFixed(1))
        : null;

    // B. Verified Views: Eligible approved videos whose verified posting_date falls within the quarter
    const verifiedContent = subs.filter((s) => {
      return (
        s.status === "approved" &&
        s.posting_date >= pStartStr &&
        s.posting_date <= pEndStr
      );
    });

    const totalVerifiedViews = verifiedContent.reduce(
      (sum, s) => sum + (Number(s.verified_views) || 0),
      0
    );

    // C. Points Issued: Sum points actually issued during selected quarter from UGC views
    const issuedLots = lots.filter((l) => {
      const lotTime = new Date(l.issued_at);
      return lotTime >= pStart && lotTime < pEnd;
    });

    let totalPointsIssued = issuedLots.reduce(
      (sum, l) => sum + (Number(l.original_points) || 0),
      0
    );

    // Fallback if point_lots is empty but approved submissions exist: derive from approved submissions points
    if (totalPointsIssued === 0 && verifiedContent.length > 0) {
      totalPointsIssued = verifiedContent.reduce(
        (sum, s) => sum + (Number(s.approved_points) || 0),
        0
      );
    }

    // D. Redemptions: Redemptions requested within quarter
    const redemptionsMap = getStoredRedemptions();
    const periodRedemptions = Array.from(redemptionsMap.values()).filter((r) => {
      const reqTime = new Date(r.requestedAt);
      return reqTime >= pStart && reqTime < pEnd;
    });

    let totalRewardsClaimed = periodRedemptions.length;
    let rewardsCompletedCount = periodRedemptions.filter((r) => r.status === "completed").length;
    const rewardsPendingCount = periodRedemptions.filter((r) =>
      ["pending", "processing", "ready"].includes(r.status)
    ).length;
    const rewardsRejectedCount = periodRedemptions.filter((r) => r.status === "rejected").length;
    let rewardsPointsSpent = periodRedemptions.reduce(
      (sum, r) => sum + (r.requiredPointsSnapshot || 0),
      0
    );

    // Fallback: If redemptions storage has 0 records but ledger records exist, derive from point_transactions
    if (totalRewardsClaimed === 0 && allRedeemedTx.length > 0) {
      const cohortTx = allRedeemedTx.filter((tx) => {
        const txTime = new Date(tx.created_at);
        return txTime >= pStart && txTime < pEnd;
      });
      totalRewardsClaimed = cohortTx.length;
      rewardsPointsSpent = cohortTx.reduce(
        (sum, tx) => sum + (Number(tx.amount) || 0),
        0
      );
      rewardsCompletedCount = totalRewardsClaimed;
    }

    return {
      totalSubmissions,
      participatingCreators,
      totalVerifiedViews,
      totalPointsIssued,
      approvalRate,
      approvedCount,
      rejectedCount,
      pendingCount,
      totalRewardsClaimed,
      rewardsCompletedCount,
      rewardsPendingCount,
      rewardsRejectedCount,
      rewardsPointsSpent,
    };
  }

  const kpis = computePeriodKPIs(period, allSubmissions, allLots);
  const previousKpis = computePeriodKPIs(prevPeriod, allPrevSubmissions, allPrevLots);

  // 3. Quarter-over-Quarter comparison
  const qoq = {
    submissions: calculateQoQMetric(kpis.totalSubmissions, previousKpis.totalSubmissions),
    creators: calculateQoQMetric(kpis.participatingCreators, previousKpis.participatingCreators),
    approvedVideos: calculateQoQMetric(kpis.approvedCount, previousKpis.approvedCount),
    verifiedViews: calculateQoQMetric(kpis.totalVerifiedViews, previousKpis.totalVerifiedViews),
    pointsIssued: calculateQoQMetric(kpis.totalPointsIssued, previousKpis.totalPointsIssued),
    rewardsClaimed: calculateQoQMetric(kpis.totalRewardsClaimed, previousKpis.totalRewardsClaimed),
  };

  // 4. Monthly Breakdown for the 3 months in the selected quarter
  const monthNamesId = [
    "",
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];

  let startM = 1;
  if (quarter === "Q2") startM = 4;
  else if (quarter === "Q3") startM = 7;
  else if (quarter === "Q4") startM = 10;

  const monthlyBreakdown: MonthlyBreakdownItem[] = [];

  for (let offset = 0; offset < 3; offset++) {
    const m = startM + offset;
    const pad = (n: number) => n.toString().padStart(2, "0");
    const mStartStr = `${year}-${pad(m)}-01`;
    const lastDayOfMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
    const mEndStr = `${year}-${pad(m)}-${pad(lastDayOfMonth)}`;

    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? year + 1 : year;
    const mExclusiveEndStr = `${nextY}-${pad(nextM)}-01`;

    const mStartDate = new Date(`${mStartStr}T00:00:00+07:00`);
    const mEndDate = new Date(`${mExclusiveEndStr}T00:00:00+07:00`);

    // Submissions submitted in month
    const mSubs = allSubmissions.filter((s) => {
      const d = new Date(s.submitted_at);
      return d >= mStartDate && d < mEndDate;
    });

    const mCreators = new Set(mSubs.map((s) => s.user_id)).size;

    // Verified views posted in month
    const mViews = allSubmissions
      .filter((s) => s.status === "approved" && s.posting_date >= mStartStr && s.posting_date <= mEndStr)
      .reduce((sum, s) => sum + (Number(s.verified_views) || 0), 0);

    // Points issued in month
    let mPoints = allLots
      .filter((l) => {
        const d = new Date(l.issued_at);
        return d >= mStartDate && d < mEndDate;
      })
      .reduce((sum, l) => sum + (Number(l.original_points) || 0), 0);

    if (mPoints === 0 && mViews > 0) {
      mPoints = allSubmissions
        .filter((s) => s.status === "approved" && s.posting_date >= mStartStr && s.posting_date <= mEndStr)
        .reduce((sum, s) => sum + (Number(s.approved_points) || 0), 0);
    }

    monthlyBreakdown.push({
      monthIndex: m,
      monthName: monthNamesId[m],
      year,
      submittedVideos: mSubs.length,
      verifiedViews: mViews,
      participatingCreators: mCreators,
      pointsIssued: mPoints,
    });
  }

  // 5. Platform Comparison: TikTok vs Instagram Reels
  const quarterSubmissions = allSubmissions.filter((s) => {
    const d = new Date(s.submitted_at);
    return d >= period.startDate && d < period.endDate;
  });

  const quarterApprovedVideos = allSubmissions.filter(
    (s) =>
      s.status === "approved" &&
      s.posting_date >= period.startDateStr &&
      s.posting_date <= period.endDateStr
  );

  const platforms: ("TikTok" | "Instagram Reels")[] = ["TikTok", "Instagram Reels"];
  const platformComparison: PlatformComparisonItem[] = platforms.map((pName) => {
    const isTiktok = pName === "TikTok";
    const platformKey = isTiktok ? "tiktok" : "instagram";

    const subs = quarterSubmissions.filter((s) => s.platform === platformKey);
    const approved = quarterApprovedVideos.filter((s) => s.platform === platformKey);

    const approvedCount = approved.length;
    const submittedCount = subs.length;
    const rejectedCount = subs.filter((s) => s.status === "rejected").length;

    const totalVerifiedViews = approved.reduce(
      (sum, s) => sum + (Number(s.verified_views) || 0),
      0
    );

    const averageViewsPerVideo =
      approvedCount > 0 ? Math.round(totalVerifiedViews / approvedCount) : 0;

    const decisions = approvedCount + rejectedCount;
    const approvalRate =
      decisions > 0 ? Number(((approvedCount / decisions) * 100).toFixed(1)) : null;

    const shareOfVerifiedViews =
      kpis.totalVerifiedViews > 0
        ? Number(((totalVerifiedViews / kpis.totalVerifiedViews) * 100).toFixed(1))
        : 0;

    return {
      platform: pName,
      submittedCount,
      approvedCount,
      totalVerifiedViews,
      averageViewsPerVideo,
      approvalRate,
      shareOfVerifiedViews,
    };
  });

  // 6. Top 10 Creators (ranked by UGC points earned from videos posted in quarter)
  type ProfileMini = {
    full_name?: string;
    tiktok_username?: string | null;
    instagram_username?: string | null;
    avatar_url?: string | null;
  };
  const profileMap = new Map<string, ProfileMini>();
  const creatorIds = Array.from(new Set(quarterApprovedVideos.map((s) => s.user_id)));

  if (creatorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, tiktok_username, instagram_username, avatar_url")
      .in("id", creatorIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (profs || []).forEach((p: any) => {
      profileMap.set(p.id, {
        full_name: p.full_name || undefined,
        tiktok_username: p.tiktok_username,
        instagram_username: p.instagram_username,
        avatar_url: p.avatar_url,
      });
    });
  }

  const creatorAggMap = new Map<string, LeaderboardCreator>();
  for (const s of quarterApprovedVideos) {
    const cId = s.user_id;
    const p = profileMap.get(cId);
    const points = Number(s.approved_points) || 0;
    const views = Number(s.verified_views) || 0;

    const rawHandle = p?.tiktok_username || p?.instagram_username || null;
    const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;

    if (!creatorAggMap.has(cId)) {
      creatorAggMap.set(cId, {
        rank: 0,
        creatorId: cId,
        name: p?.full_name || "Creator",
        handle: cleanHandle,
        avatar: p?.avatar_url || null,
        totalPoints: points,
        totalViews: views,
        approvedVideos: 1,
      });
    } else {
      const existing = creatorAggMap.get(cId)!;
      existing.totalPoints += points;
      existing.totalViews += views;
      existing.approvedVideos += 1;
    }
  }

  const topCreators = Array.from(creatorAggMap.values())
    .sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.totalViews !== a.totalViews) return b.totalViews - a.totalViews;
      if (b.approvedVideos !== a.approvedVideos) return b.approvedVideos - a.approvedVideos;
      return a.creatorId.localeCompare(b.creatorId);
    })
    .slice(0, 10)
    .map((c, idx) => ({
      ...c,
      rank: idx + 1,
      highlight: idx === 0 ? "Top Creator" : null,
    }));

  // 7. Top 10 Videos (ranked by verified views in quarter)
  const sortedVideos = [...quarterApprovedVideos].sort((a, b) => {
    const vDiff = (Number(b.verified_views) || 0) - (Number(a.verified_views) || 0);
    if (vDiff !== 0) return vDiff;
    const pDiff = (Number(b.approved_points) || 0) - (Number(a.approved_points) || 0);
    if (pDiff !== 0) return pDiff;
    return a.id.localeCompare(b.id);
  });

  const thumbnailsMap = await fetchThumbnailsMap(
    sortedVideos.slice(0, 10).map((s) => ({
      id: s.id,
      videoUrl: s.video_url,
      platform: s.platform,
    }))
  );

  const topVideos: LeaderboardVideo[] = sortedVideos.slice(0, 10).map((s, idx) => {
    const p = profileMap.get(s.user_id);
    const creatorName = p?.full_name || "Creator";
    const rawHandle = p?.tiktok_username || p?.instagram_username || null;
    const cleanHandle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : null;
    const isTiktok = s.platform === "tiktok";
    const thumb = thumbnailsMap.get(s.id);

    return {
      rank: idx + 1,
      id: s.id,
      creatorId: s.user_id,
      creatorName,
      creatorHandle: cleanHandle,
      creatorAvatar: p?.avatar_url || null,
      platform: isTiktok ? "TikTok" : "Instagram Reels",
      videoUrl: s.video_url,
      title: isTiktok ? `Konten TikTok oleh ${creatorName}` : `Video Reels oleh ${creatorName}`,
      views: Number(s.verified_views) || 0,
      points: Number(s.approved_points) || 0,
      postingDate: s.posting_date,
      category: s.content_category || (isTiktok ? "TikTok" : "Reels"),
      thumbnailUrl: thumb?.thumbnailUrl || null,
      thumbnailSource: thumb?.source || null,
    };
  });

  // 8. Content Format Analysis
  const formatMap = new Map<string, { count: number; views: number }>();
  let hasClassifiedAny = false;

  for (const s of quarterApprovedVideos) {
    const cat = s.content_category || "Belum Diklasifikasikan";
    if (s.content_category) hasClassifiedAny = true;

    if (!formatMap.has(cat)) {
      formatMap.set(cat, { count: 1, views: Number(s.verified_views) || 0 });
    } else {
      const ex = formatMap.get(cat)!;
      ex.count += 1;
      ex.views += Number(s.verified_views) || 0;
    }
  }

  const contentFormats: ContentFormatBreakdownItem[] = Array.from(formatMap.entries())
    .map(([category, val]) => ({
      category,
      approvedVideos: val.count,
      totalVerifiedViews: val.views,
      averageViewsPerVideo: val.count > 0 ? Math.round(val.views / val.count) : 0,
      shareOfViews:
        kpis.totalVerifiedViews > 0
          ? Number(((val.views / kpis.totalVerifiedViews) * 100).toFixed(1))
          : 0,
    }))
    .sort((a, b) => b.totalVerifiedViews - a.totalVerifiedViews);

  // 9. Campaign Cost Analysis & Efficiency (CPV)
  const totalAttributableCostIdr = costsList.reduce((sum, c) => sum + c.amountIdr, 0);
  const costByCategory: Record<string, number> = {
    merchandise: 0,
    voucher: 0,
    class_program: 0,
    operational: 0,
    other: 0,
  };
  costsList.forEach((c) => {
    costByCategory[c.category] = (costByCategory[c.category] || 0) + c.amountIdr;
  });

  const isCostComplete = costsList.length > 0;
  // Formula: Total Attributable Campaign Costs / Total Verified Views * 1,000
  const costPerThousandViewsIdr =
    isCostComplete && kpis.totalVerifiedViews > 0
      ? Number(((totalAttributableCostIdr / kpis.totalVerifiedViews) * 1000).toFixed(0))
      : null;

  const rewardCosts: CostAnalysisSummary = {
    costs: costsList,
    totalAttributableCostIdr,
    costPerThousandViewsIdr,
    isComplete: isCostComplete,
    costByCategory: costByCategory as Record<CampaignCostCategory, number>,
    note: isCostComplete ? undefined : "Data biaya belum lengkap.",
  };

  const activeSnapshot = snapshotsList.find((s) => s.status === "finalized" || s.status === "revised") || null;

  return {
    period,
    previousPeriod: prevPeriod,
    kpis,
    previousKpis,
    qoq,
    monthlyBreakdown,
    platformComparison,
    topCreators,
    topVideos,
    contentFormats,
    hasContentClassification: hasClassifiedAny,
    rewardCosts,
    snapshots: snapshotsList,
    activeSnapshot,
    isProvisional: period.isProvisional,
    generatedAt: new Date().toISOString(),
  };
}
