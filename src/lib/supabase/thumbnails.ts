import { createClient } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ThumbnailInfo {
  thumbnailUrl: string | null;
  source: "manual" | "auto" | null;
}

export interface ThumbnailMeta {
  submissionId: string;
  thumbnailUrl: string;
  source: "manual" | "auto";
  uploaderId?: string;
  updatedAt: string;
}

const THUMBNAIL_BUCKET = "video-thumbnails";

/**
 * Attempts to retrieve official TikTok thumbnail via oEmbed API.
 * Gracefully handles 429, network timeouts, or deleted videos.
 */
export async function fetchTikTokThumbnail(videoUrl: string): Promise<string | null> {
  if (!videoUrl || !videoUrl.toLowerCase().includes("tiktok.com")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(videoUrl)}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (typeof data.thumbnail_url === "string" && data.thumbnail_url.startsWith("http")) {
        return data.thumbnail_url;
      }
    }
    return null;
  } catch {
    // Timeout or network error — fallback gracefully without crashing
    return null;
  }
}

/**
 * Uploads a verified manual thumbnail for an approved video submission.
 * Saves into 'video-thumbnails' storage bucket (isolated from 14-day evidence cleanup).
 */
export async function uploadAdminThumbnail(
  submissionId: string,
  file: File | Blob,
  uploaderId?: string,
  customClient?: SupabaseClient
): Promise<string> {
  const supabase = customClient || createClient();

  // Validate format and size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ukuran thumbnail maksimal 2 MB.");
  }

  const mime = file.type || "image/jpeg";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
    throw new Error("Format thumbnail harus berupa JPG, PNG, atau WebP.");
  }

  let ext = "jpg";
  if (mime === "image/png") ext = "png";
  if (mime === "image/webp") ext = "webp";

  const storagePath = `covers/${submissionId}.${ext}`;

  // 1. Upload cover image
  const { error: uploadError } = await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(storagePath, file, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Gagal mengunggah thumbnail: ${uploadError.message}`);
  }

  // 2. Get permanent public URL
  const { data: pubData } = supabase.storage
    .from(THUMBNAIL_BUCKET)
    .getPublicUrl(storagePath);

  const publicUrl = `${pubData.publicUrl}?t=${Date.now()}`;

  // 3. Save metadata JSON
  const meta: ThumbnailMeta = {
    submissionId,
    thumbnailUrl: publicUrl,
    source: "manual",
    uploaderId,
    updatedAt: new Date().toISOString(),
  };

  const metaBlob = new Blob([JSON.stringify(meta, null, 2)], {
    type: "application/json",
  });

  await supabase.storage
    .from(THUMBNAIL_BUCKET)
    .upload(`meta/${submissionId}.json`, metaBlob, {
      contentType: "application/json",
      upsert: true,
    });

  return publicUrl;
}

/**
 * Removes manual thumbnail for a submission and restores clean fallback.
 */
export async function deleteAdminThumbnail(
  submissionId: string,
  customClient?: SupabaseClient
): Promise<void> {
  const supabase = customClient || createClient();

  const possibleCovers = [
    `covers/${submissionId}.jpg`,
    `covers/${submissionId}.jpeg`,
    `covers/${submissionId}.png`,
    `covers/${submissionId}.webp`,
    `meta/${submissionId}.json`,
  ];

  await supabase.storage.from(THUMBNAIL_BUCKET).remove(possibleCovers);
}

/**
 * Resolves thumbnail for a single video following strict priority:
 * 1. Verified manual admin thumbnail
 * 2. Official platform thumbnail (TikTok oEmbed)
 * 3. Fallback null (clean dark gradient)
 */
export async function resolveVideoThumbnail(
  submission: {
    id: string;
    videoUrl: string;
    platform: string;
  },
  customClient?: SupabaseClient
): Promise<ThumbnailInfo> {
  const supabase = customClient || createClient();

  // 1. Check for manual cover in storage
  try {
    const { data: files } = await supabase.storage
      .from(THUMBNAIL_BUCKET)
      .list("covers", { search: submission.id });

    const matched = (files || []).find((f) => f.name.startsWith(submission.id));
    if (matched) {
      const { data } = supabase.storage
        .from(THUMBNAIL_BUCKET)
        .getPublicUrl(`covers/${matched.name}`);
      if (data?.publicUrl) {
        return {
          thumbnailUrl: data.publicUrl,
          source: "manual",
        };
      }
    }
  } catch {
    // Non-blocking fallback
  }

  // 2. Official platform retrieval (TikTok oEmbed)
  if (submission.platform.toLowerCase().includes("tiktok")) {
    const autoUrl = await fetchTikTokThumbnail(submission.videoUrl);
    if (autoUrl) {
      return {
        thumbnailUrl: autoUrl,
        source: "auto",
      };
    }
  }

  // 3. Fallback null
  return {
    thumbnailUrl: null,
    source: null,
  };
}

/**
 * Batch resolves thumbnails for leaderboard videos efficiently.
 */
export async function fetchThumbnailsMap(
  submissions: Array<{ id: string; videoUrl: string; platform: string }>,
  customClient?: SupabaseClient
): Promise<Map<string, { thumbnailUrl: string; source: "manual" | "auto" }>> {
  const map = new Map<string, { thumbnailUrl: string; source: "manual" | "auto" }>();
  if (!submissions || submissions.length === 0) return map;

  const supabase = customClient || createClient();

  // 1. List all covers from storage in single call
  let coversList: Array<{ name: string }> = [];
  try {
    const { data } = await supabase.storage.from(THUMBNAIL_BUCKET).list("covers");
    coversList = data || [];
  } catch {
    coversList = [];
  }

  const coversMap = new Map<string, string>();
  for (const c of coversList) {
    const baseId = c.name.split(".")[0];
    coversMap.set(baseId, c.name);
  }

  // 2. Match each submission
  for (const s of submissions) {
    if (coversMap.has(s.id)) {
      const fileName = coversMap.get(s.id)!;
      const { data } = supabase.storage
        .from(THUMBNAIL_BUCKET)
        .getPublicUrl(`covers/${fileName}`);
      if (data?.publicUrl) {
        map.set(s.id, {
          thumbnailUrl: data.publicUrl,
          source: "manual",
        });
        continue;
      }
    }

    // Attempt TikTok oEmbed if manual not present
    if (s.platform.toLowerCase().includes("tiktok")) {
      // Do non-blocking fetch
      const autoUrl = await fetchTikTokThumbnail(s.videoUrl);
      if (autoUrl) {
        map.set(s.id, {
          thumbnailUrl: autoUrl,
          source: "auto",
        });
      }
    }
  }

  return map;
}
