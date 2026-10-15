"use client";

import React, { useState, useRef } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Video,
} from "lucide-react";

interface ThumbnailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  videoUrl: string;
  platform: string;
  creatorName: string;
  currentThumbnailUrl?: string | null;
  onSuccess: (newUrl: string | null) => void;
}

export function ThumbnailModal({
  isOpen,
  onClose,
  submissionId,
  videoUrl,
  platform,
  creatorName,
  currentThumbnailUrl,
  onSuccess,
}: ThumbnailModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    currentThumbnailUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Ukuran file melebihi 2 MB. Harap pilih gambar yang lebih kecil.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Format gambar harus JPG, PNG, atau WebP.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("submissionId", submissionId);
      formData.append("file", selectedFile);

      const res = await fetch("/api/admin/thumbnails", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengunggah thumbnail.");
      }

      setSuccessMsg("Thumbnail video berhasil disimpan!");
      onSuccess(json.thumbnailUrl);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Gagal mengunggah thumbnail.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    setIsUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/thumbnails?submissionId=${submissionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal menghapus thumbnail.");
      }

      setSelectedFile(null);
      setPreviewUrl(null);
      setSuccessMsg("Thumbnail berhasil dihapus. Kembali ke tampilan default.");
      onSuccess(null);
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Gagal menghapus thumbnail.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Atur Thumbnail Video" className="max-w-md">
      <div className="space-y-4">
        {/* Video Context Info */}
        <div className="p-3.5 rounded-xl bg-card-elevated border border-border-subtle text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-text-primary">{creatorName}</span>
            <span className="text-[10px] uppercase font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
              {platform}
            </span>
          </div>
          <p className="text-text-secondary truncate text-[11px] font-mono">
            {videoUrl}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-status-error/15 border border-status-error/30 text-xs text-status-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 9:16 Preview Box */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-36 aspect-[9/16] rounded-2xl overflow-hidden bg-black/60 border-2 border-dashed border-border-subtle relative flex items-center justify-center shrink-0 shadow-inner">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Pratinjau Thumbnail"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-3 text-text-secondary/60 space-y-1">
                <ImageIcon className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-[10px]">Belum ada thumbnail</p>
              </div>
            )}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-white/80">
              9:16
            </div>
          </div>

          <div className="space-y-3 flex-1 text-left w-full">
            <p className="text-xs text-text-secondary leading-relaxed">
              Unggah tangkapan layar atau gambar cover asli video (JPG, PNG, WebP, maks. 2 MB).
              Format vertikal 9:16 direkomendasikan agar pas dengan kartu Top Trending Videos.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1.5 border-border-subtle hover:border-brand-blue"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih Gambar...</span>
              </Button>

              {currentThumbnailUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isUploading}
                  className="gap-1.5 text-status-error hover:bg-status-error/10 border-status-error/30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Thumbnail</span>
                </Button>
              )}
            </div>

            {selectedFile && (
              <p className="text-[11px] text-text-secondary truncate">
                File terpilih: <span className="text-text-primary font-medium">{selectedFile.name}</span> (
                {Math.round(selectedFile.size / 1024)} KB)
              </p>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isUploading}
          >
            Tutup
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            isLoading={isUploading}
            className="gap-1.5"
          >
            <Video className="w-3.5 h-3.5" />
            <span>Simpan Thumbnail</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
