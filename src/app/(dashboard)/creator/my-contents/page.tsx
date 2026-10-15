"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/context/auth-context";
import {
  fetchCreatorSubmissions,
  fetchCreatorDrafts,
  deleteSubmissionDraft,
  uploadAdditionalEvidence,
} from "@/lib/supabase/submissions";
import { Submission, SubmissionDraft } from "@/lib/types/submission";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import {
  Film,
  FileText,
  Clock,
  ExternalLink,
  PlusCircle,
  RefreshCw,
  Eye,
  Coins,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  ArrowRight,
  UploadCloud,
  X,
} from "lucide-react";
import { formatPoints, formatViews, formatDate, formatDateTimeWIB } from "@/lib/utils";

function MyContentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isSaved = searchParams.get("saved") === "true";
  const isSubmitted = searchParams.get("submitted") === "true";

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [drafts, setDrafts] = useState<SubmissionDraft[]>([]);

  // Single source of truth derived from URL query param
  const activeTab: "submissions" | "drafts" =
    tabParam === "drafts" ? "drafts" : "submissions";

  const [notification, setNotification] = useState<string | null>(
    isSaved ? "Draft berhasil disimpan!" : isSubmitted ? "Pengajuan video berhasil dikirim!" : null
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Upload Additional Evidence Modal State
  const [revisionSubmission, setRevisionSubmission] = useState<Submission | null>(null);
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectTab = (newTab: "submissions" | "drafts") => {
    const tabValue = newTab === "drafts" ? "drafts" : "submitted";
    router.replace(`/creator/my-contents?tab=${tabValue}`);
  };

  useEffect(() => {
    let active = true;
    const userId = user?.uid;
    if (!userId) return;

    Promise.all([
      fetchCreatorSubmissions(userId),
      fetchCreatorDrafts(userId),
    ])
      .then(([subsData, draftsData]) => {
        if (!active) return;
        setSubmissions(subsData);
        setDrafts(draftsData);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading contents:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.uid, refreshTrigger]);

  const handleDeleteDraft = async (draftId: string) => {
    if (!user?.uid) return;
    if (confirm("Apakah kamu yakin ingin menghapus draft ini?")) {
      await deleteSubmissionDraft(draftId, user.uid);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setEvidenceError("Format file tidak didukung. Harap pilih gambar JPG, PNG, atau WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError("Ukuran file terlalu besar. Maksimal 5 MB.");
      return;
    }

    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
    setEvidenceError(null);
  };

  const handleRemoveEvidenceFile = () => {
    setEvidenceFile(null);
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
      setEvidencePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadAdditionalEvidence = async () => {
    if (!revisionSubmission || !user?.uid || !evidenceFile) {
      setEvidenceError("Pilih file tangkapan layar bukti analitik terlebih dahulu.");
      return;
    }

    setUploadingEvidence(true);
    setEvidenceError(null);

    try {
      await uploadAdditionalEvidence(revisionSubmission.id, user.uid, evidenceFile);
      setRevisionSubmission(null);
      handleRemoveEvidenceFile();
      setNotification("Bukti tambahan berhasil dikirim! Status video kembali dalam antrean review.");
      setRefreshTrigger((prev) => prev + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengunggah bukti tambahan.";
      setEvidenceError(msg);
    } finally {
      setUploadingEvidence(false);
    }
  };

  const getStatusBadge = (status: Submission["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="success" size="sm" className="gap-1">
            <CheckCircle2 className="w-3 h-3" /> Disetujui
          </Badge>
        );
      case "under_review":
        return (
          <Badge variant="brand" size="sm" className="gap-1">
            <Clock className="w-3 h-3" /> Sedang Direview
          </Badge>
        );
      case "requires_revision":
        return (
          <Badge variant="neutral" size="sm" className="gap-1 text-status-warning border-status-warning/40 bg-status-warning/10">
            <AlertTriangle className="w-3 h-3" /> Perlu Bukti Tambahan
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="error" size="sm" className="gap-1">
            <XCircle className="w-3 h-3" /> Ditolak
          </Badge>
        );
      case "submitted":
      default:
        return (
          <Badge variant="warning" size="sm" className="gap-1">
            <Clock className="w-3 h-3" /> Menunggu Review
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <Film className="w-3 h-3" />
              Koleksi Konten
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Konten & Draft Saya
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Pantau status verifikasi, riwayat pengajuan video, dan draft yang belum selesai.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLoading(true);
              setRefreshTrigger((prev) => prev + 1);
            }}
            disabled={loading}
            className="text-xs text-text-secondary hover:text-text-primary gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Perbarui</span>
          </Button>

          <Link href="/creator/submit">
            <Button variant="primary" size="sm" className="text-xs gap-1.5 shadow-md shadow-brand-blue/20">
              <PlusCircle className="w-4 h-4" />
              <span>Submit Video Baru</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Notification Toast/Banner if redirected with success */}
      {notification && (
        <div className="p-4 rounded-2xl bg-status-success/15 border border-status-success/30 text-status-success text-xs flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{notification}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-text-secondary hover:text-text-primary font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-subtle/80 pb-3">
        <button
          onClick={() => handleSelectTab("submissions")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "submissions"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Video Diajukan ({submissions.length})</span>
        </button>

        <button
          onClick={() => handleSelectTab("drafts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "drafts"
              ? "bg-brand-blue text-white shadow-md shadow-brand-blue/30"
              : "text-text-secondary hover:text-text-primary hover:bg-card-surface"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Draft Tersimpan ({drafts.length})</span>
        </button>
      </div>

      {/* Tab 1: Video Diajukan (Submissions) */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {submissions.length === 0 && !loading ? (
            <EmptyState
              icon={Film}
              title="Belum ada video yang diajukan"
              description="Kamu belum mengajukan video TikTok atau IG Reels. Mulai buat konten bertema Mr.BOB dan kumpulkan poin pertamamu!"
              actionLabel="Submit Video Sekarang"
              onAction={() => router.push("/creator/submit")}
            />
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card
                  key={sub.id}
                  className="p-5 sm:p-6 bg-card-surface border-border-subtle rounded-2xl hover:border-border-subtle/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={sub.platform === "tiktok" ? "brand" : "warning"}
                        size="sm"
                        className="capitalize font-semibold"
                      >
                        {sub.platform === "tiktok" ? "TikTok" : "Instagram Reels"}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        Diajukan pada {formatDateTimeWIB(sub.submittedAt)}
                      </span>
                    </div>

                    <div>{getStatusBadge(sub.status)}</div>
                  </div>

                  {/* Video URL & Details */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card-elevated border border-border-subtle">
                    <div className="min-w-0 space-y-1">
                      <a
                        href={sub.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs sm:text-sm font-bold text-text-primary hover:text-brand-blue flex items-center gap-1.5 truncate group"
                      >
                        <span className="truncate">{sub.videoUrl}</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                      </a>
                      <p className="text-[11px] text-text-secondary">
                        Tanggal Posting: {formatDate(sub.postingDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-border-subtle pt-2 sm:pt-0 sm:pl-6">
                      <div>
                        <span className="text-[10px] text-text-secondary block">
                          Views Diajukan
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-text-primary font-mono flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-text-secondary" />
                          {formatViews(sub.claimedViews)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-text-secondary block">
                          {sub.status === "approved" ? "Poin Diterbitkan" : "Estimasi Poin"}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-brand-blue font-mono flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          {sub.status === "approved" && typeof sub.approvedPoints === "number"
                            ? formatPoints(sub.approvedPoints)
                            : formatPoints(sub.estimatedPoints ?? 0)}{" "}
                          Poin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Approved Banner */}
                  {sub.status === "approved" && (
                    <div className="p-3.5 rounded-xl bg-status-success/10 border border-status-success/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-status-success">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>
                          Konten berhasil diverifikasi! <strong>+{formatPoints(sub.approvedPoints || 0)} Poin</strong> telah diterbitkan ke dompetmu.
                        </span>
                      </div>
                      <Link href="/creator/my-points">
                        <span className="font-bold underline hover:text-status-success/80 text-[11px] shrink-0">
                          Lihat Dompet Poin →
                        </span>
                      </Link>
                    </div>
                  )}

                  {/* Rejected Alert */}
                  {sub.status === "rejected" && (
                    <div className="p-3.5 rounded-xl bg-status-error/10 border border-status-error/30 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-status-error font-bold">
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>Pengajuan Ditolak</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed pl-5">
                        {sub.adminNotes || "Pengajuan video belum memenuhi syarat kelayakan Mr.BOB Creator Hub."}
                      </p>
                    </div>
                  )}

                  {/* Requires Revision Banner with CTA */}
                  {sub.status === "requires_revision" && (
                    <div className="p-4 rounded-xl bg-status-warning/10 border border-status-warning/30 text-xs space-y-3">
                      <div className="flex items-center gap-2 text-status-warning font-bold">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>Perlu Bukti Tambahan dari Admin</span>
                      </div>
                      <p className="text-text-secondary leading-relaxed pl-6">
                        {sub.adminNotes || "Mohon lengkapi bukti insight views video kamu."}
                      </p>
                      <div className="pl-6 pt-1">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setRevisionSubmission(sub);
                            handleRemoveEvidenceFile();
                          }}
                          className="text-xs gap-1.5 shadow-md shadow-brand-blue/20"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Upload Bukti Tambahan</span>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Admin notes if status is under_review or submitted */}
                  {(sub.status === "submitted" || sub.status === "under_review") && sub.adminNotes && (
                    <div className="p-3 rounded-xl bg-card-surface border border-border-subtle/80 text-xs space-y-0.5">
                      <span className="font-bold text-text-primary text-[11px]">
                        Catatan Admin:
                      </span>
                      <p className="text-text-secondary">{sub.adminNotes}</p>
                    </div>
                  )}

                  {/* Submission lock notice */}
                  <div className="text-[10px] text-text-secondary/70 flex items-center gap-1.5 pt-1">
                    <span>ID Pengajuan: {sub.id.slice(0, 13)}... • Snapshot data terkunci secara permanen.</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Draft Tersimpan (Drafts) */}
      {activeTab === "drafts" && (
        <div className="space-y-4">
          {drafts.length === 0 && !loading ? (
            <EmptyState
              icon={FileText}
              title="Tidak ada draft tersimpan"
              description="Kamu belum menyimpan draft pengajuan. Gunakan tombol 'Simpan Draft' di formulir submit jika ingin melanjutkan pengajuan nanti."
              actionLabel="Buat Draft Baru"
              onAction={() => router.push("/creator/submit")}
            />
          ) : (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <Card
                  key={draft.id}
                  className="p-5 sm:p-6 bg-card-surface border-border-subtle rounded-2xl hover:border-border-subtle/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Badge
                        variant={draft.platform === "tiktok" ? "brand" : "warning"}
                        size="sm"
                        className="capitalize font-semibold"
                      >
                        {draft.platform === "tiktok" ? "TikTok" : "Instagram Reels"}
                      </Badge>
                      <span className="text-xs text-text-secondary">
                        Terakhir diubah: {formatDateTimeWIB(draft.updatedAt)}
                      </span>
                    </div>

                    <Badge variant="neutral" size="sm">
                      Draft Belum Disubmit
                    </Badge>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card-elevated border border-border-subtle">
                    <div className="min-w-0 space-y-1">
                      <p className="text-xs sm:text-sm font-bold text-text-primary truncate">
                        {draft.videoUrl || "Tautan belum dimasukkan"}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        Tanggal Posting: {formatDate(draft.postingDate)}
                      </p>
                    </div>

                    <div className="flex items-center gap-6 shrink-0 border-t sm:border-t-0 sm:border-l border-border-subtle pt-2 sm:pt-0 sm:pl-6">
                      <div>
                        <span className="text-[10px] text-text-secondary block">
                          Views Tersimpan
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-text-primary font-mono">
                          {draft.currentViews ? formatViews(draft.currentViews) : "-"}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] text-text-secondary block">
                          Estimasi Poin
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-brand-blue font-mono">
                          {draft.estimatedPoints ? `${formatPoints(draft.estimatedPoints)} Poin` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span className="text-[11px] text-status-warning flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Draft tidak memperpanjang batas 30 hari. Segera lengkapi sebelum batas waktu berakhir.</span>
                    </span>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="p-2 text-text-secondary hover:text-status-error hover:bg-card-elevated rounded-xl transition-colors cursor-pointer"
                        title="Hapus Draft"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link href={`/creator/submit?draft=${draft.id}`}>
                        <Button variant="primary" size="sm" className="text-xs gap-1.5">
                          <span>Lanjutkan Pengajuan</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* UPLOAD ADDITIONAL EVIDENCE MODAL                                          */}
      {/* ========================================================================= */}
      {revisionSubmission && (
        <Dialog
          isOpen={Boolean(revisionSubmission)}
          onClose={() => !uploadingEvidence && setRevisionSubmission(null)}
          title="Upload Bukti Tambahan"
          className="max-w-md"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-status-warning/10 border border-status-warning/30 text-xs space-y-1 text-status-warning">
              <span className="font-bold block">Permintaan dari Admin:</span>
              <p className="text-text-secondary leading-relaxed">
                {revisionSubmission.adminNotes}
              </p>
            </div>

            {/* Locked Info Reminder */}
            <div className="text-[11px] text-text-secondary/70 bg-card-elevated p-2.5 rounded-xl border border-border-subtle">
              Tautan video, views yang diajukan, dan tanggal posting tetap terkunci sesuai data asli.
            </div>

            {evidenceError && (
              <p className="text-xs text-status-error">{evidenceError}</p>
            )}

            {/* File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleEvidenceFileChange}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {!evidencePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 rounded-2xl border-2 border-dashed border-border-subtle hover:border-brand-blue/60 bg-card-elevated/40 hover:bg-card-elevated transition-all cursor-pointer flex flex-col items-center justify-center text-center group"
              >
                <UploadCloud className="w-6 h-6 text-brand-blue mb-2" />
                <p className="text-xs font-bold text-text-primary">
                  Pilih screenshot analitik baru
                </p>
                <p className="text-[11px] text-text-secondary mt-0.5">
                  Format JPG, PNG, atau WEBP (Maksimal 5 MB)
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evidencePreview}
                    alt="Preview Bukti Baru"
                    className="w-12 h-12 object-cover rounded-lg border border-border-subtle shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {evidenceFile?.name}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {(evidenceFile ? evidenceFile.size / (1024 * 1024) : 0).toFixed(2)} MB • Siap Dikirim
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveEvidenceFile}
                  className="p-1.5 rounded-lg text-text-secondary hover:text-status-error cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setRevisionSubmission(null)}
                disabled={uploadingEvidence}
                className="w-full text-xs justify-center"
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleUploadAdditionalEvidence}
                disabled={uploadingEvidence || !evidenceFile}
                className="w-full text-xs justify-center shadow-lg shadow-brand-blue/30"
              >
                {uploadingEvidence ? "Mengunggah..." : "Kirim Bukti Tambahan"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default function MyContentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-text-secondary">
          Memuat riwayat konten...
        </div>
      }
    >
      <MyContentsContent />
    </Suspense>
  );
}
