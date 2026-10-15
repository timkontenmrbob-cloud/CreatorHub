import { createClient } from "./client";
import { normalizeVideoUrl } from "../video-url";
import {
  Submission,
  SubmissionDraft,
  SubmissionEvidence,
  SubmissionAuditLog,
  AdminSubmissionItem,
  CreateSubmissionInput,
  SaveDraftInput,
  ApproveSubmissionInput,
  RejectSubmissionInput,
  RequestEvidenceInput,
} from "../types/submission";
import { calculatePointsFromViews } from "../utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Checks video eligibility:
 * 1. Valid platform URL (TikTok / IG Reels)
 * 2. Duplicate check (prevent resubmission)
 * 3. 30-day submission window (Posting Date = Day 1, Deadline = Day 30 at 23:59:59 WIB)
 */
export async function checkVideoEligibility(
  videoUrl: string,
  postingDate: string,
  currentUserId?: string
): Promise<{
  eligible: boolean;
  message: string;
  reason?: "invalid_url" | "future_date" | "expired" | "duplicate";
  normalizedIdentifier?: string;
  cleanUrl?: string;
  daysRemaining?: number;
  deadlineWib?: string;
  isOwnSubmission?: boolean;
}> {
  const normResult = normalizeVideoUrl(videoUrl);
  if (!normResult.isValid || !normResult.data) {
    return {
      eligible: false,
      reason: "invalid_url",
      message: normResult.error || "Tautan video tidak valid.",
    };
  }

  const { normalizedIdentifier, cleanUrl } = normResult.data;
  const supabase = createClient();

  // 1. Authoritative duplicate check in submissions table
  const { data: existing } = await supabase
    .from("submissions")
    .select("id, user_id, status")
    .eq("normalized_video_identifier", normalizedIdentifier)
    .maybeSingle();

  if (existing) {
    const isOwnSubmission = Boolean(currentUserId && existing.user_id === currentUserId);
    return {
      eligible: false,
      reason: "duplicate",
      message: isOwnSubmission
        ? "Konten ini sudah pernah kamu ajukan. Gunakan link video lainnya atau lihat pengajuan sebelumnya."
        : "Konten dengan tautan ini sudah terdaftar di sistem. Gunakan link video lainnya.",
      normalizedIdentifier,
      cleanUrl,
      isOwnSubmission,
    };
  }

  // 2. Try RPC for authoritative server-side check
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "check_video_submission_eligibility",
      {
        p_normalized_identifier: normalizedIdentifier,
        p_posting_date: postingDate,
      }
    );

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
      return {
        eligible: Boolean(parsed.eligible),
        message: parsed.message || (parsed.eligible ? "Video memenuhi syarat." : "Video tidak memenuhi syarat."),
        reason: parsed.reason,
        normalizedIdentifier,
        cleanUrl,
        daysRemaining: parsed.days_remaining,
        deadlineWib: parsed.deadline,
      };
    }
  } catch (err) {
    console.warn("RPC check_video_submission_eligibility unavailable, falling back to direct check:", err);
  }

  // 2. Validate posting date against 30-day window
  const pDate = new Date(postingDate + "T00:00:00+07:00");
  const now = new Date();
  if (isNaN(pDate.getTime())) {
    return {
      eligible: false,
      reason: "invalid_url",
      message: "Tanggal posting tidak valid.",
      normalizedIdentifier,
      cleanUrl,
    };
  }

  if (pDate.getTime() > now.getTime()) {
    return {
      eligible: false,
      reason: "future_date",
      message: "Tanggal posting tidak boleh berada di masa depan.",
      normalizedIdentifier,
      cleanUrl,
    };
  }

  // 30 days window: Day 1 = posting date
  // End of Day 30 is posting date + 29 days at 23:59:59.999 WIB
  const deadline = new Date(pDate.getTime() + 29 * 24 * 60 * 60 * 1000);
  deadline.setHours(23, 59, 59, 999);

  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

  if (diffMs <= 0) {
    return {
      eligible: false,
      reason: "expired",
      message: "Masa pengajuan konten ini sudah berakhir (melebihi batas 30 hari kalender).",
      normalizedIdentifier,
      cleanUrl,
      daysRemaining: 0,
      deadlineWib: deadline.toISOString(),
    };
  }

  return {
    eligible: true,
    message: "Video memenuhi syarat untuk diajukan.",
    normalizedIdentifier,
    cleanUrl,
    daysRemaining,
    deadlineWib: deadline.toISOString(),
  };
}

