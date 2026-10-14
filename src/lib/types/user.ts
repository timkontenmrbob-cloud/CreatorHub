export type UserRole = "creator" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  tiktokUsername?: string;
  instagramUsername?: string;
  phoneNumber?: string;
  photoURL?: string;
  createdAt: string;
  updatedAt: string;
  // Point summary (denormalized for rapid dashboard display, backed by point_lots / ledger)
  totalAvailablePoin?: number;
  pendingPoin?: number;
  totalRedeemedPoin?: number;
  totalVerifiedViews?: number;
  submissionCount?: number;
  approvedCount?: number;
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isConfigured: boolean;
  error: string | null;
}
