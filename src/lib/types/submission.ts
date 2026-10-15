import { SupportedPlatform } from "../video-url";

export type SubmissionStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "requires_revision"
  | "approved"
  | "rejected";

export interface SubmissionDraft {
  id: string;
  userId: string;
  platform: SupportedPlatform;
  videoUrl: string;
  normalizedIdentifier?: string | null;
  postingDate: string; // YYYY-MM-DD
  currentViews?: number | null;
  estimatedPoints?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionEvidence {
  id: string;
  submissionId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  retentionStatus: "active" | "scheduled_for_deletion" | "deleted" | "disputed";
  scheduledDeletionAt?: string | null;
  deletedAt?: string | null;
  publicUrl?: string | null; // Signed temporary URL
}

export interface SubmissionAuditLog {
  id: string;
  submissionId: string;
  adminId: string;
  adminName?: string | null;
  adminEmail?: string | null;
  previousStatus: SubmissionStatus;
  newStatus: SubmissionStatus;
  verifiedViews?: number | null;
  approvedPoints?: number | null;
  decisionReason?: string | null;
  adminNotes?: string | null;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  platform: SupportedPlatform;
  videoUrl: string;
  normalizedIdentifier: string;
  postingDate: string; // YYYY-MM-DD
  submittedAt: string;
  claimedViews: number;
  estimatedPoints: number;
  verifiedViews?: number | null;
  approvedPoints?: number | null;
  status: SubmissionStatus;
  adminNotes?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  agreementAccepted?: boolean;
  agreementVersion?: string | null;
  agreementAcceptedAt?: string | null;
  evidence?: SubmissionEvidence[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminSubmissionItem extends Submission {
  creatorName: string;
  creatorEmail: string;
  creatorAvatar?: string | null;
  auditLogs?: SubmissionAuditLog[];
}

export interface CreateSubmissionInput {
  platform: SupportedPlatform;
  videoUrl: string;
  postingDate: string; // YYYY-MM-DD
  claimedViews: number;
  evidenceFile: File;
  draftId?: string;
  agreementAccepted: boolean;
  agreementVersion?: string;
}

export interface SaveDraftInput {
  id?: string;
  platform: SupportedPlatform;
  videoUrl: string;
  postingDate: string;
  currentViews?: number;
}

export interface ApproveSubmissionInput {
  verifiedViews: number;
  adminNotes?: string;
}

export interface RejectSubmissionInput {
  rejectionReason: string;
  adminNotes?: string;
}

export interface RequestEvidenceInput {
  requestNotes: string;
}