/**
 * Upload screenshot evidence to private Supabase Storage bucket 'submission-evidence'
 */
export async function uploadSubmissionEvidenceFile(
  userId: string,
  file: File
): Promise<{ storagePath: string; fileName: string; fileSize: number; mimeType: string }> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("Format file bukti harus berupa gambar (JPG, PNG, atau WEBP).");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file bukti maksimal 5 MB.");
  }

  const supabase = createClient();
  const fileExt = file.name.split(".").pop() || "jpg";
  const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const storagePath = `${userId}/${uniqueId}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("submission-evidence")
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(`Gagal mengunggah bukti screenshot: ${uploadError.message}`);
  }

  return {
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Create a signed URL to safely preview private screenshot evidence
 */
export async function getEvidenceSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("submission-evidence")
    .createSignedUrl(storagePath, 3600); // 1 hour validity

  if (error || !data) {
    console.warn("Could not generate signed URL for evidence:", error);
    return null;
  }

  return data.signedUrl;
}

/**
 * Save or update a submission draft (does NOT extend 30-day window)
 */
export async function saveSubmissionDraft(
  userId: string,
  input: SaveDraftInput
): Promise<SubmissionDraft> {
  const supabase = createClient();
  const norm = normalizeVideoUrl(input.videoUrl);

  const payload = {
    user_id: userId,
    platform: input.platform,
    video_url: norm.isValid && norm.data ? norm.data.cleanUrl : input.videoUrl.trim(),
    normalized_video_identifier: norm.isValid && norm.data ? norm.data.normalizedIdentifier : null,
    posting_date: input.postingDate,
    current_views: input.currentViews || null,
    estimated_points: input.currentViews ? calculatePointsFromViews(input.currentViews) : null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from("submission_drafts")
      .update(payload)
      .eq("id", input.id)
      .eq("user_id", userId)
      .select("*")
      .single();

    if (error) throw new Error(`Gagal memperbarui draft: ${error.message}`);
    return {
      id: data.id,
      userId: data.user_id,
      platform: data.platform,
      videoUrl: data.video_url,
      normalizedIdentifier: data.normalized_video_identifier,
      postingDate: data.posting_date,
      currentViews: data.current_views,
      estimatedPoints: data.estimated_points,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  const { data, error } = await supabase
    .from("submission_drafts")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(`Gagal menyimpan draft: ${error.message}`);
  return {
    id: data.id,
    userId: data.user_id,
    platform: data.platform,
    videoUrl: data.video_url,
    normalizedIdentifier: data.normalized_video_identifier,
    postingDate: data.posting_date,
    currentViews: data.current_views,
    estimatedPoints: data.estimated_points,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Fetch all drafts for a creator
 */
export async function fetchCreatorDrafts(userId: string): Promise<SubmissionDraft[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submission_drafts")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching drafts:", error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    videoUrl: row.video_url,
    normalizedIdentifier: row.normalized_video_identifier,
    postingDate: row.posting_date,
    currentViews: row.current_views,
    estimatedPoints: row.estimated_points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Delete a submission draft
 */
export async function deleteSubmissionDraft(draftId: string, userId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("submission_drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting draft:", error);
  }
}

/**
 * Submit final video for administrator review (ONE-TIME ONLY, locked snapshot)
 */
export async function submitFinalVideo(
  userId: string,
  input: CreateSubmissionInput
): Promise<Submission> {
  const supabase = createClient();

  // 1. Mandatory server-side agreement validation
  if (!input.agreementAccepted) {
    throw new Error("Pernyataan keaslian data wajib disetujui sebelum mengirim pengajuan.");
  }

  // 2. Eligibility & Duplicate check
  const eligibility = await checkVideoEligibility(input.videoUrl, input.postingDate, userId);
  if (!eligibility.eligible || !eligibility.normalizedIdentifier) {
    throw new Error(eligibility.message || "Video tidak memenuhi syarat pengajuan.");
  }

  if (input.claimedViews < 0) {
    throw new Error("Jumlah views tidak boleh negatif.");
  }

  const estimatedPoints = calculatePointsFromViews(input.claimedViews);

  // 3. Upload screenshot evidence first
  const evidenceMeta = await uploadSubmissionEvidenceFile(userId, input.evidenceFile);

  // 4. Insert into submissions table with agreement audit record
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submissionPayload: any = {
    user_id: userId,
    platform: input.platform,
    video_url: eligibility.cleanUrl || input.videoUrl.trim(),
    normalized_video_identifier: eligibility.normalizedIdentifier,
    posting_date: input.postingDate,
    claimed_views: input.claimedViews,
    estimated_points: estimatedPoints,
    status: "submitted",
    agreement_accepted: true,
    agreement_version: input.agreementVersion || "v1.0",
    agreement_accepted_at: new Date().toISOString(),
  };

  let { data: subData, error: subError } = await supabase
    .from("submissions")
    .insert(submissionPayload)
    .select("*")
    .single();

  // Defensive fallback if remote schema cache does not yet have agreement columns
  if (subError && (subError.message?.includes("agreement_accepted") || subError.code === "PGRST204")) {
    console.warn("Retrying submission insert without agreement columns (pending remote SQL migration):", subError.message);
    delete submissionPayload.agreement_accepted;
    delete submissionPayload.agreement_version;
    delete submissionPayload.agreement_accepted_at;
    const retry = await supabase
      .from("submissions")
      .insert(submissionPayload)
      .select("*")
      .single();
    subData = retry.data;
    subError = retry.error;
  }

  if (subError || !subData) {
    // Check unique violation code 23505
    if (subError?.code === "23505" || subError?.message?.includes("unique")) {
      throw new Error("Video ini sudah pernah diajukan sebelumnya dan tidak dapat disubmit ulang.");
    }
    throw new Error(`Gagal membuat pengajuan video: ${subError?.message || "Data pengajuan tidak berhasil dibuat."}`);
  }

  // 4. Insert evidence record referencing submission
  const { error: evError } = await supabase.from("submission_evidence").insert({
    submission_id: subData.id,
    storage_path: evidenceMeta.storagePath,
    file_name: evidenceMeta.fileName,
    file_size: evidenceMeta.fileSize,
    mime_type: evidenceMeta.mimeType,
    retention_status: "active",
  });

  if (evError) {
    console.warn("Evidence metadata insert warning:", evError);
  }

  // 5. Delete draft if originated from draft
  if (input.draftId) {
    await deleteSubmissionDraft(input.draftId, userId);
  }

  return {
    id: subData.id,
    userId: subData.user_id,
    platform: subData.platform,
    videoUrl: subData.video_url,
    normalizedIdentifier: subData.normalized_video_identifier,
    postingDate: subData.posting_date,
    submittedAt: subData.submitted_at,
    claimedViews: subData.claimed_views,
    estimatedPoints: subData.estimated_points,
    verifiedViews: subData.verified_views,
    approvedPoints: subData.approved_points,
    status: subData.status,
    adminNotes: subData.admin_notes,
    createdAt: subData.created_at,
    updatedAt: subData.updated_at,
  };
}

/**
 * Fetch all submissions for a creator with attached evidence
 */
export async function fetchCreatorSubmissions(userId: string): Promise<Submission[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select(`
      *,
      submission_evidence (*)
    `)
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("Error fetching creator submissions:", error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    videoUrl: row.video_url,
    normalizedIdentifier: row.normalized_video_identifier,
    postingDate: row.posting_date,
    submittedAt: row.submitted_at,
    claimedViews: row.claimed_views,
    estimatedPoints: row.estimated_points,
    verifiedViews: row.verified_views,
    approvedPoints: row.approved_points,
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    evidence: (row.submission_evidence || []).map((ev: any) => ({
      id: ev.id,
      submissionId: ev.submission_id,
      storagePath: ev.storage_path,
      fileName: ev.file_name,
      fileSize: ev.file_size,
      mimeType: ev.mime_type,
      uploadedAt: ev.uploaded_at,
      retentionStatus: ev.retention_status,
      scheduledDeletionAt: ev.scheduled_deletion_at,
      deletedAt: ev.deleted_at,
    })),
  }));
}

/**
 * Fetch creator submission stats for dashboard display
 */
export async function fetchCreatorSubmissionStats(userId: string): Promise<{
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalClaimedViews: number;
  totalEstimatedPendingPoints: number;
}> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submissions")
    .select("status, claimed_views, estimated_points")
    .eq("user_id", userId);

  if (error || !data) {
    return {
      totalSubmissions: 0,
      pendingSubmissions: 0,
      approvedSubmissions: 0,
      rejectedSubmissions: 0,
      totalClaimedViews: 0,
      totalEstimatedPendingPoints: 0,
    };
  }

  const totalSubmissions = data.length;
  const pendingSubmissions = data.filter(
    (s) => s.status === "submitted" || s.status === "under_review" || s.status === "requires_revision"
  ).length;
  const approvedSubmissions = data.filter((s) => s.status === "approved").length;
  const rejectedSubmissions = data.filter((s) => s.status === "rejected").length;
  const totalClaimedViews = data.reduce((acc, s) => acc + (s.claimed_views || 0), 0);
  const totalEstimatedPendingPoints = data
    .filter((s) => s.status === "submitted" || s.status === "under_review")
    .reduce((acc, s) => acc + (s.estimated_points || 0), 0);

  return {
    totalSubmissions,
    pendingSubmissions,
    approvedSubmissions,
    rejectedSubmissions,
    totalClaimedViews,
    totalEstimatedPendingPoints,
  };
}

/**
 * Fetch all submissions for admin verification queue with creator info
 */
export async function fetchAdminSubmissions(filter?: {
  status?: string;
  search?: string;
}): Promise<AdminSubmissionItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("submissions")
    .select(`
      *,
      submission_evidence (*)
    `)
    .order("submitted_at", { ascending: false });

  if (filter?.status && filter.status !== "all") {
    query = query.eq("status", filter.status as "submitted" | "under_review" | "requires_revision" | "approved" | "rejected");
  }

  const { data: subData, error: subErr } = await query;
  if (subErr || !subData) {
    console.error("Error fetching admin submissions:", subErr);
    return [];
  }

  // Get unique creator user IDs to fetch profile data in a single batched query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = Array.from(new Set(subData.map((s: any) => s.user_id)));
  const profileMap = new Map<string, { fullName: string; email: string; avatarUrl: string | null }>();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url")
      .in("id", userIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (profiles || []).forEach((p: any) => {
      profileMap.set(p.id, {
        fullName: p.full_name || "Creator",
        email: p.email || "",
        avatarUrl: p.avatar_url || null,
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results: AdminSubmissionItem[] = subData.map((row: any) => {
    const profile = profileMap.get(row.user_id) || {
      fullName: "Creator",
      email: "",
      avatarUrl: null,
    };

    return {
      id: row.id,
      userId: row.user_id,
      platform: row.platform,
      videoUrl: row.video_url,
      normalizedIdentifier: row.normalized_video_identifier,
      postingDate: row.posting_date,
      submittedAt: row.submitted_at,
      claimedViews: row.claimed_views,
      estimatedPoints: row.estimated_points,
      verifiedViews: row.verified_views,
      approvedPoints: row.approved_points,
      status: row.status,
      adminNotes: row.admin_notes,
      reviewedAt: row.reviewed_at,
      reviewedBy: row.reviewed_by,
      agreementAccepted: row.agreement_accepted,
      agreementVersion: row.agreement_version,
      agreementAcceptedAt: row.agreement_accepted_at,
      creatorName: profile.fullName,
      creatorEmail: profile.email,
      creatorAvatar: profile.avatarUrl,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      evidence: (row.submission_evidence || []).map((ev: any) => ({
        id: ev.id,
        submissionId: ev.submission_id,
        storagePath: ev.storage_path,
        fileName: ev.file_name,
        fileSize: ev.file_size,
        mimeType: ev.mime_type,
        uploadedAt: ev.uploaded_at,
        retentionStatus: ev.retention_status,
        scheduledDeletionAt: ev.scheduled_deletion_at,
        deletedAt: ev.deleted_at,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });

  if (filter?.search?.trim()) {
    const q = filter.search.toLowerCase().trim();
    results = results.filter(
      (item) =>
        item.creatorName.toLowerCase().includes(q) ||
        item.creatorEmail.toLowerCase().includes(q) ||
        item.videoUrl.toLowerCase().includes(q)
    );
  }

  return results;
}

/**
 * Fetch detailed submission with creator profile and signed URLs for private evidence
 */
export async function fetchSubmissionDetail(submissionId: string): Promise<AdminSubmissionItem | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("submissions")
    .select(`
      *,
      submission_evidence (*)
    `)
    .eq("id", submissionId)
    .single();

  if (error || !row) {
    return null;
  }

  // Fetch creator profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, avatar_url")
    .eq("id", row.user_id)
    .single();

  // Fetch audit logs
  const auditLogs = await fetchSubmissionAuditLogs(submissionId);

  // Generate signed URLs for private evidence images
  const evidenceWithUrls: SubmissionEvidence[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row.submission_evidence || []).map(async (ev: any) => {
      let publicUrl: string | null = null;
      if (ev.retention_status !== "deleted") {
        publicUrl = await getEvidenceSignedUrl(ev.storage_path);
      }
      return {
        id: ev.id,
        submissionId: ev.submission_id,
        storagePath: ev.storage_path,
        fileName: ev.file_name,
        fileSize: ev.file_size,
        mimeType: ev.mime_type,
        uploadedAt: ev.uploaded_at,
        retentionStatus: ev.retention_status,
        scheduledDeletionAt: ev.scheduled_deletion_at,
        deletedAt: ev.deleted_at,
        publicUrl,
      };
    })
  );

  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    videoUrl: row.video_url,
    normalizedIdentifier: row.normalized_video_identifier,
    postingDate: row.posting_date,
    submittedAt: row.submitted_at,
    claimedViews: row.claimed_views,
    estimatedPoints: row.estimated_points,
    verifiedViews: row.verified_views,
    approvedPoints: row.approved_points,
    status: row.status,
    adminNotes: row.admin_notes,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    agreementAccepted: row.agreement_accepted,
    agreementVersion: row.agreement_version,
    agreementAcceptedAt: row.agreement_accepted_at,
    creatorName: profile?.full_name || "Creator",
    creatorEmail: profile?.email || "",
    creatorAvatar: profile?.avatar_url || null,
    evidence: evidenceWithUrls,
    auditLogs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch permanent audit log trail for a submission
 */
export async function fetchSubmissionAuditLogs(submissionId: string): Promise<SubmissionAuditLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("submission_audit_logs")
    .select("*")
    .eq("submission_id", submissionId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminIds = Array.from(new Set(data.map((l: any) => l.admin_id).filter(Boolean)));
  const adminMap = new Map<string, { fullName: string; email: string }>();

  if (adminIds.length > 0) {
    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", adminIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (adminProfiles || []).forEach((a: any) => {
      adminMap.set(a.id, {
        fullName: a.full_name || "Admin",
        email: a.email || "",
      });
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((l: any) => {
    const admin = adminMap.get(l.admin_id);
    return {
      id: l.id,
      submissionId: l.submission_id,
      adminId: l.admin_id,
      adminName: admin?.fullName || "Admin",
      adminEmail: admin?.email || "",
      previousStatus: l.previous_status,
      newStatus: l.new_status,
      verifiedViews: l.verified_views,
      approvedPoints: l.approved_points,
      decisionReason: l.decision_reason,
      adminNotes: l.admin_notes,
      createdAt: l.created_at,
    };
  });
}

/**
 * Approve submission atomically and issue points to creator wallet
 */
export async function approveSubmission(
  submissionId: string,
  adminUserId: string,
  input: ApproveSubmissionInput
): Promise<{ success: boolean; points: number; message: string }> {
  const supabase = createClient();

  // 1. Try atomic PostgreSQL RPC function
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "approve_submission_and_issue_points",
      {
        p_submission_id: submissionId,
        p_verified_views: input.verifiedViews,
        p_admin_notes: input.adminNotes || null,
      }
    );

    if (!rpcError && rpcData) {
      const parsed = typeof rpcData === "string" ? JSON.parse(rpcData) : rpcData;
      if (parsed.status === "already_approved" || parsed.status === "already_processed") {
        return {
          success: true,
          points: parsed.approved_points || 0,
          message: parsed.message || "Pengajuan sudah disetujui sebelumnya.",
        };
      }
      return {
        success: true,
        points: parsed.approved_points || 0,
        message: "Pengajuan berhasil disetujui dan poin telah diterbitkan ke dompet creator.",
      };
    }
  } catch (err) {
    console.warn("RPC approve_submission_and_issue_points fallback to client flow:", err);
  }

  // 2. Authoritative client-side execution fallback
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    throw new Error("Pengajuan tidak ditemukan.");
  }

  if (sub.status === "approved") {
    return {
      success: true,
      points: sub.approved_points || 0,
      message: "Pengajuan ini sudah pernah disetujui sebelumnya.",
    };
  }

  if (input.verifiedViews < 0) {
    throw new Error("Jumlah views terverifikasi tidak boleh negatif.");
  }

  if (input.verifiedViews > sub.claimed_views) {
    throw new Error("Verified views tidak boleh melebihi claimed views saat submission.");
  }

  const pointsToIssue = Math.floor(input.verifiedViews / 100);
  const idempotencyKey = `submission_approval_${submissionId}`;

  // Check if points already issued
  const { data: existingTx } = await supabase
    .from("point_transactions")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  let lotId: string | undefined;

  if (!existingTx && pointsToIssue > 0) {
    // 6 calendar months expiration date
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    const { data: lot, error: lotErr } = await supabase
      .from("point_lots")
      .insert({
        user_id: sub.user_id,
        source_type: "views",
        source_id: submissionId,
        original_points: pointsToIssue,
        remaining_points: pointsToIssue,
        issued_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select("id")
      .single();

    if (lotErr) {
      throw new Error(`Gagal menerbitkan lot poin: ${lotErr.message}`);
    }

    lotId = lot.id;

    // Record immutable point transaction
    const { error: txErr } = await supabase.from("point_transactions").insert({
      user_id: sub.user_id,
      transaction_type: "earned",
      amount: pointsToIssue,
      related_point_lot_id: lotId,
      reference_id: submissionId,
      idempotency_key: idempotencyKey,
      description: `Poin Konten Disetujui: ${sub.platform} (${input.verifiedViews.toLocaleString("id-ID")} Views)`,
    });

    if (txErr) {
      throw new Error(`Gagal mencatat transaksi poin: ${txErr.message}`);
    }
  }

  // Update submission status
  const { error: updateErr } = await supabase
    .from("submissions")
    .update({
      status: "approved",
      verified_views: input.verifiedViews,
      approved_points: pointsToIssue,
      admin_notes: input.adminNotes || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateErr) {
    throw new Error(`Gagal memperbarui status submission: ${updateErr.message}`);
  }

  // Update evidence retention schedule (14 days)
  const scheduledDeletionAt = new Date();
  scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 14);

  await supabase
    .from("submission_evidence")
    .update({
      retention_status: "scheduled_for_deletion",
      scheduled_deletion_at: scheduledDeletionAt.toISOString(),
    })
    .eq("submission_id", submissionId)
    .neq("retention_status", "disputed");

  // Record audit log
  try {
    await supabase.from("submission_audit_logs").insert({
      submission_id: submissionId,
      admin_id: adminUserId,
      previous_status: sub.status,
      new_status: "approved",
      verified_views: input.verifiedViews,
      approved_points: pointsToIssue,
      decision_reason: "Disetujui oleh admin",
      admin_notes: input.adminNotes || null,
    });
  } catch (auditErr) {
    console.warn("Audit log insert skipped (pending migration):", auditErr);
  }

  return {
    success: true,
    points: pointsToIssue,
    message: "Pengajuan berhasil disetujui dan poin telah diterbitkan ke dompet creator.",
  };
}

/**
 * Reject submission with professional reason
 */
export async function rejectSubmission(
  submissionId: string,
  adminUserId: string,
  input: RejectSubmissionInput
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  if (!input.rejectionReason?.trim()) {
    throw new Error("Alasan penolakan wajib diisi.");
  }

  // 1. Try atomic PostgreSQL RPC function
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("reject_submission", {
      p_submission_id: submissionId,
      p_rejection_reason: input.rejectionReason,
      p_admin_notes: input.adminNotes || null,
    });

    if (!rpcError && rpcData) {
      return {
        success: true,
        message: "Pengajuan berhasil ditolak dan status diperbarui.",
      };
    }
  } catch (err) {
    console.warn("RPC reject_submission fallback to client flow:", err);
  }

  // 2. Client-side fallback
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    throw new Error("Pengajuan tidak ditemukan.");
  }

  if (sub.status === "approved") {
    throw new Error("Pengajuan yang sudah disetujui tidak dapat ditolak.");
  }

  const { error: updateErr } = await supabase
    .from("submissions")
    .update({
      status: "rejected",
      admin_notes: input.rejectionReason + (input.adminNotes ? `\n\nCatatan Tambahan: ${input.adminNotes}` : ""),
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateErr) {
    throw new Error(`Gagal memperbarui status pengajuan: ${updateErr.message}`);
  }

  // Update evidence retention schedule (14 days)
  const scheduledDeletionAt = new Date();
  scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 14);

  await supabase
    .from("submission_evidence")
    .update({
      retention_status: "scheduled_for_deletion",
      scheduled_deletion_at: scheduledDeletionAt.toISOString(),
    })
    .eq("submission_id", submissionId)
    .neq("retention_status", "disputed");

  // Record audit log
  try {
    await supabase.from("submission_audit_logs").insert({
      submission_id: submissionId,
      admin_id: adminUserId,
      previous_status: sub.status,
      new_status: "rejected",
      decision_reason: input.rejectionReason,
      admin_notes: input.adminNotes || null,
    });
  } catch (auditErr) {
    console.warn("Audit log insert skipped (pending migration):", auditErr);
  }

  return {
    success: true,
    message: "Pengajuan berhasil ditolak.",
  };
}

/**
 * Request additional evidence from creator
 */
export async function requestAdditionalEvidence(
  submissionId: string,
  adminUserId: string,
  input: RequestEvidenceInput
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  if (!input.requestNotes?.trim()) {
    throw new Error("Instruksi permintaan bukti tambahan wajib diisi.");
  }

  // 1. Try atomic PostgreSQL RPC function
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("request_additional_evidence", {
      p_submission_id: submissionId,
      p_request_notes: input.requestNotes,
    });

    if (!rpcError && rpcData) {
      return {
        success: true,
        message: "Permintaan bukti tambahan telah dikirimkan ke creator.",
      };
    }
  } catch (err) {
    console.warn("RPC request_additional_evidence fallback to client flow:", err);
  }

  // 2. Client-side fallback
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub) {
    throw new Error("Pengajuan tidak ditemukan.");
  }

  if (sub.status === "approved") {
    throw new Error("Pengajuan yang sudah disetujui tidak dapat diminta bukti tambahan.");
  }

  const { error: updateErr } = await supabase
    .from("submissions")
    .update({
      status: "requires_revision",
      admin_notes: input.requestNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateErr) {
    throw new Error(`Gagal memperbarui status pengajuan: ${updateErr.message}`);
  }

  // Reset evidence retention to active (do not delete while unresolved)
  await supabase
    .from("submission_evidence")
    .update({
      retention_status: "active",
      scheduled_deletion_at: null,
    })
    .eq("submission_id", submissionId)
    .eq("retention_status", "scheduled_for_deletion");

  // Record audit log
  try {
    await supabase.from("submission_audit_logs").insert({
      submission_id: submissionId,
      admin_id: adminUserId,
      previous_status: sub.status,
      new_status: "requires_revision",
      decision_reason: input.requestNotes,
      admin_notes: input.requestNotes,
    });
  } catch (auditErr) {
    console.warn("Audit log insert skipped (pending migration):", auditErr);
  }

  return {
    success: true,
    message: "Permintaan bukti tambahan telah dikirimkan ke creator.",
  };
}

/**
 * Creator uploads additional evidence when status is requires_revision
 * Locked fields (URL, claimed views, posting date) are preserved immutably.
 */
export async function uploadAdditionalEvidence(
  submissionId: string,
  userId: string,
  file: File
): Promise<SubmissionEvidence> {
  const supabase = createClient();

  // Validate ownership and status
  const { data: sub, error: subErr } = await supabase
    .from("submissions")
    .select("id, user_id, status")
    .eq("id", submissionId)
    .single();

  if (subErr || !sub || sub.user_id !== userId) {
    throw new Error("Pengajuan tidak ditemukan atau kamu tidak memiliki izin.");
  }

  if (sub.status !== "requires_revision") {
    throw new Error("Bukti tambahan hanya dapat diunggah jika pengajuan berstatus 'Perlu Bukti Tambahan'.");
  }

  // Upload file to submission-evidence
  const meta = await uploadSubmissionEvidenceFile(userId, file);

  // Insert into submission_evidence
  const { data: ev, error: evErr } = await supabase
    .from("submission_evidence")
    .insert({
      submission_id: submissionId,
      storage_path: meta.storagePath,
      file_name: meta.fileName,
      file_size: meta.fileSize,
      mime_type: meta.mimeType,
      retention_status: "active",
    })
    .select()
    .single();

  if (evErr || !ev) {
    throw new Error(`Gagal menyimpan bukti tambahan: ${evErr?.message}`);
  }

  // Move submission status back to under_review so it returns to admin verification queue
  await supabase
    .from("submissions")
    .update({
      status: "under_review",
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  // Record in audit log
  try {
    await supabase.from("submission_audit_logs").insert({
      submission_id: submissionId,
      admin_id: userId,
      previous_status: "requires_revision",
      new_status: "under_review",
      decision_reason: "Creator mengunggah bukti analitik tambahan",
    });
  } catch (e) {
    console.warn("Audit log insert skipped:", e);
  }

  return {
    id: ev.id,
    submissionId: ev.submission_id,
    storagePath: ev.storage_path,
    fileName: ev.file_name,
    fileSize: ev.file_size,
    mimeType: ev.mime_type,
    uploadedAt: ev.uploaded_at,
    retentionStatus: ev.retention_status,
  };
}

/**
 * Automated Evidence Cleanup: removes expired files from Supabase Storage according to 14-day retention policy
 */
export async function cleanupExpiredEvidence(limit = 50): Promise<{
  processed: number;
  deleted: number;
  errors: number;
}> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();

  // Find expired evidence records
  const { data: expired, error } = await supabase
    .from("submission_evidence")
    .select("id, storage_path, submission_id, retention_status, scheduled_deletion_at")
    .eq("retention_status", "scheduled_for_deletion")
    .lte("scheduled_deletion_at", nowIso)
    .limit(limit);

  if (error || !expired || expired.length === 0) {
    return { processed: 0, deleted: 0, errors: 0 };
  }

  let deleted = 0;
  let errors = 0;

  for (const item of expired) {
    try {
      // Remove from storage
      const { error: removeErr } = await supabase.storage
        .from("submission-evidence")
        .remove([item.storage_path]);

      if (removeErr) {
        console.warn(`Failed to remove file ${item.storage_path}:`, removeErr);
        errors++;
        continue;
      }

      // Mark record as deleted
      await supabase
        .from("submission_evidence")
        .update({
          retention_status: "deleted",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      deleted++;
    } catch (err) {
      console.error(`Error deleting evidence ${item.id}:`, err);
      errors++;
    }
  }

  return {
    processed: expired.length,
    deleted,
    errors,
  };
}

