export type PointSourceType = "views" | "bonus" | "adjustment" | "challenge";

export type PointTransactionType =
  | "earned"
  | "redeemed"
  | "expired"
  | "reversed"
  | "bonus"
  | "adjustment";

export interface PointLot {
  id: string;
  userId: string;
  sourceType: PointSourceType;
  sourceId?: string | null;
  originalPoints: number;
  remainingPoints: number;
  issuedAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  sourcePlatform?: string | null;
  sourceUrl?: string | null;
}

export interface PointTransaction {
  id: string;
  userId: string;
  transactionType: PointTransactionType;
  amount: number;
  relatedPointLotId?: string | null;
  referenceId?: string | null;
  idempotencyKey?: string | null;
  description: string;
  createdAt: string;
}

export interface WalletSummary {
  userId: string;
  availablePoints: number;
  pendingPoints: number;
  redeemedPoints: number;
  expiredPoints: number;
  totalEarnedPoints: number;
  expiringSoonPoints: number;
  nearestExpirationDate?: string | null;
}

/**
 * Official point conversion formula:
 * 1,000 verified views = 10 Poin (Math.floor(views / 100))
 */
export function calculatePointsFromViews(views: number): number {
  if (views < 0) return 0;
  return Math.floor(views / 100);
}

/**
 * Calculate remaining days until expiration
 */
export function getDaysUntilExpiration(expiresAt: string | Date): number {
  const target = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = target - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
