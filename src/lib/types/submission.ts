export type Platform = "tiktok" | "instagram";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "additional_evidence_required";

export type ContentCategory =
  | "Daily Life"
  | "Review Kelas"
  | "Educational"
  | "Comedy"
  | "POV"
  | "Facilities"
  | "Challenge"
  | "Others";

export interface Submission {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  platform: Platform;
  videoUrl: string;
  postingDate: string; // ISO date string (YYYY-MM-DD)
  claimedViews: number;
  verifiedViews?: number;
  pointsAwarded?: number;
  screenshotUrl: string;
  status: SubmissionStatus;
  category?: ContentCategory;
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDraft {
  id: string;
  creatorId: string;
  platform: Platform;
  videoUrl: string;
  postingDate: string;
  savedAt: string;
}
