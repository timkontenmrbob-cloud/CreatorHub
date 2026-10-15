"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context";
import { SupportedPlatform, normalizeVideoUrl } from "@/lib/video-url";
import {
  saveSubmissionDraft,
  submitFinalVideo,
  checkVideoEligibility,
  fetchCreatorDrafts,
} from "@/lib/supabase/submissions";
import { calculatePointsFromViews, formatPoints, formatViews, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Film,
  Clock,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  X,
  FileText,
  Sparkles,
  Lock,
  ChevronLeft,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

function SubmitContentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const draftIdParam = searchParams.get("draft") || searchParams.get("draftId");
  const { user } = useAuth();

  // Form State (Fresh by default: platform null, empty inputs, no files, agreement unchecked)
  const [platform, setPlatform] = useState<SupportedPlatform | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [postingDate, setPostingDate] = useState("");
  const [currentViews, setCurrentViews] = useState<number | "">("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftIdParam);
  const [confirmedTerms, setConfirmedTerms] = useState(false);

  // Status, Duplicate Handling, Decision Dialog & Modals
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [duplicateError, setDuplicateError] = useState<{
    isOwnSubmission?: boolean;
    message: string;
    normalizedIdentifier?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Explicit form reset function (resets all 12 state dimensions)
  const resetForm = React.useCallback(() => {
    setPlatform(null);
    setVideoUrl("");
    setPostingDate("");
    setCurrentViews("");
    setEvidenceFile(null);
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setEvidencePreview(null);
    setActiveDraftId(null);
    setConfirmedTerms(false);
    setFeedback(null);
    setDuplicateError(null);
    setShowDecisionModal(false);
    setShowLeaveConfirm(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [evidencePreview]);

  // Detect unsaved user input
  const hasUnsavedChanges = useMemo(() => {
    return Boolean(
      platform !== null ||
        videoUrl.trim() !== "" ||
        postingDate !== "" ||
        currentViews !== "" ||
        evidenceFile !== null ||
        confirmedTerms !== false
    );
  }, [platform, videoUrl, postingDate, currentViews, evidenceFile, confirmedTerms]);

  // Maximum allowed posting date is today (WIB)
  const todayStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Listen for navigation clicks to "/creator/submit" to ensure form is completely fresh
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href === "/creator/submit" || href === "/creator/submit/") {
        resetForm();
      }
    };
    window.addEventListener("click", handleLinkClick);
    return () => window.removeEventListener("click", handleLinkClick);
  }, [resetForm]);

  // Pre-load draft if draftId is supplied in query
  useEffect(() => {
    if (!draftIdParam || !user?.uid) return;

    let active = true;
    fetchCreatorDrafts(user.uid).then((drafts) => {
      if (!active) return;
      const match = drafts.find((d) => d.id === draftIdParam);
      if (match) {
        setPlatform(match.platform);
        setVideoUrl(match.videoUrl);
        setPostingDate(match.postingDate);
        if (match.currentViews) setCurrentViews(match.currentViews);
        setActiveDraftId(match.id);
        setConfirmedTerms(false);
        setFeedback(null);
        setDuplicateError(null);
      }
    });

    return () => {
      active = false;
    };
  }, [draftIdParam, user?.uid]);

  // URL normalization and validation feedback
  const urlValidation = useMemo(() => {
    if (!videoUrl.trim()) return null;
    return normalizeVideoUrl(videoUrl);
  }, [videoUrl]);

  // Handle URL change: immediately clear duplicate error and auto-detect platform if unselected
  const handleUrlChange = (val: string) => {
    setVideoUrl(val);
    setDuplicateError(null);
    if (feedback?.type === "error") setFeedback(null);

    const norm = normalizeVideoUrl(val);
    if (norm.isValid && norm.data && !platform) {
      setPlatform(norm.data.platform);
    }
  };

  // Smart Submission Reminder Calculation
  const windowInfo = useMemo(() => {
    if (!postingDate) return null;

    const pDate = new Date(postingDate + "T00:00:00+07:00");
    if (isNaN(pDate.getTime())) return null;

    const now = new Date();
    const isFuture = pDate.getTime() > now.getTime();

    // 30 calendar days window. Day 1 is posting date.
    // Day 30 ends at postingDate + 29 days 23:59:59.999
    const deadline = new Date(pDate.getTime() + 29 * 24 * 60 * 60 * 1000);
    deadline.setHours(23, 59, 59, 999);

    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    const isExpired = diffMs <= 0;

    let message = "";
    let statusVariant: "success" | "warning" | "error" = "success";

    if (isFuture) {
      message = "Tanggal posting tidak boleh berada di masa depan.";
      statusVariant = "error";
    } else if (isExpired) {
      message = "Masa submit konten ini sudah berakhir (melebihi batas 30 hari kalender).";
      statusVariant = "error";
    } else if (daysRemaining >= 15) {
      message = "Masih banyak waktu buat kumpulin views!";
      statusVariant = "success";
    } else if (daysRemaining >= 4) {
      message = `Kontenmu masih punya ${daysRemaining} hari. Mau submit sekarang atau simpan dulu?`;
      statusVariant = "warning";
    } else {
      message = `Last Chance! Segera submit sebelum deadline (${daysRemaining} hari lagi).`;
      statusVariant = "error";
    }

    return {
      isValid: !isFuture && !isExpired,
      isFuture,
      isExpired,
      daysRemaining,
      deadlineWib: deadline,
      message,
      statusVariant,
    };
  }, [postingDate]);

  // Instant Points Estimation
  const numViews = typeof currentViews === "number" ? currentViews : 0;
  const estimatedPoints = calculatePointsFromViews(numViews);

  // File Handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFeedback({
        type: "error",
        message: "Format file tidak didukung. Harap pilih gambar JPG, PNG, atau WEBP.",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({
        type: "error",
        message: "Ukuran file terlalu besar. Maksimal 5 MB.",
      });
      return;
    }

    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
    setFeedback(null);
  };

  const handleRemoveFile = () => {
    setEvidenceFile(null);
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
      setEvidencePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Back Navigation Click Handler
  const handleBackNavigation = () => {
    if (hasUnsavedChanges) {
      setShowLeaveConfirm(true);
    } else {
      router.push("/creator/my-contents");
    }
  };

  // Action: Save Draft Directly from button
  const handleSaveDraft = async () => {
    if (!user?.uid) {
      setFeedback({ type: "error", message: "Sesi login tidak valid. Silakan login kembali." });
      return;
    }

    let targetPlatform = platform;
    if (!targetPlatform && urlValidation?.data?.platform) {
      targetPlatform = urlValidation.data.platform;
      setPlatform(targetPlatform);
    }

    if (!targetPlatform) {
      setFeedback({ type: "error", message: "Pilih platform video terlebih dahulu untuk menyimpan draft." });
      return;
    }

    if (!videoUrl.trim()) {
      setFeedback({ type: "error", message: "Masukkan tautan video terlebih dahulu untuk menyimpan draft." });
      return;
    }
    if (!postingDate) {
      setFeedback({ type: "error", message: "Pilih tanggal posting untuk menyimpan draft." });
      return;
    }

    setSavingDraft(true);
    setFeedback(null);
    setDuplicateError(null);

    try {
      await saveSubmissionDraft(user.uid, {
        id: activeDraftId || undefined,
        platform: targetPlatform,
        videoUrl,
        postingDate,
        currentViews: typeof currentViews === "number" ? currentViews : undefined,
      });

      // Clear state and redirect to Drafts tab
      resetForm();
      router.push("/creator/my-contents?tab=drafts&saved=true");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan draft.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSavingDraft(false);
    }
  };

  // Action: Trigger Submit (Validates and opens Decision Confirmation Modal)
  const handleTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.uid) {
      setFeedback({ type: "error", message: "Sesi login tidak valid. Silakan login kembali." });
      return;
    }

    if (!platform) {
      setFeedback({ type: "error", message: "Harap pilih platform video (TikTok atau Instagram Reels)." });
      return;
    }

    if (!videoUrl.trim()) {
      setFeedback({ type: "error", message: "Harap masukkan tautan video TikTok atau Instagram Reels." });
      return;
    }

    if (!urlValidation?.isValid) {
      setFeedback({
        type: "error",
        message: urlValidation?.error || "Format tautan video tidak valid.",
      });
      return;
    }

    if (!postingDate) {
      setFeedback({ type: "error", message: "Harap pilih tanggal publikasi video." });
      return;
    }

    if (!windowInfo || !windowInfo.isValid) {
      if (windowInfo?.isExpired) {
        setFeedback({
          type: "error",
          message: "Masa submit konten ini sudah berakhir (melebihi batas 30 hari kalender). Pengajuan dinonaktifkan.",
        });
        return;
      }
      setFeedback({
        type: "error",
        message: windowInfo?.message || "Masa pengajuan konten sudah tidak memenuhi syarat.",
      });
      return;
    }

    if (numViews <= 0) {
      setFeedback({ type: "error", message: "Jumlah views harus lebih besar dari 0." });
      return;
    }

    if (!evidenceFile) {
      setFeedback({
        type: "error",
        message: "Wajib mengunggah 1 screenshot analitik insight views sebelum submit.",
      });
      return;
    }

    if (!confirmedTerms) {
      setFeedback({
        type: "error",
        message: "Pernyataan keaslian data wajib disetujui sebelum mengirim pengajuan.",
      });
      return;
    }

    // Pre-check duplicate video before opening confirmation modal
    try {
      const elig = await checkVideoEligibility(videoUrl, postingDate, user.uid);
      if (!elig.eligible) {
        if (elig.reason === "duplicate") {
          setDuplicateError({
            isOwnSubmission: elig.isOwnSubmission,
            message: elig.message,
            normalizedIdentifier: elig.normalizedIdentifier,
          });
          setFeedback(null);
        } else {
          setFeedback({ type: "error", message: elig.message });
        }
        return;
      }
    } catch {
      // Proceed to modal if pre-check encounters network glitch; final submit will re-verify authoritatively
    }

    // All validation passed: open decision modal
    setDuplicateError(null);
    setFeedback(null);
    setShowDecisionModal(true);
  };

  // Action: Execute Final Submission from Modal (Primary Action)
  const handleExecuteFinalSubmission = async () => {
    if (!user?.uid || !evidenceFile || !platform) return;

    setSubmitting(true);
    setFeedback(null);
    setDuplicateError(null);

    try {
      // Authoritative server pre-check right before execution
      const elig = await checkVideoEligibility(videoUrl, postingDate, user.uid);
      if (!elig.eligible) {
        setShowDecisionModal(false);
        if (elig.reason === "duplicate") {
          setDuplicateError({
            isOwnSubmission: elig.isOwnSubmission,
            message: elig.message,
            normalizedIdentifier: elig.normalizedIdentifier,
          });
        } else {
          setFeedback({ type: "error", message: elig.message });
        }
        setSubmitting(false);
        return;
      }

      await submitFinalVideo(user.uid, {
        platform,
        videoUrl,
        postingDate,
        claimedViews: numViews,
        evidenceFile,
        draftId: activeDraftId || undefined,
        agreementAccepted: confirmedTerms,
        agreementVersion: "v1.0",
      });

      setShowDecisionModal(false);
      resetForm();
      router.push("/creator/my-contents?tab=submitted&submitted=true");
    } catch (err: unknown) {
      setShowDecisionModal(false);
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mengirim pengajuan.";
      if (msg.includes("sudah pernah diajukan") || msg.includes("sudah terdaftar")) {
        setDuplicateError({
          message: msg,
          isOwnSubmission: true,
        });
      } else {
        setFeedback({ type: "error", message: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Action: Execute Save Draft from Modal (Secondary Action)
  const handleExecuteSaveDraft = async () => {
    if (!user?.uid || !platform) return;

    setSavingDraft(true);
    setFeedback(null);

    try {
      await saveSubmissionDraft(user.uid, {
        id: activeDraftId || undefined,
        platform,
        videoUrl,
        postingDate,
        currentViews: typeof currentViews === "number" ? currentViews : undefined,
      });

      setShowDecisionModal(false);
      resetForm();
      router.push("/creator/my-contents?tab=drafts&saved=true");
    } catch (err: unknown) {
      setShowDecisionModal(false);
      const msg = err instanceof Error ? err.message : "Gagal menyimpan draft.";
      setFeedback({ type: "error", message: msg });
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back to My Contents Subtle Link */}
      <div>
        <button
          type="button"
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Konten Saya</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="pb-2 border-b border-border-subtle/60">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="brand" size="sm">
            <Film className="w-3 h-3" />
            Pengajuan Video
          </Badge>
          {activeDraftId && (
            <Badge variant="neutral" size="sm">
              Mode Edit Draft
            </Badge>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
          Submit Konten Baru
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary mt-1">
          Ajukan video TikTok atau IG Reels seputar Mr.BOB. Video hanya dapat diajukan satu kali dalam kurun 30 hari sejak publikasi.
        </p>
      </div>

      {/* Structured Duplicate Video Error Card */}
      {duplicateError && (
        <div className="p-5 rounded-2xl bg-status-error/10 border border-status-error/30 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-error shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-status-error">
                Video sudah terdaftar
              </h4>
              <p className="text-xs text-text-secondary leading-relaxed">
                {duplicateError.isOwnSubmission
                  ? "Konten ini sudah pernah kamu ajukan sebelumnya. Satu video hanya dapat diajukan satu kali ke Mr.BOB Creator Hub."
                  : "Konten dengan tautan ini sudah terdaftar di sistem. Gunakan tautan video karya aslimu yang lain."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-8">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                urlInputRef.current?.focus();
                urlInputRef.current?.select();
              }}
              className="text-xs gap-1.5"
            >
              Perbaiki Link Video
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push("/creator/my-contents?tab=submitted")}
              className="text-xs text-brand-blue hover:text-brand-blue/80"
            >
              Lihat Pengajuan
            </Button>
          </div>
        </div>
      )}

      {/* General Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === "success"
              ? "bg-status-success/15 border-status-success/30 text-status-success"
              : "bg-status-error/15 border-status-error/30 text-status-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span className="leading-relaxed">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-text-secondary hover:text-text-primary font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Submission Form */}
      <Card className="p-6 sm:p-8 bg-card-surface border-border-subtle shadow-xl space-y-6">
        <form onSubmit={handleTriggerSubmit} className="space-y-6">
          {/* Step 1: Platform Selection (Unselected by default) */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider">
              1. Pilih Platform Video
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform("tiktok")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-2.5 text-xs font-bold transition-all ${
                  platform === "tiktok"
                    ? "bg-brand-blue/15 border-brand-blue text-brand-blue shadow-md shadow-brand-blue/20"
                    : "bg-card-elevated border-border-subtle text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>TikTok Video</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform("instagram")}
                className={`p-4 rounded-2xl border flex items-center justify-center gap-2.5 text-xs font-bold transition-all ${
                  platform === "instagram"
                    ? "bg-brand-blue/15 border-brand-blue text-brand-blue shadow-md shadow-brand-blue/20"
                    : "bg-card-elevated border-border-subtle text-text-secondary hover:text-text-primary"
                }`}
              >
                <span>Instagram Reels</span>
              </button>
            </div>
            {!platform && (
              <p className="text-[11px] text-text-secondary/70">
                Pilih platform tempat video diunggah.
              </p>
            )}
          </div>

          {/* Step 2: Video URL */}
          <div className="space-y-1.5">
            <Input
              ref={urlInputRef}
              label="2. Tautan Video (URL)"
              value={videoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={
                platform === "instagram"
                  ? "https://www.instagram.com/reel/Cxxxxxxxxx/..."
                  : "https://www.tiktok.com/@username/video/1234567890..."
              }
              required
            />
            {urlValidation && (
              <p
                className={`text-[11px] ${
                  urlValidation.isValid ? "text-status-success" : "text-status-error"
                }`}
              >
                {urlValidation.isValid ? "✓ Format URL video valid" : urlValidation.error}
              </p>
            )}
          </div>

          {/* Step 3: Posting Date & Smart Submission Reminder */}
          <div className="space-y-3">
            <div>
              <Input
                label="3. Tanggal Publikasi Video (Posting Date)"
                type="date"
                max={todayStr}
                value={postingDate}
                onChange={(e) => {
                  setPostingDate(e.target.value);
                  setDuplicateError(null);
                }}
                required
              />
              <span className="text-[10px] text-text-secondary/70">
                Wajib diisi sesuai tanggal posting asli di aplikasi TikTok / Instagram (Zona Waktu WIB).
              </span>
            </div>

            {/* Smart Submission Reminder Card */}
            {windowInfo && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  windowInfo.statusVariant === "success"
                    ? "bg-status-success/10 border-status-success/30 text-status-success"
                    : windowInfo.statusVariant === "warning"
                    ? "bg-status-warning/10 border-status-warning/30 text-status-warning"
                    : "bg-status-error/10 border-status-error/30 text-status-error"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  <div>
                    <span className="font-bold block sm:inline">Smart Reminder: </span>
                    <span>{windowInfo.message}</span>
                  </div>
                </div>

                {!windowInfo.isExpired && !windowInfo.isFuture && (
                  <Badge variant={windowInfo.statusVariant} size="sm" className="shrink-0">
                    Sisa {windowInfo.daysRemaining} Hari
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Step 4: Current Views & Estimated Points */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border-subtle/50">
            <div>
              <Input
                label="4. Jumlah Tayangan Saat Ini (Views)"
                type="number"
                min="1"
                value={currentViews}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentViews(val === "" ? "" : Math.max(0, parseInt(val, 10)));
                }}
                placeholder="Contoh: 15400"
                required
              />
              <span className="text-[10px] text-text-secondary/70">
                Formula resmi: 1.000 Views = 10 Poin.
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand-blue" />
                  Estimasi Poin
                </span>
                <Badge variant="brand" size="sm">
                  Provisional
                </Badge>
              </div>

              <div className="my-1">
                <span className="text-2xl font-extrabold text-brand-blue font-mono">
                  {formatPoints(estimatedPoints)}
                </span>
                <span className="text-xs text-text-secondary font-bold ml-1.5">Poin</span>
              </div>

              <p className="text-[10px] text-text-secondary/80 leading-tight">
                Poin resmi akan diterbitkan ke dompet setelah diverifikasi admin.
              </p>
            </div>
          </div>

          {/* Step 5: Upload Screenshot Insight */}
          <div className="space-y-3 pt-2 border-t border-border-subtle/50">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                5. Upload Bukti Screenshot Analitik Views
              </label>
              <p className="text-xs text-text-secondary">
                Sertakan 1 tangkapan layar (screenshot) insight analitik video yang menampilkan total views secara jelas.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {!evidencePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-8 rounded-2xl border-2 border-dashed border-border-subtle hover:border-brand-blue/60 bg-card-elevated/40 hover:bg-card-elevated transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
              >
                <div className="p-3 rounded-full bg-brand-blue/10 text-brand-blue group-hover:scale-110 transition-transform mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-text-primary">
                  Klik untuk pilih file screenshot
                </p>
                <p className="text-[11px] text-text-secondary mt-1">
                  Format JPG, PNG, atau WEBP (Maksimal 5 MB)
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* Thumbnail */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evidencePreview}
                    alt="Preview Bukti"
                    className="w-16 h-16 object-cover rounded-xl border border-border-subtle shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {evidenceFile?.name}
                    </p>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      {(evidenceFile ? evidenceFile.size / (1024 * 1024) : 0).toFixed(2)} MB • Bukti Siap Dikirim
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-brand-blue"
                  >
                    Ganti
                  </Button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-2 rounded-xl text-text-secondary hover:text-status-error hover:bg-card-surface transition-colors"
                    title="Hapus"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mandatory Agreement Checkbox */}
          <div className="p-4 rounded-2xl bg-card-elevated/50 border border-border-subtle space-y-3 pt-3">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="confirm-terms"
                checked={confirmedTerms}
                onChange={(e) => setConfirmedTerms(e.target.checked)}
                className="mt-0.5 rounded border-border-subtle bg-card-surface text-brand-blue focus:ring-brand-blue cursor-pointer"
              />
              <label htmlFor="confirm-terms" className="text-xs text-text-secondary cursor-pointer leading-relaxed">
                Saya menyatakan bahwa konten ini merupakan karya saya, data views yang dikirimkan akurat sesuai bukti insight, dan saya memahami bahwa video yang sudah diajukan tidak dapat disubmit ulang.
              </label>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary/70 pl-6">
              <Lock className="w-3.5 h-3.5 text-brand-blue" />
              <span>Satu video hanya dapat diajukan satu kali ke Mr.BOB Creator Hub.</span>
            </div>
          </div>

          {/* Action Buttons: Simpan Draft & Submit Sekarang */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border-subtle/60">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={handleSaveDraft}
              disabled={savingDraft || submitting}
              className="gap-2 w-full sm:w-auto text-xs"
            >
              <FileText className="w-4 h-4" />
              <span>{savingDraft ? "Menyimpan Draft..." : "Simpan Draft"}</span>
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={
                submitting ||
                savingDraft ||
                !confirmedTerms ||
                !platform ||
                !videoUrl.trim() ||
                !postingDate ||
                !evidenceFile ||
                numViews <= 0 ||
                !windowInfo?.isValid
              }
              className="gap-2 w-full sm:w-auto text-xs shadow-lg shadow-brand-blue/30"
            >
              <UploadCloud className={`w-4 h-4 ${submitting ? "animate-spin" : ""}`} />
              <span>{submitting ? "Mengunggah & Mengirim..." : "Kirim Pengajuan Video"}</span>
            </Button>
          </div>
        </form>
      </Card>

      {/* Decision Confirmation Modal (Smart Submission Reminder Decision Point) */}
      <Dialog
        isOpen={showDecisionModal}
        onClose={() => {
          if (!submitting && !savingDraft) setShowDecisionModal(false);
        }}
        title="Yakin mau submit sekarang?"
        className="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <div className="p-4 rounded-2xl bg-status-warning/10 border border-status-warning/30 space-y-2">
            <div className="flex items-center gap-2 text-status-warning text-xs font-bold">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                Kontenmu masih punya {windowInfo?.daysRemaining} hari untuk mengumpulkan lebih banyak views!
              </span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Kalau submit sekarang, jumlah views ({formatViews(numViews)} views ={" "}
              <span className="text-brand-blue font-bold">{formatPoints(estimatedPoints)} Poin</span>) akan{" "}
              <strong>dikunci</strong> dan tidak bisa diperbarui lagi.
            </p>
          </div>

          {windowInfo && (
            <div className="text-xs text-text-secondary bg-card-elevated p-3 rounded-xl border border-border-subtle flex items-center justify-between">
              <span>Batas Akhir Pengajuan:</span>
              <span className="font-bold text-text-primary">
                {formatDate(windowInfo.deadlineWib)} pukul 23:59 WIB
              </span>
            </div>
          )}

          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExecuteFinalSubmission}
              disabled={submitting || savingDraft}
              className="w-full text-xs shadow-lg shadow-brand-blue/30 justify-center"
            >
              {submitting ? "Mengunggah & Mengirim..." : "Submit Sekarang"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={handleExecuteSaveDraft}
              disabled={submitting || savingDraft}
              className="w-full text-xs justify-center"
            >
              {savingDraft ? "Menyimpan Draft..." : "Simpan Draft & Submit Nanti"}
            </Button>

            <button
              type="button"
              onClick={() => setShowDecisionModal(false)}
              disabled={submitting || savingDraft}
              className="text-xs text-text-secondary hover:text-text-primary text-center py-1 mt-1 cursor-pointer transition-colors"
            >
              Batal & Kembali ke Formulir
            </button>
          </div>
        </div>
      </Dialog>

      {/* Leave Page Confirmation Modal (Unsaved changes guard) */}
      <Dialog
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        title="Keluar dari pengajuan?"
        className="max-w-md"
      >
        <div className="space-y-4 pt-1">
          <p className="text-xs text-text-secondary leading-relaxed">
            Perubahan yang belum disimpan akan hilang jika kamu meninggalkan halaman ini.
          </p>
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowLeaveConfirm(false)}
              className="w-full text-xs justify-center"
            >
              Tetap di Halaman
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setShowLeaveConfirm(false);
                resetForm();
                router.push("/creator/my-contents");
              }}
              className="w-full text-xs bg-status-error hover:bg-status-error/90 text-white justify-center"
            >
              Keluar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function SubmitContentPageWrapper() {
  const searchParams = useSearchParams();
  const draftKey = searchParams.get("draft") || searchParams.get("draftId") || "new";
  return <SubmitContentForm key={draftKey} />;
}

export default function SubmitContentPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-text-secondary">
          Memuat formulir submission...
        </div>
      }
    >
      <SubmitContentPageWrapper />
    </Suspense>
  );
}
