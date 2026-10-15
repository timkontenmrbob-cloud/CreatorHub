"use client";

import React, { useState } from "react";
import { LeaderboardVideo } from "@/lib/types/leaderboard";
import { CONTENT_CATEGORIES, ContentCategory } from "@/lib/types/analytics";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface ClassifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  videos: LeaderboardVideo[];
  onClassified: () => void;
}

export function ClassifyModal({ isOpen, onClose, videos, onClassified }: ClassifyModalProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>(videos[0]?.id || "");
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory>("Daily Life");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!selectedVideoId || !selectedCategory) return;

    try {
      setIsSubmitting(true);
      setMessage(null);

      const res = await fetch("/api/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign_category",
          submissionId: selectedVideoId,
          category: selectedCategory,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal menetapkan kategori.");
      }

      setMessage("Kategori konten berhasil disimpan!");
      setTimeout(() => {
        onClassified();
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan.";
      setMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Klasifikasi Format Konten"
      description="Tetapkan kategori format konten untuk video yang telah disetujui."
      className="max-w-md bg-bg-secondary border border-border-subtle"
    >
      <div className="space-y-4 my-2">
          {/* Select Video */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Pilih Video Disetujui
            </label>
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="w-full bg-bg-main border border-border-subtle rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.rank} — {v.creatorName} ({v.platform}, {v.views.toLocaleString("id-ID")} views)
                </option>
              ))}
            </select>
          </div>

          {/* Select Category */}
          <div>
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Pilih Kategori Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition ${
                      isSelected
                        ? "bg-brand-blue/15 border-brand-blue text-brand-blue font-semibold"
                        : "bg-bg-main border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand-blue/30"
                    }`}
                  >
                    <span>{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-brand-blue" />}
                  </button>
                );
              })}
            </div>
          </div>

          {message && (
            <p
              className={`text-xs p-2.5 rounded-xl border ${
                message.includes("berhasil")
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
              }`}
            >
              {message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || !selectedVideoId}
            className="bg-brand-blue hover:bg-brand-blue/90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Kategori</span>
            )}
          </Button>
        </div>
    </Dialog>
  );
}
