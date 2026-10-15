import { LeaderboardCreator, LeaderboardVideo } from "./leaderboard";

export type QuarterName = "Q1" | "Q2" | "Q3" | "Q4";

export type ContentCategory =
  | "Daily Life"
  | "Review Kelas"
  | "Educational"
  | "POV"
  | "Challenge"
  | "Testimonial"
  | "Other";

export const CONTENT_CATEGORIES: ContentCategory[] = [
  "Daily Life",
  "Review Kelas",
  "Educational",
  "POV",
  "Challenge",
  "Testimonial",
  "Other",
];

export type CampaignCostCategory =
  | "merchandise"
  | "voucher"
  | "class_program"
  | "operational"
  | "other";

export const CAMPAIGN_COST_CATEGORY_LABELS: Record<CampaignCostCategory, string> = {
  merchandise: "Biaya Merchandise",
  voucher: "Beban Voucher",
  class_program: "Pemenuhan Kelas",
  operational: "Operasional Kampanye",
  other: "Biaya Lainnya",
};

export type SnapshotStatus = "draft" | "finalized" | "revised";

export interface QuarterPeriod {
  year: number;
  quarter: QuarterName;
  startDate: Date;
  endDate: Date; // Exclusive end boundary in UTC (e.g. Q1 ends 2026-04-01T00:00:00+07:00)
  startDateStr: string; // YYYY-MM-DD
  endDateStr: string; // YYYY-MM-DD (inclusive calendar end, e.g. 2026-03-31)
  exclusiveEndDateStr: string; // YYYY-MM-DD (e.g. 2026-04-01)
  label: string;
  quarterLabel: string;
  isCurrentQuarter: boolean;
  isProvisional: boolean;
}

export interface CoreKPIs {
  totalSubmissions: number; // Volume of non-draft submissions submitted in quarter
  participatingCreators: number; // Distinct creators submitting in quarter
  totalVerifiedViews: number; // Sum of verified_views from approved videos posted in quarter
  totalPointsIssued: number; // UGC points issued in quarter
  approvalRate: number | null; // Approved / (Approved + Rejected) * 100%, null if denom=0
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalRewardsClaimed: number; // Redemptions requested in quarter
  rewardsCompletedCount: number;
  rewardsPendingCount: number;
  rewardsRejectedCount: number;
  rewardsPointsSpent: number;
}

export interface QoQMetric<T = number> {
  current: T;
  previous: T;
  difference: number;
  percentageChange: number | null;
  comparisonNote?: string;
  trend: "positive" | "negative" | "neutral" | "uncomparable";
}

export interface MonthlyBreakdownItem {
  monthIndex: number; // 1-12
  monthName: string;
  year: number;
  submittedVideos: number;
  verifiedViews: number;
  participatingCreators: number;
  pointsIssued: number;
}

export interface PlatformComparisonItem {
  platform: "TikTok" | "Instagram Reels";
  submittedCount: number;
  approvedCount: number;
  totalVerifiedViews: number;
  averageViewsPerVideo: number;
  approvalRate: number | null;
  shareOfVerifiedViews: number;
}

export interface ContentFormatBreakdownItem {
  category: string;
  approvedVideos: number;
  totalVerifiedViews: number;
  averageViewsPerVideo: number;
  shareOfViews: number;
}

export interface CampaignCostRecord {
  id: string;
  year: number;
  quarter: QuarterName;
  category: CampaignCostCategory;
  description: string;
  amountIdr: number;
  expenseDate: string; // YYYY-MM-DD
  recordedBy?: string | null;
  recordedByName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CostAnalysisSummary {
  costs: CampaignCostRecord[];
  totalAttributableCostIdr: number;
  costPerThousandViewsIdr: number | null; // (Total Cost / Total Verified Views) * 1,000
  isComplete: boolean;
  costByCategory: Record<CampaignCostCategory, number>;
  note?: string;
}

export interface QuarterlySnapshot {
  id: string;
  year: number;
  quarter: QuarterName;
  version: number;
  status: SnapshotStatus;
  kpiData: CoreKPIs;
  platformData: PlatformComparisonItem[];
  costData: CostAnalysisSummary;
  monthlyData: MonthlyBreakdownItem[];
  contentData: ContentFormatBreakdownItem[];
  methodologyVersion: string;
  cutoffAt: string;
  finalizedBy?: string | null;
  finalizedByName?: string | null;
  finalizedAt?: string | null;
  revisionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuarterlyAnalyticsData {
  period: QuarterPeriod;
  previousPeriod: QuarterPeriod;
  kpis: CoreKPIs;
  previousKpis: CoreKPIs;
  qoq: {
    submissions: QoQMetric<number>;
    creators: QoQMetric<number>;
    approvedVideos: QoQMetric<number>;
    verifiedViews: QoQMetric<number>;
    pointsIssued: QoQMetric<number>;
    rewardsClaimed: QoQMetric<number>;
  };
  monthlyBreakdown: MonthlyBreakdownItem[];
  platformComparison: PlatformComparisonItem[];
  topCreators: LeaderboardCreator[];
  topVideos: LeaderboardVideo[];
  contentFormats: ContentFormatBreakdownItem[];
  hasContentClassification: boolean;
  rewardCosts: CostAnalysisSummary;
  snapshots: QuarterlySnapshot[];
  activeSnapshot?: QuarterlySnapshot | null;
  isProvisional: boolean;
  generatedAt: string;
}

export interface AddCampaignCostInput {
  year: number;
  quarter: QuarterName;
  category: CampaignCostCategory;
  description: string;
  amountIdr: number;
  expenseDate: string;
}

export interface FinalizeQuarterInput {
  year: number;
  quarter: QuarterName;
  revisionReason?: string;
}
