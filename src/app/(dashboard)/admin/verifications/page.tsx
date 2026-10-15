"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/context/auth-context";
import {
  fetchAdminSubmissions,
  fetchSubmissionDetail,
  approveSubmission,
  rejectSubmission,
  requestAdditionalEvidence,
} from "@/lib/supabase/submissions";
import { AdminSubmissionItem, SubmissionStatus } from "@/lib/types/submission";
import { formatPoints, formatViews, formatDate } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { ThumbnailModal } from "@/components/admin/thumbnail-modal";
import {
  CheckSquare,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  Sparkles,
  ShieldCheck,
  FileText,
  RefreshCw,
  Maximize2,
  Calendar,
  AlertTriangle,
  Image as ImageIcon,
} from "lucide-react";

type FilterStatus = "all" | SubmissionStatus;

export default function AdminVerificationsPage() {
  const { user } = useAuth();

  // State
  const [submissions, setSubmissions] = useState<AdminSubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review Drawer / Modal State
  const [selectedSubmission, setSelectedSubmission] = useState<AdminSubmissionItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Verification Form Inputs inside Review Modal
  const [verifiedViewsInput, setVerifiedViewsInput] = useState<number | "">("");
  const [adminNotesInput, setAdminNotesInput] = useState("");
  const [validDateChecked, setValidDateChecked] = useState(true);
  const [validInsightChecked, setValidInsightChecked] = useState(true);
  const [organicViewsChecked, setOrganicViewsChecked] = useState(true);

  // Decision Dialogs
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showRequestEvidenceModal, setShowRequestEvidenceModal] = useState(false);
  const [showThumbnailModal, setShowThumbnailModal] = useState(false);

  // Decision Form Fields
  const [rejectionReason, setRejectionReason] = useState("");
  const [evidenceRequestNotes, setEvidenceRequestNotes] = useState("");
  const [processingDecision, setProcessingDecision] = useState(false);

  // Global Notification / Feedback Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Refresh Trigger & Load Submissions Queue
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshQueue = useCallback(() => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let active = true;
    fetchAdminSubmissions({
      status: selectedStatus,
      search: searchQuery,
    })
      .then((data) => {
        if (!active) return;
        setSubmissions(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error loading admin submissions:", err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedStatus, searchQuery, refreshTrigger]);

  // Open Review Detail
  const handleOpenReview = async (sub: AdminSubmissionItem) => {
    setLoadingDetail(true);
    try {
      const detail = await fetchSubmissionDetail(sub.id);
      if (detail) {
        setSelectedSubmission(detail);
        setVerifiedViewsInput(detail.verifiedViews ?? detail.claimedViews);
        setAdminNotesInput(detail.adminNotes || "");
        setValidDateChecked(true);
        setValidInsightChecked(true);
        setOrganicViewsChecked(true);
      }
    } catch (err) {
      console.error("Error fetching submission detail:", err);
      setToast({ type: "error", message: "Gagal memuat detail pengajuan." });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Close Review Drawer
  const handleCloseReview = () => {
    setSelectedSubmission(null);
    setPreviewImageUrl(null);
    setShowApproveModal(false);
    setShowRejectModal(false);
    setShowRequestEvidenceModal(false);
    setRejectionReason("");
    setEvidenceRequestNotes("");
  };

  // Calculated Points in review
  const verifiedViewsNum = typeof verifiedViewsInput === "number" ? verifiedViewsInput : 0;
  const calculatedPoints = Math.floor(verifiedViewsNum / 100);

  // Check 30-Day Calendar Window for Selected Submission
  const windowEligibility = useMemo(() => {
    if (!selectedSubmission) return null;
    const pDate = new Date(selectedSubmission.postingDate + "T00:00:00+07:00");
    const subDate = new Date(selectedSubmission.submittedAt);
    const deadline = new Date(pDate.getTime() + 29 * 24 * 60 * 60 * 1000);
    deadline.setHours(23, 59, 59, 999);

    const isWithin30Days = subDate.getTime() <= deadline.getTime();
    const diffDays = Math.ceil((subDate.getTime() - pDate.getTime()) / (24 * 60 * 60 * 1000));

    return {
      isValid: isWithin30Days,
      diffDays,
      deadlineWib: deadline,
    };
  }, [selectedSubmission]);

  // Execute Approval
  const handleExecuteApproval = async () => {
    if (!selectedSubmission || !user?.uid) return;

    if (verifiedViewsNum <= 0) {
      setToast({ type: "error", message: "Jumlah views terverifikasi harus lebih besar dari 0." });
      return;
    }

    if (verifiedViewsNum > selectedSubmission.claimedViews) {
      setToast({
        type: "error",
        message: "Verified views tidak boleh lebih besar dari claimed views saat pengajuan.",
      });
      return;
    }

    setProcessingDecision(true);
    try {
      const res = await approveSubmission(selectedSubmission.id, user.uid, {
        verifiedViews: verifiedViewsNum,
        adminNotes: adminNotesInput.trim() || undefined,
      });

      setShowApproveModal(false);
      handleCloseReview();
      setToast({
        type: "success",
        message: `Pengajuan berhasil disetujui! ${res.points} Poin resmi telah diterbitkan ke dompet creator.`,
      });
      refreshQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyetujui pengajuan.";
      setToast({ type: "error", message: msg });
    } finally {
      setProcessingDecision(false);
    }
  };

  // Execute Rejection
  const handleExecuteRejection = async () => {
    if (!selectedSubmission || !user?.uid) return;

    if (!rejectionReason.trim()) {
      setToast({ type: "error", message: "Alasan penolakan wajib diisi secara jelas." });
      return;
    }

    setProcessingDecision(true);
    try {
      await rejectSubmission(selectedSubmission.id, user.uid, {
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotesInput.trim() || undefined,
      });

      setShowRejectModal(false);
      handleCloseReview();
      setToast({
        type: "success",
        message: "Pengajuan berhasil ditolak dan alasan telah disampaikan ke creator.",
      });
      refreshQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menolak pengajuan.";
      setToast({ type: "error", message: msg });
    } finally {
      setProcessingDecision(false);
    }
  };

  // Execute Request Evidence
  const handleExecuteRequestEvidence = async () => {
    if (!selectedSubmission || !user?.uid) return;

    if (!evidenceRequestNotes.trim()) {
      setToast({ type: "error", message: "Instruksi bukti tambahan wajib diisi." });
      return;
    }

    setProcessingDecision(true);
    try {
      await requestAdditionalEvidence(selectedSubmission.id, user.uid, {
        requestNotes: evidenceRequestNotes.trim(),
      });

      setShowRequestEvidenceModal(false);
      handleCloseReview();
      setToast({
        type: "success",
        message: "Permintaan bukti tambahan telah dikirimkan ke creator.",
      });
      refreshQueue();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengirim permintaan bukti.";
      setToast({ type: "error", message: msg });
    } finally {
      setProcessingDecision(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case "submitted":
        return <Badge variant="warning">Menunggu</Badge>;
      case "under_review":
        return <Badge variant="brand">Sedang Direview</Badge>;
      case "requires_revision":
        return <Badge variant="neutral">Perlu Bukti Tambahan</Badge>;
      case "approved":
        return <Badge variant="success">Disetujui</Badge>;
      case "rejected":
        return <Badge variant="error">Ditolak</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  // Counters for tabs
  const countByStatus = useMemo(() => {
    const counts = {
      all: submissions.length,
      submitted: 0,
      under_review: 0,
      requires_revision: 0,
      approved: 0,
      rejected: 0,
    };
    submissions.forEach((s) => {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [submissions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            toast.type === "success"
              ? "bg-status-success/15 border-status-success/30 text-status-success"
              : "bg-status-error/15 border-status-error/30 text-status-error"
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast(null)}
            className="text-text-secondary hover:text-text-primary font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="brand" size="sm">
              <CheckSquare className="w-3 h-3" />
              Admin Portal
            </Badge>
            <Badge variant="neutral" size="sm">
              Phase 4 Active
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Verifikasi Konten Creator
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            Review bukti insight views, validasi tanggal publikasi video, dan terbitkan Poin resmi ke dompet creator.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={refreshQueue}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan Antrean</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: "all", label: "Semua", count: countByStatus.all },
            { id: "submitted", label: "Menunggu", count: countByStatus.submitted },
            { id: "under_review", label: "Sedang Direview", count: countByStatus.under_review },
            { id: "requires_revision", label: "Perlu Bukti", count: countByStatus.requires_revision },
            { id: "approved", label: "Disetujui", count: countByStatus.approved },
            { id: "rejected", label: "Ditolak", count: countByStatus.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id as FilterStatus)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20"
                  : "bg-card-surface border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-blue/30"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedStatus === tab.id
                      ? "bg-white/20 text-white"
                      : "bg-card-elevated text-text-secondary"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72 relative">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari creator atau link video..."
            leftIcon={<Search className="w-4 h-4 text-text-secondary" />}
            className="text-xs py-2 bg-card-surface"
          />
        </div>
      </div>

      {/* Verification Queue Table / Cards */}
      <Card className="bg-card-surface border-border-subtle overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-brand-blue" />
            <span>Memuat antrean verifikasi...</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary space-y-2">
            <FileText className="w-8 h-8 mx-auto text-text-secondary/50" />
            <p className="font-semibold text-text-primary text-sm">Tidak ada konten di antrean</p>
            <p>
              {searchQuery
                ? `Tidak ditemukan hasil untuk "${searchQuery}".`
                : "Semua pengajuan konten pada filter ini telah diproses."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-card-elevated/60 text-text-secondary uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-3.5 font-bold">Creator</th>
                  <th className="px-4 py-3.5 font-bold">Platform & Konten</th>
                  <th className="px-4 py-3.5 font-bold">Views Diklaim</th>
                  <th className="px-4 py-3.5 font-bold">Estimasi / Poin</th>
                  <th className="px-4 py-3.5 font-bold">Tgl Submit</th>
                  <th className="px-4 py-3.5 font-bold">Status</th>
                  <th className="px-5 py-3.5 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    className="hover:bg-card-elevated/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenReview(sub)}
                  >
                    {/* Creator Identity */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={sub.creatorName}
                          src={sub.creatorAvatar || undefined}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-text-primary truncate">{sub.creatorName}</p>
                          <p className="text-[11px] text-text-secondary/70 truncate">{sub.creatorEmail}</p>
                        </div>
                      </div>
                    </td>

                    {/* Platform & URL */}
                    <td className="px-4 py-4 max-w-xs">
                      <div className="space-y-1">
                        <Badge
                          variant={sub.platform === "tiktok" ? "brand" : "neutral"}
                          size="sm"
                          className="capitalize"
                        >
                          {sub.platform}
                        </Badge>
                        <a
                          href={sub.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-brand-blue hover:underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{sub.videoUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </td>

                    {/* Claimed Views */}
                    <td className="px-4 py-4 font-mono font-bold text-text-primary">
                      {formatViews(sub.claimedViews)}
                    </td>

                    {/* Points */}
                    <td className="px-4 py-4">
                      {sub.status === "approved" ? (
                        <div className="flex items-center gap-1 text-status-success font-bold font-mono">
                          <Sparkles className="w-3.5 h-3.5 text-status-success" />
                          <span>+{formatPoints(sub.approvedPoints || 0)} Poin</span>
                        </div>
                      ) : (
                        <span className="font-mono text-brand-blue font-semibold">
                          ~{formatPoints(sub.estimatedPoints)} Poin
                        </span>
                      )}
                    </td>

                    {/* Submitted At */}
                    <td className="px-4 py-4 text-[11px]">
                      {formatDate(sub.submittedAt)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      {renderStatusBadge(sub.status)}
                    </td>

                    {/* Action */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenReview(sub);
                        }}
                        className="text-xs gap-1.5 shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5 text-brand-blue" />
                        <span>Review</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* VERIFICATION DETAIL DRAWER / INSPECTION MODAL                             */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <Dialog
          isOpen={Boolean(selectedSubmission)}
          onClose={handleCloseReview}
          title="Review Verifikasi Konten Video"
          className="max-w-4xl max-h-[92vh] overflow-y-auto"
        >
          {loadingDetail ? (
            <div className="p-12 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-brand-blue" />
              <span>Memuat data lengkap video & bukti analitik...</span>
            </div>
          ) : (
            <div className="space-y-6 pt-2">
              {/* Top Banner: Status & Creator */}
              <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={selectedSubmission.creatorName}
                    src={selectedSubmission.creatorAvatar || undefined}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-text-primary text-sm">
                        {selectedSubmission.creatorName}
                      </h3>
                      {renderStatusBadge(selectedSubmission.status)}
                    </div>
                    <p className="text-xs text-text-secondary">{selectedSubmission.creatorEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={selectedSubmission.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-xl bg-brand-blue/10 border border-brand-blue/30 text-brand-blue text-xs font-semibold hover:bg-brand-blue/20 transition flex items-center gap-1.5"
                  >
                    <span>Buka Video di {selectedSubmission.platform === "tiktok" ? "TikTok" : "Instagram"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Two Column Grid: Evidence Preview vs Verification Form */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Column 1: Video Info & Screenshot Evidence (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Video Specs Card */}
                  <div className="p-4 rounded-2xl bg-card-elevated/40 border border-border-subtle space-y-2.5 text-xs">
                    <h4 className="font-bold text-text-primary flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-text-secondary">
                      <FileText className="w-3.5 h-3.5 text-brand-blue" />
                      Data Pengajuan Konten
                    </h4>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[11px] text-text-secondary block">Tanggal Posting Video:</span>
                        <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-text-secondary" />
                          {formatDate(selectedSubmission.postingDate)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-text-secondary block">Waktu Pengajuan:</span>
                        <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-text-secondary" />
                          {formatDate(selectedSubmission.submittedAt)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-text-secondary block">Jumlah Views Diklaim:</span>
                        <span className="font-bold text-text-primary font-mono text-sm mt-0.5 block">
                          {formatViews(selectedSubmission.claimedViews)} Views
                        </span>
                      </div>

                      <div>
                        <span className="text-[11px] text-text-secondary block">Estimasi Poin:</span>
                        <span className="font-bold text-brand-blue font-mono text-sm mt-0.5 block">
                          {formatPoints(selectedSubmission.estimatedPoints)} Poin
                        </span>
                      </div>
                    </div>

                    {/* 30-Day Window Verification Check */}
                    {windowEligibility && (
                      <div
                        className={`p-3 rounded-xl border text-xs flex items-center gap-2 mt-2 ${
                          windowEligibility.isValid
                            ? "bg-status-success/10 border-status-success/30 text-status-success"
                            : "bg-status-error/10 border-status-error/30 text-status-error"
                        }`}
                      >
                        {windowEligibility.isValid ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                        )}
                        <span>
                          {windowEligibility.isValid
                            ? `Memenuhi syarat: Diajukan hari ke-${windowEligibility.diffDays} (Batas 30 hari kalender).`
                            : "Gagal syarat: Diajukan melebihi batas 30 hari kalender sejak publikasi."}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Screenshot Evidence Preview */}
                  <div className="p-4 rounded-2xl bg-card-elevated/40 border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-text-primary uppercase text-[10px] tracking-wider text-text-secondary">
                        Bukti Screenshot Analitik ({selectedSubmission.evidence?.length || 0})
                      </h4>
                      <Badge variant="neutral" size="sm">
                        Private Secure Signed URL
                      </Badge>
                    </div>

                    {selectedSubmission.evidence && selectedSubmission.evidence.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSubmission.evidence.map((ev, idx) => (
                          <div
                            key={ev.id || idx}
                            className="rounded-xl border border-border-subtle overflow-hidden bg-card-surface space-y-2 p-2"
                          >
                            {ev.publicUrl ? (
                              <div className="relative group cursor-pointer overflow-hidden rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ev.publicUrl}
                                  alt="Screenshot Insight Views"
                                  className="w-full max-h-72 object-contain bg-black/60 rounded-lg group-hover:scale-[1.02] transition-transform"
                                  onClick={() => setPreviewImageUrl(ev.publicUrl || null)}
                                />
                                <div
                                  onClick={() => setPreviewImageUrl(ev.publicUrl || null)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-semibold"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span>Perbesar Bukti</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-6 text-center text-xs text-text-secondary bg-card-elevated rounded-lg">
                                Bukti telah dihapus sesuai jadwal retensi (14 hari setelah verifikasi).
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[11px] text-text-secondary px-1">
                              <span>{ev.fileName} ({(ev.fileSize / (1024 * 1024)).toFixed(2)} MB)</span>
                              <Badge
                                variant={ev.retentionStatus === "active" ? "brand" : "neutral"}
                                size="sm"
                              >
                                {ev.retentionStatus === "scheduled_for_deletion"
                                  ? "Jadwal Hapus (14 Hari)"
                                  : ev.retentionStatus === "deleted"
                                  ? "Terhapus"
                                  : "Retensi Aktif"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary">Tidak ada file screenshot bukti terlampir.</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Admin Verification Controls (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl bg-card-surface border border-border-subtle space-y-4">
                    <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-blue" />
                      Evaluasi & Verifikasi Admin
                    </h4>

                    {/* Step 1: Verified Views Input */}
                    <div className="space-y-1.5">
                      <Input
                        label="Views Terverifikasi (Final)"
                        type="number"
                        min="1"
                        max={selectedSubmission.claimedViews}
                        value={verifiedViewsInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setVerifiedViewsInput(val === "" ? "" : Math.max(0, parseInt(val, 10)));
                        }}
                        disabled={selectedSubmission.status === "approved"}
                        helperText={`Maksimal sesuai klaim: ${formatViews(selectedSubmission.claimedViews)} views`}
                      />
                    </div>

                    {/* Step 2: Points Preview */}
                    <div className="p-4 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-text-secondary block font-semibold">Poin yang Diterbitkan:</span>
                        <span className="text-xs text-text-secondary/70">Formula: floor(views / 100)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-brand-blue font-mono">
                          {formatPoints(calculatedPoints)}
                        </span>
                        <span className="text-xs text-text-secondary ml-1 font-bold">Poin</span>
                      </div>
                    </div>

                    {/* Step 3: Verification Checklist */}
                    <div className="space-y-2 pt-2 border-t border-border-subtle text-xs">
                      <span className="font-semibold text-text-secondary uppercase text-[10px] tracking-wider block mb-1">
                        Daftar Pemeriksaan Integritas
                      </span>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={validDateChecked}
                          onChange={(e) => setValidDateChecked(e.target.checked)}
                          className="mt-0.5 rounded border-border-subtle bg-card-surface text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="text-text-secondary leading-snug">
                          Tanggal posting asli sesuai & ≤ 30 hari kalender.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={validInsightChecked}
                          onChange={(e) => setValidInsightChecked(e.target.checked)}
                          className="mt-0.5 rounded border-border-subtle bg-card-surface text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="text-text-secondary leading-snug">
                          Screenshot bukti insight asli & sesuai dengan video.
                        </span>
                      </label>

                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={organicViewsChecked}
                          onChange={(e) => setOrganicViewsChecked(e.target.checked)}
                          className="mt-0.5 rounded border-border-subtle bg-card-surface text-brand-blue focus:ring-brand-blue"
                        />
                        <span className="text-text-secondary leading-snug">
                          Views organik (tidak ada indikasi bot / paid booster).
                        </span>
                      </label>
                    </div>

                    {/* Step 4: Admin Notes */}
                    <div className="space-y-1.5 pt-2 border-t border-border-subtle">
                      <label className="block text-xs font-semibold text-text-secondary uppercase text-[10px] tracking-wider">
                        Catatan Internal / Catatan Verifikasi
                      </label>
                      <textarea
                        rows={2}
                        value={adminNotesInput}
                        onChange={(e) => setAdminNotesInput(e.target.value)}
                        placeholder="Catatan tambahan untuk creator atau arsip audit..."
                        className="w-full rounded-xl bg-card-elevated border border-border-subtle p-3 text-xs text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-brand-blue resize-none"
                      />
                    </div>

                    {/* Step 5: Action Buttons */}
                    {selectedSubmission.status !== "approved" ? (
                      <div className="space-y-2 pt-2">
                        <Button
                          type="button"
                          variant="primary"
                          size="md"
                          onClick={() => setShowApproveModal(true)}
                          disabled={
                            processingDecision ||
                            !validDateChecked ||
                            !validInsightChecked ||
                            !organicViewsChecked ||
                            verifiedViewsNum <= 0
                          }
                          className="w-full text-xs justify-center gap-1.5 shadow-md shadow-brand-blue/20"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Setujui & Terbitkan Poin</span>
                        </Button>

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowRequestEvidenceModal(true)}
                            disabled={processingDecision}
                            className="text-xs justify-center"
                          >
                            Minta Bukti
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowRejectModal(true)}
                            disabled={processingDecision}
                            className="text-xs justify-center text-status-error hover:bg-status-error/10 hover:border-status-error/40"
                          >
                            Tolak
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-status-success/15 border border-status-success/30 text-status-success text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Pengajuan ini telah disetujui ({formatPoints(selectedSubmission.approvedPoints || 0)} Poin diterbitkan).</span>
                        </div>

                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowThumbnailModal(true)}
                            className="w-full text-xs justify-center gap-1.5 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            Atur Thumbnail Video (Cover Galeri)
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Audit Trail Timeline */}
              {selectedSubmission.auditLogs && selectedSubmission.auditLogs.length > 0 && (
                <div className="p-4 rounded-2xl bg-card-elevated/30 border border-border-subtle space-y-3">
                  <h4 className="font-bold text-text-primary text-xs uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-brand-blue" />
                    Riwayat Audit Keputusan Admin ({selectedSubmission.auditLogs.length})
                  </h4>

                  <div className="space-y-2 divide-y divide-border-subtle/40">
                    {selectedSubmission.auditLogs.map((log) => (
                      <div key={log.id} className="pt-2 first:pt-0 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-text-primary">
                            {log.adminName} ({log.adminEmail})
                          </span>
                          <span className="text-[11px] text-text-secondary">{formatDate(log.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral" size="sm">
                            {log.previousStatus} → {log.newStatus}
                          </Badge>
                          {log.decisionReason && (
                            <span className="text-text-secondary text-[11px]">
                              Alasan: &ldquo;{log.decisionReason}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* FULL-SIZE IMAGE LIGHTBOX PREVIEW                                          */}
      {/* ========================================================================= */}
      {previewImageUrl && (
        <Dialog
          isOpen={Boolean(previewImageUrl)}
          onClose={() => setPreviewImageUrl(null)}
          title="Bukti Screenshot Analitik (Ukuran Penuh)"
          className="max-w-5xl"
        >
          <div className="space-y-4 pt-1">
            <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-black/80 rounded-2xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="Full Preview Bukti"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="text-right">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPreviewImageUrl(null)}
                className="text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* APPROVAL CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      <Dialog
        isOpen={showApproveModal}
        onClose={() => !processingDecision && setShowApproveModal(false)}
        title="Setujui konten ini?"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-2xl bg-card-elevated border border-border-subtle space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Creator:</span>
              <span className="font-bold text-text-primary">{selectedSubmission?.creatorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Verified Views:</span>
              <span className="font-bold text-text-primary font-mono">{formatViews(verifiedViewsNum)} Views</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
              <span className="font-semibold text-text-primary">Poin yang Diterbitkan:</span>
              <span className="text-base font-extrabold text-brand-blue font-mono">
                {formatPoints(calculatedPoints)} Poin
              </span>
            </div>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Poin akan langsung diterbitkan secara atomik ke dompet creator dengan masa berlaku <strong>6 bulan kalender</strong>. Status video akan dikunci sebagai Disetujui.
          </p>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowApproveModal(false)}
              disabled={processingDecision}
              className="w-full text-xs justify-center"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExecuteApproval}
              disabled={processingDecision}
              className="w-full text-xs justify-center shadow-lg shadow-brand-blue/30"
            >
              {processingDecision ? "Memproses..." : "Setujui & Terbitkan Poin"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* REJECTION CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      <Dialog
        isOpen={showRejectModal}
        onClose={() => !processingDecision && setShowRejectModal(false)}
        title="Tolak pengajuan ini?"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            Pengajuan akan berstatus Ditolak dan tidak ada poin yang diterbitkan. Alasan penolakan akan tampil pada menu Konten Saya milik creator.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary uppercase text-[10px] tracking-wider">
              Alasan Penolakan (Wajib Diisi)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Contoh: Bukti insight analitik tidak cocok dengan link video, atau video melewati batas 30 hari kalender sejak publikasi."
              className="w-full rounded-xl bg-card-elevated border border-border-subtle p-3 text-xs text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-status-error resize-none"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowRejectModal(false)}
              disabled={processingDecision}
              className="w-full text-xs justify-center"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExecuteRejection}
              disabled={processingDecision || !rejectionReason.trim()}
              className="w-full text-xs justify-center bg-status-error hover:bg-status-error/90 text-white"
            >
              {processingDecision ? "Memproses..." : "Tolak Pengajuan"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* REQUEST ADDITIONAL EVIDENCE MODAL                                        */}
      {/* ========================================================================= */}
      <Dialog
        isOpen={showRequestEvidenceModal}
        onClose={() => !processingDecision && setShowRequestEvidenceModal(false)}
        title="Minta Bukti Tambahan"
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-text-secondary leading-relaxed">
            Kirimkan permintaan revisi ke creator. Status video akan berubah menjadi <strong>Perlu Bukti Tambahan</strong> dan creator dapat mengunggah screenshot analitik baru tanpa mengubah data video asli.
          </p>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-text-secondary uppercase text-[10px] tracking-wider">
              Instruksi Bukti yang Dibutuhkan (Wajib Diisi)
            </label>
            <textarea
              rows={3}
              value={evidenceRequestNotes}
              onChange={(e) => setEvidenceRequestNotes(e.target.value)}
              placeholder="Contoh: Mohon unggah tangkapan layar insight analitik lengkap yang menampilkan total views dan tanggal unggahan secara bersamaan."
              className="w-full rounded-xl bg-card-elevated border border-border-subtle p-3 text-xs text-text-primary placeholder:text-text-secondary/50 outline-none focus:border-brand-blue resize-none"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowRequestEvidenceModal(false)}
              disabled={processingDecision}
              className="w-full text-xs justify-center"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleExecuteRequestEvidence}
              disabled={processingDecision || !evidenceRequestNotes.trim()}
              className="w-full text-xs justify-center shadow-lg shadow-brand-blue/30"
            >
              {processingDecision ? "Mengirim..." : "Kirim Permintaan Bukti"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* THUMBNAIL MANAGEMENT MODAL                                               */}
      {/* ========================================================================= */}
      {selectedSubmission && (
        <ThumbnailModal
          isOpen={showThumbnailModal}
          onClose={() => setShowThumbnailModal(false)}
          submissionId={selectedSubmission.id}
          videoUrl={selectedSubmission.videoUrl}
          platform={selectedSubmission.platform}
          creatorName={selectedSubmission.creatorName}
          onSuccess={() => {
            setToast({
              type: "success",
              message: "Thumbnail video berhasil disimpan!",
            });
            setShowThumbnailModal(false);
          }}
        />
      )}
    </div>
  );
}
