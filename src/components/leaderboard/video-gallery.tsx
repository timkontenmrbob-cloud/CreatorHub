"use client";

import React, { useState, useEffect, useRef } from "react";
import { LeaderboardVideo } from "@/lib/types/leaderboard";
import { normalizeVideoUrl } from "@/lib/video-url";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPoints, formatViews } from "@/lib/utils";
import { ThumbnailModal } from "@/components/admin/thumbnail-modal";
import {
  ExternalLink,
  Eye,
  Sparkles,
  Shield,
  Video as VideoIcon,
  Image as ImageIcon,
} from "lucide-react";

interface VideoGalleryProps {
  videos: LeaderboardVideo[];
  isAdmin?: boolean;
  onThumbnailChange?: (videoId: string, newUrl: string | null) => void;
}

/**
 * Builds the official embed URL for TikTok or Instagram Reels.
 * Returns null if the URL is not embeddable.
 */
function getEmbedUrl(rawUrl: string): {
  embedUrl: string | null;
  platform: "tiktok" | "instagram" | "other";
} {
  const norm = normalizeVideoUrl(rawUrl);
  if (!norm.isValid || !norm.data) {
    return { embedUrl: null, platform: "other" };
  }

  const { platform, displayId } = norm.data;

  if (platform === "tiktok") {
    if (/^[0-9]+$/.test(displayId)) {
      return {
        embedUrl: `https://www.tiktok.com/embed/v2/${displayId}`,
        platform: "tiktok",
      };
    }
    return { embedUrl: null, platform: "tiktok" };
  }

  if (platform === "instagram") {
    if (displayId) {
      return {
        embedUrl: `https://www.instagram.com/reel/${displayId}/embed/`,
        platform: "instagram",
      };
    }
    return { embedUrl: null, platform: "instagram" };
  }

  return { embedUrl: null, platform: "other" };
}

interface NativeVideoCardProps {
  video: LeaderboardVideo;
  isAdmin?: boolean;
  onEditThumbnail?: (video: LeaderboardVideo) => void;
}

/**
 * Individual Native Video Card:
 * 1. Top Header: Ranking badge left, Platform badge right (outside video player)
 * 2. Middle: Clean 9:16 vertical video player with zero overlays
 * 3. Bottom: Creator info, verified views (left), points (right), and external link
 */
