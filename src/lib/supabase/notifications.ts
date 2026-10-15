import { createClient } from "./client";
import { AppNotification } from "../types/notification";
import { getStoredRedemptions } from "./rewards";

const READ_STORAGE_PREFIX = "mrbob_read_notifs_";

export function getReadNotificationIds(userId: string): Set<string> {
  if (typeof window === "undefined" || !userId) return new Set();
  try {
    const raw = localStorage.getItem(`${READ_STORAGE_PREFIX}${userId}`);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr : []);
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return new Set();
}

export function saveReadNotificationIds(userId: string, ids: Set<string>): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(
      `${READ_STORAGE_PREFIX}${userId}`,
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch real system notifications for authenticated user
 */
export async function fetchUserNotifications(
  userId: string,
  isAdmin: boolean = false
): Promise<AppNotification[]> {
  const supabase = createClient();
  const notifications: AppNotification[] = [];
  const readIds = getReadNotificationIds(userId);

  try {
    // 1. Fetch user's submissions for status notifications
    const { data: userSubs } = await supabase
      .from("submissions")
      .select("id, platform, status, verified_views, approved_points, submitted_at, updated_at, admin_notes")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(20);

    if (userSubs) {
      for (const s of userSubs) {
        if (s.status === "approved") {
          notifications.push({
            id: `sub-appr-${s.id}`,
            userId,
            type: "submission_approved",
            title: "Video Disetujui! 🎉",
            message: `Video ${s.platform} berhasil diverifikasi (${(s.verified_views || 0).toLocaleString("id-ID")} views). +${s.approved_points || 0} Poin ditambahkan.`,
            href: "/creator/my-contents",
            createdAt: s.updated_at || s.submitted_at,
            isRead: readIds.has(`sub-appr-${s.id}`),
          });
        } else if (s.status === "rejected") {
          notifications.push({
            id: `sub-rej-${s.id}`,
            userId,
            type: "submission_rejected",
            title: "Pengajuan Video Ditolak",
            message: s.admin_notes
              ? `Catatan Admin: ${s.admin_notes}`
              : `Pengajuan video ${s.platform} belum memenuhi kriteria program.`,
            href: "/creator/my-contents",
            createdAt: s.updated_at || s.submitted_at,
            isRead: readIds.has(`sub-rej-${s.id}`),
          });
        } else if (s.status === "requires_revision") {
          notifications.push({
            id: `sub-rev-${s.id}`,
            userId,
            type: "submission_revision",
            title: "Perlu Bukti Tambahan ⚠️",
            message: s.admin_notes
              ? `Catatan Admin: ${s.admin_notes}`
              : `Admin meminta bukti screenshot analitik tambahan untuk video ${s.platform} Anda.`,
            href: "/creator/my-contents",
            createdAt: s.updated_at || s.submitted_at,
            isRead: readIds.has(`sub-rev-${s.id}`),
          });
        }
      }
    }

    // 2. Fetch user's point transactions (points issued & redemptions)
    const { data: txs } = await supabase
      .from("point_transactions")
      .select("id, transaction_type, amount, description, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (txs) {
      for (const tx of txs) {
        if (tx.transaction_type === "earned" || tx.transaction_type === "bonus") {
          notifications.push({
            id: `tx-${tx.id}`,
            userId,
            type: "points_issued",
            title: "Poin Diterbitkan ✨",
            message: `+${tx.amount} Poin telah masuk ke dompet Anda: ${tx.description}`,
            href: "/creator/my-points",
            createdAt: tx.created_at,
            isRead: readIds.has(`tx-${tx.id}`),
          });
        } else if (tx.transaction_type === "redeemed") {
          notifications.push({
            id: `tx-${tx.id}`,
            userId,
            type: "points_issued",
            title: "Poin Digunakan 🎁",
            message: `${tx.amount} Poin telah digunakan: ${tx.description}`,
            href: "/creator/my-points",
            createdAt: tx.created_at,
            isRead: readIds.has(`tx-${tx.id}`),
          });
        }
      }
    }

    // 3. Fetch user's redemptions
    const redemptionsMap = getStoredRedemptions();
    const userReds = Array.from(redemptionsMap.values()).filter(
      (r) => r.creatorId === userId
    );

    for (const r of userReds) {
      if (r.status === "completed") {
        notifications.push({
          id: `red-comp-${r.id}`,
          userId,
          type: "redemption_completed",
          title: "Klaim Hadiah Selesai! 🎁",
          message: `Penukaran ${r.rewardNameSnapshot} telah selesai diproses oleh admin.`,
          href: "/creator/my-rewards",
          createdAt: r.processedAt || r.requestedAt,
          isRead: readIds.has(`red-comp-${r.id}`),
        });
      } else if (r.status === "rejected") {
        notifications.push({
          id: `red-rej-${r.id}`,
          userId,
          type: "redemption_rejected",
          title: "Klaim Hadiah Dibatalkan",
          message: `Penukaran ${r.rewardNameSnapshot} dibatalkan. Poin telah dikembalikan ke saldo Anda.`,
          href: "/creator/my-rewards",
          createdAt: r.processedAt || r.requestedAt,
          isRead: readIds.has(`red-rej-${r.id}`),
        });
      } else if (r.status === "processing" || r.status === "ready") {
        notifications.push({
          id: `red-proc-${r.id}`,
          userId,
          type: "redemption_processing",
          title: "Hadiah Sedang Diproses",
          message: `Penukaran ${r.rewardNameSnapshot} sedang diproses/siap digunakan.`,
          href: "/creator/my-rewards",
          createdAt: r.processedAt || r.requestedAt,
          isRead: readIds.has(`red-proc-${r.id}`),
        });
      }
    }

    // 4. Admin-specific notifications
    if (isAdmin) {
      // Pending submissions awaiting verification
      const { data: pendingSubs, count } = await supabase
        .from("submissions")
        .select("id, submitted_at", { count: "exact" })
        .in("status", ["submitted", "under_review", "requires_revision"])
        .order("submitted_at", { ascending: false })
        .limit(1);

      if (count && count > 0 && pendingSubs && pendingSubs.length > 0) {
        notifications.push({
          id: `admin-pending-subs-${pendingSubs[0].id}`,
          userId,
          type: "admin_pending_submission",
          title: "Antrean Verifikasi Konten",
          message: `Terdapat ${count} video kreator menunggu ditinjau dan diverifikasi.`,
          href: "/admin/verifications",
          createdAt: pendingSubs[0].submitted_at,
          isRead: readIds.has(`admin-pending-subs-${pendingSubs[0].id}`),
        });
      }
    }
  } catch (err) {
    console.error("Failed to load user notifications:", err);
  }

  // Deduplicate and sort newest first
  const seen = new Set<string>();
  const uniqueNotifications: AppNotification[] = [];

  for (const n of notifications) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      uniqueNotifications.push(n);
    }
  }

  return uniqueNotifications.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function markAsRead(userId: string, notificationId: string): void {
  const current = getReadNotificationIds(userId);
  current.add(notificationId);
  saveReadNotificationIds(userId, current);
}

export function markAllAsRead(userId: string, notificationIds: string[]): void {
  const current = getReadNotificationIds(userId);
  for (const id of notificationIds) {
    current.add(id);
  }
  saveReadNotificationIds(userId, current);
}
