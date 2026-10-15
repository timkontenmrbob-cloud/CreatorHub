export type NotificationType =
  | "submission_approved"
  | "submission_rejected"
  | "submission_revision"
  | "points_issued"
  | "points_expiring"
  | "redemption_submitted"
  | "redemption_processing"
  | "redemption_ready"
  | "redemption_completed"
  | "redemption_rejected"
  | "admin_pending_submission"
  | "admin_pending_redemption";

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string;
  isRead: boolean;
}
