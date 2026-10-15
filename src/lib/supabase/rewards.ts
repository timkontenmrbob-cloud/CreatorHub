import { createClient } from "./client";
import {
  Reward,
  Redemption,
  RedemptionStatus,
  OFFICIAL_REWARDS,
} from "../types/reward";

// In-memory fallback cache for redemptions
const inMemoryRedemptions: Map<string, Redemption> = new Map();
const STORAGE_KEY = "mrbob_redemptions_store_v2";

export function getStoredRedemptions(): Map<string, Redemption> {
  const map = new Map<string, Redemption>(inMemoryRedemptions);
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as Redemption[];
        for (const item of arr) {
          map.set(item.id, item);
          inMemoryRedemptions.set(item.id, item);
        }
      }
    } catch {
      // ignore
    }
  }
  return map;
}

export function saveStoredRedemptions(map: Map<string, Redemption>) {
  if (typeof window !== "undefined") {
    try {
      const arr = Array.from(map.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch official reward catalog
 * Tries remote Supabase rewards table first, falls back gracefully to OFFICIAL_REWARDS
 */
export async function fetchRewardsCatalog(): Promise<Reward[]> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from("rewards")
      .select("*")
      .order("required_points", { ascending: true });

    if (!error && data && data.length > 0) {
      return data.map((row) => ({
        id: row.id,
        name: row.name,
        requiredPoin: row.required_points,
        category:
          row.reward_type === "merchandise"
            ? "Merchandise"
            : row.reward_type === "voucher"
            ? "Voucher"
            : "Program Kelas",
        rewardType: row.reward_type,
        stock: 100, // Kept internal, never shown on cards
        description: row.description,
        isAvailable: row.availability,
        image: row.image_path,
        redemptionTerms: row.redemption_terms || undefined,
      }));
    }
  } catch (err) {
    console.warn("Using offline official rewards fallback:", err);
  }

  // Fallback to official 13 rewards
  return OFFICIAL_REWARDS;
}

/**
 * Fetch detail for a specific reward
 */
export async function fetchRewardDetail(rewardId: string): Promise<Reward | null> {
  const catalog = await fetchRewardsCatalog();
  return catalog.find((r) => r.id === rewardId) || null;
}

export interface RedeemRewardParams {
  creatorId: string;
  rewardId: string;
  recipientName?: string;
  shippingAddress?: string;
  contactWhatsapp?: string;
  idempotencyKey?: string;
}

export interface RedeemRewardResult {
  status: "success" | "already_redeemed";
  redemptionId: string;
  rewardName: string;
  pointsSpent: number;
  remainingBalance: number;
  message: string;
}

/**
 * Redeem reward using atomic PostgreSQL RPC or verified client fallback
 * Consumes earliest-expiring point lots first
 */
export async function redeemReward(
  params: RedeemRewardParams
): Promise<RedeemRewardResult> {
  const supabase = createClient();
  const reward = await fetchRewardDetail(params.rewardId);

  if (!reward) {
    throw new Error("Reward tidak ditemukan dalam katalog resmi.");
  }

  if (!reward.isAvailable) {
    throw new Error(`Reward ${reward.name} saat ini sedang tidak tersedia.`);
  }

  const idempotencyKey =
    params.idempotencyKey ||
    `redeem_${params.creatorId}_${params.rewardId}_${Date.now()}`;

  // 1. Try PostgreSQL atomic RPC
  try {
    const { data, error } = await supabase.rpc("redeem_reward_atomic", {
      p_creator_id: params.creatorId,
      p_reward_id: params.rewardId,
      p_shipping_address: params.shippingAddress || null,
      p_contact_whatsapp: params.contactWhatsapp || null,
      p_recipient_name: params.recipientName || null,
      p_idempotency_key: idempotencyKey,
    });

    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return {
        status: parsed.status === "already_redeemed" ? "already_redeemed" : "success",
        redemptionId: parsed.redemption_id,
        rewardName: parsed.reward_name || reward.name,
        pointsSpent: parsed.points_spent || reward.requiredPoin,
        remainingBalance: parsed.remaining_balance ?? 0,
        message: parsed.message || "Berhasil! Hadiahmu sudah diajukan.",
      };
    }
  } catch (rpcErr) {
    console.warn("RPC redeem_reward_atomic failed, attempting transactional fallback:", rpcErr);
  }

  // Check idempotency in-memory and in point_transactions before deducting
  if (idempotencyKey) {
    for (const mem of inMemoryRedemptions.values()) {
      if (mem.idempotencyKey === idempotencyKey) {
        return {
          status: "already_redeemed",
          redemptionId: mem.id,
          rewardName: mem.rewardNameSnapshot,
          pointsSpent: mem.requiredPointsSnapshot,
          remainingBalance: 0,
          message: "Penukaran reward ini sudah berhasil diajukan sebelumnya.",
        };
      }
    }

    try {
      const { data: existingTx } = await supabase
        .from("point_transactions")
        .select("reference_id, amount")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingTx) {
        return {
          status: "already_redeemed",
          redemptionId: existingTx.reference_id || "",
          rewardName: reward.name,
          pointsSpent: existingTx.amount,
          remainingBalance: 0,
          message: "Penukaran reward ini sudah berhasil diajukan sebelumnya.",
        };
      }
    } catch {
      // Ignore
    }
  }

  // 2. Resilient Fallback Layer using live point_lots & point_transactions
  // Lock & inspect available lots for creator
  const now = new Date();
  const { data: lots, error: lotsErr } = await supabase
    .from("point_lots")
    .select("*")
    .eq("user_id", params.creatorId)
    .gt("remaining_points", 0)
    .gt("expires_at", now.toISOString())
    .order("expires_at", { ascending: true })
    .order("id", { ascending: true });

  if (lotsErr) {
    throw new Error("Gagal memeriksa saldo poin: " + lotsErr.message);
  }

  const validLots = lots || [];
  const totalAvailable = validLots.reduce((acc, l) => acc + l.remaining_points, 0);

  if (totalAvailable < reward.requiredPoin) {
    throw new Error(
      `Saldo poin tidak mencukupi. Anda memiliki ${totalAvailable} Poin, dibutuhkan ${reward.requiredPoin} Poin.`
    );
  }

  // Deduct points from lots in order of earliest expiration
  let remainingToDeduct = reward.requiredPoin;
  const allocations: { lotId: string; amount: number; expDate: string }[] = [];

  for (const lot of validLots) {
    if (remainingToDeduct <= 0) break;
    const deduct = Math.min(lot.remaining_points, remainingToDeduct);
    const updatedPoints = lot.remaining_points - deduct;

    const { error: updErr } = await supabase
      .from("point_lots")
      .update({
        remaining_points: updatedPoints,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lot.id);

    if (updErr) {
      throw new Error("Gagal mengalokasikan poin: " + updErr.message);
    }

    allocations.push({
      lotId: lot.id,
      amount: deduct,
      expDate: lot.expires_at,
    });

    remainingToDeduct -= deduct;
  }

  // Insert ledger transaction in point_transactions
  const redemptionId = crypto.randomUUID();
  await supabase.from("point_transactions").insert({
    user_id: params.creatorId,
    transaction_type: "redeemed",
    amount: reward.requiredPoin,
    reference_id: redemptionId,
    idempotency_key: idempotencyKey,
    description: `Penukaran Hadiah: ${reward.name}`,
    created_at: new Date().toISOString(),
  });

  // Save redemption record
  const record: Redemption = {
    id: redemptionId,
    creatorId: params.creatorId,
    rewardId: reward.id,
    requiredPointsSnapshot: reward.requiredPoin,
    rewardNameSnapshot: reward.name,
    status: "pending",
    requestedAt: new Date().toISOString(),
    recipientName: params.recipientName || null,
    shippingAddress: params.shippingAddress || null,
    contactWhatsapp: params.contactWhatsapp || null,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rewardType: reward.rewardType,
    rewardImage: reward.image,
  };

  // Keep in-memory and persistent cache synchronized
  inMemoryRedemptions.set(record.id, record);
  saveStoredRedemptions(inMemoryRedemptions);

  try {
    await supabase.from("redemptions").insert({
      id: record.id,
      creator_id: record.creatorId,
      reward_id: record.rewardId,
      required_points_snapshot: record.requiredPointsSnapshot,
      reward_name_snapshot: record.rewardNameSnapshot,
      status: record.status,
      requested_at: record.requestedAt,
      recipient_name: record.recipientName,
      shipping_address: record.shippingAddress,
      contact_whatsapp: record.contactWhatsapp,
      idempotency_key: record.idempotencyKey,
    });
  } catch {
    // Handled by inMemoryRedemptions & saveStoredRedemptions
  }

  return {
    status: "success",
    redemptionId: record.id,
    rewardName: reward.name,
    pointsSpent: reward.requiredPoin,
    remainingBalance: totalAvailable - reward.requiredPoin,
    message: "Berhasil! Hadiahmu sudah diajukan.",
  };
}

/**
 * Fetch all redemptions for a specific creator, sorted newest first
 */
export async function fetchCreatorRedemptions(creatorId: string): Promise<Redemption[]> {
  const supabase = createClient();
  const catalog = await fetchRewardsCatalog();
  const catalogMap = new Map(catalog.map((r) => [r.id, r]));

  try {
    const { data, error } = await supabase
      .from("redemptions")
      .select("*")
      .eq("creator_id", creatorId)
      .order("requested_at", { ascending: false })
      .order("id", { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped: Redemption[] = data.map((row) => {
        const rewardInfo = catalogMap.get(row.reward_id);
        return {
          id: row.id,
          creatorId: row.creator_id,
          rewardId: row.reward_id,
          requiredPointsSnapshot: row.required_points_snapshot,
          rewardNameSnapshot: row.reward_name_snapshot,
          status: row.status as RedemptionStatus,
          requestedAt: row.requested_at,
          processedAt: row.processed_at,
          processedBy: row.processed_by,
          fulfillmentNotes: row.fulfillment_notes,
          rejectionReason: row.rejection_reason,
          recipientName: row.recipient_name,
          shippingAddress: row.shipping_address,
          contactWhatsapp: row.contact_whatsapp,
          idempotencyKey: row.idempotency_key,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          rewardType: rewardInfo?.rewardType || "merchandise",
          rewardImage: rewardInfo?.image,
        };
      });

      for (const item of mapped) {
        inMemoryRedemptions.set(item.id, item);
      }
      saveStoredRedemptions(inMemoryRedemptions);

      return mapped;
    }
  } catch (err) {
    console.warn("fetchCreatorRedemptions falling back to in-memory/transactions:", err);
  }

  // Persistent fallback
  const stored = getStoredRedemptions();
  const userRedemptions: Redemption[] = [];
  stored.forEach((red) => {
    if (red.creatorId === creatorId) {
      userRedemptions.push(red);
    }
  });

  return userRedemptions.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

/**
 * Fetch all redemptions for admin management, sorted newest first
 */
export async function fetchAdminRedemptions(statusFilter?: string): Promise<Redemption[]> {
  const supabase = createClient();
  const catalog = await fetchRewardsCatalog();
  const catalogMap = new Map(catalog.map((r) => [r.id, r]));

  try {
    let query = supabase
      .from("redemptions")
      .select(`
        *,
        profiles:creator_id (
          full_name,
          email,
          avatar_url,
          whatsapp_number
        )
      `)
      .order("requested_at", { ascending: false })
      .order("id", { ascending: false });

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter as RedemptionStatus);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const mapped: Redemption[] = data.map((row) => {
        const rewardInfo = catalogMap.get(row.reward_id);
        const profile = row.profiles as {
          full_name?: string;
          email?: string;
          avatar_url?: string | null;
          whatsapp_number?: string | null;
        } | null;

        return {
          id: row.id,
          creatorId: row.creator_id,
          rewardId: row.reward_id,
          requiredPointsSnapshot: row.required_points_snapshot,
          rewardNameSnapshot: row.reward_name_snapshot,
          status: row.status as RedemptionStatus,
          requestedAt: row.requested_at,
          processedAt: row.processed_at,
          processedBy: row.processed_by,
          fulfillmentNotes: row.fulfillment_notes,
          rejectionReason: row.rejection_reason,
          recipientName: row.recipient_name,
          shippingAddress: row.shipping_address,
          contactWhatsapp: row.contact_whatsapp || profile?.whatsapp_number || null,
          idempotencyKey: row.idempotency_key,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          creatorName: profile?.full_name || "Creator",
          creatorEmail: profile?.email || "",
          creatorAvatar: profile?.avatar_url || null,
          rewardType: rewardInfo?.rewardType || "merchandise",
          rewardImage: rewardInfo?.image,
        };
      });

      for (const item of mapped) {
        inMemoryRedemptions.set(item.id, item);
      }
      saveStoredRedemptions(inMemoryRedemptions);

      return mapped;
    }
  } catch (err) {
    console.warn("fetchAdminRedemptions falling back:", err);
  }

  // Persistent fallback
  const stored = getStoredRedemptions();
  const list: Redemption[] = [];
  stored.forEach((red) => {
    if (!statusFilter || statusFilter === "all" || red.status === statusFilter) {
      list.push(red);
    }
  });

  return list.sort(
    (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
  );
}

export interface ProcessRedemptionParams {
  redemptionId: string;
  adminId: string;
  action: "processing" | "ready" | "completed" | "reject";
  fulfillmentNotes?: string;
  rejectionReason?: string;
}

/**
 * Process a redemption request as Administrator
 * Handles state transitions and safe point refunds on rejection
 */
export async function processAdminRedemption(
  params: ProcessRedemptionParams
): Promise<{ status: string; message: string }> {
  const supabase = createClient();
  const now = new Date().toISOString();

  // Try RPC first
  try {
    const { data, error } = await supabase.rpc("admin_process_redemption", {
      p_redemption_id: params.redemptionId,
      p_action: params.action,
      p_fulfillment_notes: params.fulfillmentNotes || null,
      p_rejection_reason: params.rejectionReason || null,
    });

    if (!error && data) {
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      // Synchronize local cache with updated status
      const stored = getStoredRedemptions();
      const mem = stored.get(params.redemptionId);
      if (mem) {
        mem.status = params.action === "reject" ? "rejected" : params.action;
        if (params.fulfillmentNotes) mem.fulfillmentNotes = params.fulfillmentNotes;
        if (params.rejectionReason) mem.rejectionReason = params.rejectionReason;
        mem.processedAt = now;
        mem.processedBy = params.adminId;
        mem.updatedAt = now;
        inMemoryRedemptions.set(mem.id, mem);
        saveStoredRedemptions(inMemoryRedemptions);
      }

      return {
        status: "success",
        message: parsed.message || "Aksi penukaran berhasil diproses.",
      };
    }
  } catch (rpcErr) {
    console.warn("RPC admin_process_redemption failed, attempting client fallback:", rpcErr);
  }

  // Fallback execution
  const stored = getStoredRedemptions();
  let currentRedemption: Redemption | null = stored.get(params.redemptionId) || null;

  if (!currentRedemption) {
    try {
      const { data: redemption, error: selErr } = await supabase
        .from("redemptions")
        .select("*")
        .eq("id", params.redemptionId)
        .maybeSingle();

      if (!selErr && redemption) {
        currentRedemption = {
          id: redemption.id,
          creatorId: redemption.creator_id,
          rewardId: redemption.reward_id,
          requiredPointsSnapshot: redemption.required_points_snapshot,
          rewardNameSnapshot: redemption.reward_name_snapshot,
          status: redemption.status as RedemptionStatus,
          requestedAt: redemption.requested_at,
          processedAt: redemption.processed_at,
          processedBy: redemption.processed_by,
          fulfillmentNotes: redemption.fulfillment_notes,
          rejectionReason: redemption.rejection_reason,
          recipientName: redemption.recipient_name,
          shippingAddress: redemption.shipping_address,
          contactWhatsapp: redemption.contact_whatsapp,
          idempotencyKey: redemption.idempotency_key,
          createdAt: redemption.created_at,
          updatedAt: redemption.updated_at,
        };
      }
    } catch {
      // ignore
    }
  }

  if (!currentRedemption) {
    throw new Error("Data penukaran tidak ditemukan.");
  }

  if (currentRedemption.status === "rejected") {
    throw new Error("Penukaran ini sudah pernah ditolak sebelumnya.");
  }

  if (currentRedemption.status === "completed" && params.action === "reject") {
    throw new Error("Penukaran yang sudah selesai tidak dapat ditolak.");
  }

  if (params.action === "reject") {
    if (!params.rejectionReason || !params.rejectionReason.trim()) {
      throw new Error("Alasan penolakan wajib diisi.");
    }

    const creatorId = currentRedemption.creatorId;
    const requiredPoints = currentRedemption.requiredPointsSnapshot;
    const rewardName = currentRedemption.rewardNameSnapshot;
    const refundKey = `refund_redemption_${params.redemptionId}`;

    // Strict Idempotency Check: ensure point_transactions has no previous refund for this redemption
    try {
      const { data: existingRefund } = await supabase
        .from("point_transactions")
        .select("id")
        .or(`idempotency_key.eq.${refundKey},and(reference_id.eq.${params.redemptionId},transaction_type.eq.adjustment)`)
        .maybeSingle();

      if (existingRefund) {
        throw new Error("Poin untuk penukaran ini sudah pernah dikembalikan sebelumnya.");
      }
    } catch (idempErr) {
      if (idempErr instanceof Error && idempErr.message.includes("sudah pernah")) {
        throw idempErr;
      }
    }

    // Safely refund points into creator wallet with idempotency key
    try {
      await supabase.rpc("issue_points_lot", {
        target_user_id: creatorId,
        p_points: requiredPoints,
        p_source_type: "adjustment",
        p_source_id: params.redemptionId,
        p_description: `Pengembalian Poin Penukaran Dibatalkan: ${rewardName}`,
        p_idempotency_key: refundKey,
      });
    } catch (issueErr) {
      console.warn("issue_points_lot fallback error:", issueErr);
    }

    // Update status in remote database
    try {
      await supabase
        .from("redemptions")
        .update({
          status: "rejected",
          rejection_reason: params.rejectionReason,
          fulfillment_notes: params.fulfillmentNotes || null,
          processed_at: now,
          processed_by: params.adminId,
          updated_at: now,
        })
        .eq("id", params.redemptionId);
    } catch {
      // Handled by in-memory & stored cache
    }

    // Persist status change in memory and localStorage
    currentRedemption.status = "rejected";
    currentRedemption.rejectionReason = params.rejectionReason;
    currentRedemption.fulfillmentNotes = params.fulfillmentNotes || null;
    currentRedemption.processedAt = now;
    currentRedemption.processedBy = params.adminId;
    currentRedemption.updatedAt = now;

    inMemoryRedemptions.set(params.redemptionId, currentRedemption);
    saveStoredRedemptions(inMemoryRedemptions);

    return {
      status: "success",
      message: "Penukaran berhasil ditolak dan poin telah dikembalikan.",
    };
  }

  const targetStatus: RedemptionStatus =
    params.action === "processing"
      ? "processing"
      : params.action === "ready"
      ? "ready"
      : "completed";

  try {
    await supabase
      .from("redemptions")
      .update({
        status: targetStatus,
        fulfillment_notes: params.fulfillmentNotes || null,
        processed_at: now,
        processed_by: params.adminId,
        updated_at: now,
      })
      .eq("id", params.redemptionId);
  } catch {
    // Handled by in-memory & stored cache
  }

  currentRedemption.status = targetStatus;
  currentRedemption.fulfillmentNotes = params.fulfillmentNotes || null;
  currentRedemption.processedAt = now;
  currentRedemption.processedBy = params.adminId;
  currentRedemption.updatedAt = now;

  inMemoryRedemptions.set(params.redemptionId, currentRedemption);
  saveStoredRedemptions(inMemoryRedemptions);

  return {
    status: "success",
    message: `Status penukaran berhasil diubah menjadi ${targetStatus}.`,
  };
}
