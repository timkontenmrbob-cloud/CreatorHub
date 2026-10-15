import { createClient } from "./client";
import {
  PointLot,
  PointTransaction,
  WalletSummary,
  PointSourceType,
} from "../types/wallet";

/**
 * Fetch authoritative wallet summary for a creator
 */
export async function fetchWalletSummary(userId: string): Promise<WalletSummary> {
  const supabase = createClient();

  // Try RPC first for high-performance server-side aggregation
  const { data, error } = await supabase.rpc("get_wallet_summary", {
    target_user_id: userId,
  });

  if (!error && data) {
    const raw = typeof data === "string" ? JSON.parse(data) : data;
    return {
      userId: raw.user_id || userId,
      availablePoints: Number(raw.available_points || 0),
      pendingPoints: Number(raw.pending_points || 0),
      redeemedPoints: Number(raw.redeemed_points || 0),
      expiredPoints: Number(raw.expired_points || 0),
      totalEarnedPoints: Number(raw.total_earned_points || 0),
      expiringSoonPoints: Number(raw.expiring_soon_points || 0),
      nearestExpirationDate: raw.nearest_expiration_date || null,
    };
  }

  // Fallback direct table query if RPC is temporarily unavailable
  const now = new Date().toISOString();
  const [lotsRes, txEarnedRes, txRedeemedRes, txExpiredRes] = await Promise.all([
    supabase
      .from("point_lots")
      .select("remaining_points, expires_at, original_points")
      .eq("user_id", userId),
    supabase
      .from("point_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("transaction_type", "earned"),
    supabase
      .from("point_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("transaction_type", "redeemed"),
    supabase
      .from("point_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("transaction_type", "expired"),
  ]);

  const lots = lotsRes.data || [];
  const activeLots = lots.filter(
    (l) => l.remaining_points > 0 && new Date(l.expires_at) > new Date(now)
  );
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expiringLots = activeLots.filter(
    (l) => l.expires_at <= thirtyDaysAhead
  );

  const availablePoints = activeLots.reduce((acc, l) => acc + l.remaining_points, 0);
  const totalEarnedPoints = lots.reduce((acc, l) => acc + l.original_points, 0);
  const expiringSoonPoints = expiringLots.reduce((acc, l) => acc + l.remaining_points, 0);

  let nearestExpirationDate: string | null = null;
  if (activeLots.length > 0) {
    const sorted = [...activeLots].sort(
      (a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime()
    );
    nearestExpirationDate = sorted[0].expires_at;
  }

  const redeemedPoints = (txRedeemedRes.data || []).reduce((acc, tx) => acc + tx.amount, 0);
  const expiredPoints = (txExpiredRes.data || []).reduce((acc, tx) => acc + tx.amount, 0);

  return {
    userId,
    availablePoints,
    pendingPoints: 0,
    redeemedPoints,
    expiredPoints,
    totalEarnedPoints: totalEarnedPoints || (txEarnedRes.data || []).reduce((acc, tx) => acc + tx.amount, 0),
    expiringSoonPoints,
    nearestExpirationDate,
  };
}

/**
 * Fetch all point lots for a user, sorted newest first by default or nearest expiration
 * Point issuance history: ORDER BY issued_at DESC, id DESC
 * Expiring filter: ORDER BY expires_at ASC, id DESC
 */
export async function fetchPointLots(
  userId: string,
  sortBy: "issued" | "expiring" = "issued"
): Promise<PointLot[]> {
  const supabase = createClient();
  let query = supabase
    .from("point_lots")
    .select("*")
    .eq("user_id", userId);

  if (sortBy === "expiring") {
    query = query.order("expires_at", { ascending: true }).order("id", { ascending: false });
  } else {
    query = query.order("issued_at", { ascending: false }).order("id", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching point lots:", error);
    return [];
  }

  const rows = data || [];

  // Resolve source platform and video URL for human-readable labels
  const submissionIds = rows
    .filter((r) => r.source_type === "views" && r.source_id)
    .map((r) => r.source_id as string);

  const subMap = new Map<string, { platform: string; videoUrl: string }>();
  if (submissionIds.length > 0) {
    try {
      const { data: subs } = await supabase
        .from("submissions")
        .select("id, platform, video_url")
        .in("id", submissionIds);

      if (subs) {
        subs.forEach((s) => {
          subMap.set(s.id, { platform: s.platform, videoUrl: s.video_url });
        });
      }
    } catch {
      // Non-critical join failure
    }
  }

  return rows.map((row) => {
    const subInfo = row.source_id ? subMap.get(row.source_id) : undefined;
    return {
      id: row.id,
      userId: row.user_id,
      sourceType: row.source_type,
      sourceId: row.source_id,
      originalPoints: row.original_points,
      remainingPoints: row.remaining_points,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      sourcePlatform: subInfo?.platform || null,
      sourceUrl: subInfo?.videoUrl || null,
    };
  });
}

/**
 * Fetch point transactions (ledger entries) for a user
 * Transaction history: ORDER BY created_at DESC, id DESC
 */
export async function fetchPointTransactions(
  userId: string,
  limit = 50
): Promise<PointTransaction[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("point_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching point transactions:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    transactionType: row.transaction_type,
    amount: row.amount,
    relatedPointLotId: row.related_point_lot_id,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
    description: row.description,
    createdAt: row.created_at,
  }));
}

/**
 * Admin action: Issue points to a creator with an immutable lot & transaction record
 */
export async function issuePointsLot(
  targetUserId: string,
  points: number,
  sourceType: PointSourceType = "views",
  sourceId?: string,
  description = "Penerbitan Poin Konten",
  idempotencyKey?: string
): Promise<{ lotId: string; transactionId: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("issue_points_lot", {
    target_user_id: targetUserId,
    p_points: points,
    p_source_type: sourceType,
    p_source_id: sourceId || null,
    p_description: description,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    throw new Error(error.message || "Gagal menerbitkan lot poin.");
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  return {
    lotId: raw?.lot_id || "",
    transactionId: raw?.transaction_id || "",
  };
}

/**
 * Consume points with earliest expiring points consumed first (Security Definer RPC)
 */
export async function redeemPoints(
  targetUserId: string,
  points: number,
  referenceId?: string,
  description = "Penukaran Reward",
  idempotencyKey?: string
): Promise<{ redeemedPoints: number; transactionIds: string[] }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("redeem_points_ordered", {
    target_user_id: targetUserId,
    p_points: points,
    p_reference_id: referenceId || null,
    p_description: description,
    p_idempotency_key: idempotencyKey || null,
  });

  if (error) {
    throw new Error(error.message || "Gagal menukarkan poin.");
  }

  const raw = typeof data === "string" ? JSON.parse(data) : data;
  return {
    redeemedPoints: raw?.redeemed_points || points,
    transactionIds: raw?.transaction_ids || [],
  };
}

/**
 * Admin: Fetch global system-wide wallet metrics
 */
export async function fetchAdminWalletMetrics(): Promise<{
  totalIssued: number;
  totalRedeemed: number;
  totalExpired: number;
  totalInCirculation: number;
}> {
  const supabase = createClient();

  const [lotsRes, redeemedRes, expiredRes] = await Promise.all([
    supabase.from("point_lots").select("original_points, remaining_points, expires_at"),
    supabase.from("point_transactions").select("amount").eq("transaction_type", "redeemed"),
    supabase.from("point_transactions").select("amount").eq("transaction_type", "expired"),
  ]);

  const now = new Date().getTime();
  const lots = lotsRes.data || [];

  const totalIssued = lots.reduce((acc, l) => acc + (l.original_points || 0), 0);
  const totalInCirculation = lots.reduce((acc, l) => {
    if (new Date(l.expires_at).getTime() > now && (l.remaining_points || 0) > 0) {
      return acc + l.remaining_points;
    }
    return acc;
  }, 0);

  const totalRedeemed = (redeemedRes.data || []).reduce((acc, tx) => acc + (tx.amount || 0), 0);
  const totalExpired = (expiredRes.data || []).reduce((acc, tx) => acc + (tx.amount || 0), 0);

  return {
    totalIssued,
    totalRedeemed,
    totalExpired,
    totalInCirculation,
  };
}

/**
 * Admin: Trigger manual audit to expire overdue lots
 */
export async function triggerExpireOverdueLots(): Promise<{
  lotsExpiredCount: number;
  totalPointsExpired: number;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("expire_overdue_point_lots");
  if (error) {
    throw new Error(error.message || "Gagal menjalankan audit kedaluwarsa.");
  }
  const raw = typeof data === "string" ? JSON.parse(data) : data;
  return {
    lotsExpiredCount: Number(raw?.lots_expired_count || 0),
    totalPointsExpired: Number(raw?.total_points_expired || 0),
  };
}

/**
 * Admin: Fetch all creators with their wallet balances
 */
export async function fetchCreatorsWithBalances(): Promise<
  Array<{
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
    availablePoints: number;
    expiringSoonPoints: number;
    totalEarned: number;
  }>
> {
  const supabase = createClient();

  const [{ data: profiles }, { data: lots }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").order("created_at", { ascending: false }),
    supabase.from("point_lots").select("user_id, original_points, remaining_points, expires_at"),
  ]);

  const now = Date.now();
  const thirtyDaysAhead = now + 30 * 24 * 60 * 60 * 1000;

  const lotMap = new Map<string, { available: number; expiring: number; earned: number }>();

  (lots || []).forEach((lot) => {
    const entry = lotMap.get(lot.user_id) || { available: 0, expiring: 0, earned: 0 };
    entry.earned += lot.original_points || 0;

    const expTime = new Date(lot.expires_at).getTime();
    if (expTime > now && (lot.remaining_points || 0) > 0) {
      entry.available += lot.remaining_points;
      if (expTime <= thirtyDaysAhead) {
        entry.expiring += lot.remaining_points;
      }
    }
    lotMap.set(lot.user_id, entry);
  });

  return (profiles || []).map((p) => {
    const stats = lotMap.get(p.id) || { available: 0, expiring: 0, earned: 0 };
    return {
      id: p.id,
      fullName: p.full_name,
      email: p.email,
      avatarUrl: p.avatar_url,
      availablePoints: stats.available,
      expiringSoonPoints: stats.expiring,
      totalEarned: stats.earned,
    };
  });
}

/**
 * Admin: Fetch global transaction ledger with creator profiles joined
 */
export async function fetchAdminTransactionLedger(limit = 100): Promise<
  Array<
    PointTransaction & {
      userFullName?: string;
      userEmail?: string;
    }
  >
> {
  const supabase = createClient();

  const { data: transactions, error } = await supabase
    .from("point_transactions")
    .select(`
      id,
      user_id,
      transaction_type,
      amount,
      related_point_lot_id,
      reference_id,
      idempotency_key,
      description,
      created_at,
      profiles:user_id (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Error fetching admin transaction ledger:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (transactions || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    transactionType: row.transaction_type,
    amount: row.amount,
    relatedPointLotId: row.related_point_lot_id,
    referenceId: row.reference_id,
    idempotencyKey: row.idempotency_key,
    description: row.description,
    createdAt: row.created_at,
    userFullName: row.profiles?.full_name,
    userEmail: row.profiles?.email,
  }));
}