function NativeVideoCard({ video: v, isAdmin, onEditThumbnail }: NativeVideoCardProps) {
  const [isInView, setIsInView] = useState(() => typeof IntersectionObserver === "undefined");
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { embedUrl, platform } = getEmbedUrl(v.videoUrl);
  const isTiktok = v.platform.toLowerCase().includes("tiktok") || platform === "tiktok";
  const platformName = isTiktok ? "TikTok" : "Instagram Reels";
  const platformWatchText = isTiktok ? "Tonton di TikTok" : "Tonton di Instagram";
  const safeWatchUrl = v.videoUrl.startsWith("http") ? v.videoUrl : `https://${v.videoUrl}`;

  // 1. Performance: Lazy-load embedded player when approaching viewport
  useEffect(() => {
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "250px 0px" } // Pre-load 250px before entering viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Fallback: Safety timer if embed hangs or fails to complete load
  useEffect(() => {
    if (!isInView || isLoaded || hasError || !embedUrl) return;

    const timer = setTimeout(() => {
      // If still not loaded after 9 seconds, display graceful fallback
      setHasError(true);
    }, 9000);

    return () => clearTimeout(timer);
  }, [isInView, isLoaded, hasError, embedUrl]);

  // Rank badge styling
  const isTop1 = v.rank === 1;
  const isTop2 = v.rank === 2;
  const isTop3 = v.rank === 3;

  // 3. Privacy: Opted-out creators must NOT render identifying third-party embeds
  if (v.isAnonymous) {
    return (
      <div
        ref={cardRef}
        className="flex flex-col w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-card-surface border border-border-subtle shadow-md"
      >
        {/* 1. TOP HEADER (OUTSIDE VIDEO PLAYER) */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-card-surface border-b border-border-subtle shrink-0">
          <div className="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-card-elevated text-text-secondary border border-border-subtle">
            #{v.rank}
          </div>
          <Badge variant="neutral" size="sm" className="text-[10px] text-text-secondary">
            {platformName}
          </Badge>
        </div>

        {/* 2. MIDDLE — ANONYMOUS PRIVACY SHIELD (9:16 VERTICAL RATIO) */}
        <div className="relative w-full aspect-[9/16] bg-[#0D111A] flex flex-col items-center justify-center p-6 text-center space-y-3 shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue shadow-inner">
            <Shield className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-primary">Kreator Anonim</h4>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pratinjau video disembunyikan untuk melindungi privasi kreator.
            </p>
          </div>
        </div>

        {/* 3. BOTTOM — METRICS (OUTSIDE VIDEO PLAYER) */}
        <div className="p-3.5 bg-card-surface border-t border-border-subtle flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-text-secondary">
            <Eye className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium text-text-primary">{formatViews(v.views)}</span>
            <span className="text-[10px]">views</span>
          </div>
          <div className="font-mono font-bold text-brand-blue">
            +{formatPoints(v.points)} Poin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="flex flex-col w-full max-w-sm mx-auto rounded-2xl overflow-hidden bg-card-surface border border-border-subtle hover:border-brand-blue/40 transition-all duration-300 shadow-lg"
    >
      {/* 1. TOP HEADER (COMPLETELY OUTSIDE VIDEO PLAYER) */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-card-surface border-b border-border-subtle shrink-0">
        {/* Ranking badge aligned left */}
        <div
          className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1 border shadow-xs ${
            isTop1
              ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10"
              : isTop2
              ? "bg-slate-300/20 text-slate-200 border-slate-300/40"
              : isTop3
              ? "bg-amber-700/20 text-amber-400 border-amber-600/40"
              : "bg-card-elevated text-text-secondary border-border-subtle"
          }`}
        >
          {isTop1 ? "🥇 #1" : isTop2 ? "🥈 #2" : isTop3 ? "🥉 #3" : `#${v.rank}`}
        </div>

        {/* Platform badge & optional Admin thumbnail button aligned right */}
        <div className="flex items-center gap-1.5">
          {isAdmin && onEditThumbnail && (
            <button
              type="button"
              onClick={() => onEditThumbnail(v)}
              className="px-2 py-0.5 rounded-lg bg-card-elevated hover:bg-brand-blue/20 hover:text-brand-blue border border-border-subtle text-[10px] text-text-secondary flex items-center gap-1 cursor-pointer transition-colors"
              title="Atur fallback thumbnail video ini"
            >
              <ImageIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Thumbnail</span>
            </button>
          )}

          <Badge
            variant={isTiktok ? "neutral" : "brand"}
            size="sm"
            className={`text-[10px] font-semibold border ${
              isTiktok
                ? "bg-black/60 text-cyan-300 border-cyan-500/30"
                : "bg-gradient-to-r from-purple-600/20 to-pink-600/20 text-pink-300 border-pink-500/30"
            }`}
          >
            {platformName}
          </Badge>
        </div>
      </div>

      {/* 2. MIDDLE — NATIVE VIDEO PLAYER (9:16 VERTICAL RATIO, ZERO OVERLAYS) */}
      <div className="relative w-full aspect-[9/16] bg-black overflow-hidden flex items-center justify-center shrink-0">
        {embedUrl && !hasError ? (
          isInView ? (
            <>
              {/* Native Embed iframe (no autoplay; platform handles native paused preview) */}
              <iframe
                src={embedUrl}
                title={`Video ${v.rank} - ${v.creatorName}`}
                className={`w-full h-full border-0 transition-opacity duration-300 ${
                  isLoaded ? "opacity-100" : "opacity-0"
                }`}
                allow="encrypted-media; fullscreen; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                scrolling="no"
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
              />

              {/* Loading Placeholder while iframe initializes */}
              {!isLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2.5 bg-[#0B0E14] z-1 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/10 flex items-center justify-center text-brand-blue">
                    <VideoIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-text-secondary">Memuat pemutar {platformName}...</p>
                </div>
              )}
            </>
          ) : (
            /* Preserved dimensions placeholder before approaching viewport */
            <div className="w-full h-full bg-[#0B0E14]" />
          )
        ) : (
          /* Functional Fallback when embedding is refused or timed out */
          <div className="w-full h-full bg-card-surface flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-card-elevated border border-border-subtle flex items-center justify-center text-brand-blue">
              <ExternalLink className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-text-primary">Pratinjau {platformName}</p>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Video tidak dapat diputar langsung di galeri web.
              </p>
            </div>
            <a
              href={safeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
            >
              <span>{platformWatchText}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>

      {/* 3. BOTTOM — CREATOR INFORMATION (OUTSIDE VIDEO PLAYER) */}
      <div className="p-3.5 bg-card-surface border-t border-border-subtle flex flex-col gap-2.5 flex-1 justify-between">
        {/* Creator avatar, name, and username */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar name={v.creatorName} src={v.creatorAvatar || undefined} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text-primary truncate">
              {v.creatorName}
            </p>
            {v.creatorHandle && (
              <p className="text-[11px] text-text-secondary truncate">{v.creatorHandle}</p>
            )}
          </div>
        </div>

        {/* Verified views on the left, Earned points on the right */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border-subtle/50">
          <span className="flex items-center gap-1 text-text-secondary">
            <Eye className="w-3.5 h-3.5 text-text-secondary/70" />
            <span className="font-semibold text-text-primary">{formatViews(v.views)}</span>
            <span className="text-[10px] text-text-secondary/70">views</span>
          </span>

          <span className="font-mono font-bold text-brand-blue">
            +{formatPoints(v.points)} Poin
          </span>
        </div>

        {/* Original platform video link below */}
        <a
          href={safeWatchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-1.5 px-3 rounded-xl bg-card-elevated hover:bg-card-elevated/80 border border-border-subtle hover:border-brand-blue/40 text-text-primary hover:text-brand-blue text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer"
        >
          <span>{platformWatchText}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export function VideoGallery({
  videos,
  isAdmin = false,
  onThumbnailChange,
}: VideoGalleryProps) {
  // Admin thumbnail editing state (kept as optional fallback management)
  const [editingVideo, setEditingVideo] = useState<LeaderboardVideo | null>(null);

  if (!videos || videos.length === 0) {
    return (
      <Card className="p-12 text-center bg-card-surface border-border-subtle rounded-2xl space-y-3">
        <div className="w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-text-primary">
          Belum ada konten yang masuk leaderboard periode ini.
        </h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          Yuk, mulai bikin konten dan kumpulkan poin!
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {videos.map((v) => (
          <NativeVideoCard
            key={v.id}
            video={v}
            isAdmin={isAdmin}
            onEditThumbnail={(vid) => setEditingVideo(vid)}
          />
        ))}
      </div>

      {/* Admin Thumbnail Fallback Management Modal */}
      {editingVideo && (
        <ThumbnailModal
          isOpen={Boolean(editingVideo)}
          onClose={() => setEditingVideo(null)}
          submissionId={editingVideo.id}
          videoUrl={editingVideo.videoUrl}
          platform={editingVideo.platform}
          creatorName={editingVideo.creatorName}
          currentThumbnailUrl={editingVideo.thumbnailUrl}
          onSuccess={(newUrl) => {
            if (onThumbnailChange) {
              onThumbnailChange(editingVideo.id, newUrl);
            }
          }}
        />
      )}
    </>
  );
}
