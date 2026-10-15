export type SupportedPlatform = "tiktok" | "instagram";

export interface NormalizedVideo {
  platform: SupportedPlatform;
  normalizedIdentifier: string;
  cleanUrl: string;
  displayId: string;
}

/**
 * Validates and normalizes TikTok & Instagram Reels URLs.
 * Extracts a canonical unique identifier to prevent duplicate submissions
 * across tracking query parameters, HTTP/HTTPS variants, and short links.
 */
export function normalizeVideoUrl(rawUrl: string): {
  isValid: boolean;
  error?: string;
  data?: NormalizedVideo;
} {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { isValid: false, error: "URL video wajib diisi." };
  }

  const trimmed = rawUrl.trim();

  // Basic URL structure check
  let urlObj: URL;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    urlObj = new URL(withProtocol);
  } catch {
    return { isValid: false, error: "Format tautan video tidak valid." };
  }

  const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = urlObj.pathname.replace(/\/+$/, ""); // Remove trailing slashes

  // 1. TIKTOK DETECTION & NORMALIZATION
  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    // A. Standard Video URL: /@username/video/7123456789012345678
    const standardMatch = pathname.match(/\/@[^/]+\/video\/([0-9]+)/i);
    if (standardMatch) {
      const videoId = standardMatch[1];
      return {
        isValid: true,
        data: {
          platform: "tiktok",
          normalizedIdentifier: `tiktok:${videoId}`,
          cleanUrl: `https://www.tiktok.com${standardMatch[0]}`,
          displayId: videoId,
        },
      };
    }

    // B. Alternative path: /video/7123456789012345678 or mobile /v/7123456789012345678.html
    const altVideoMatch = pathname.match(/\/(?:video|v)\/([0-9]+)(?:\.html)?/i);
    if (altVideoMatch) {
      const videoId = altVideoMatch[1];
      return {
        isValid: true,
        data: {
          platform: "tiktok",
          normalizedIdentifier: `tiktok:${videoId}`,
          cleanUrl: `https://www.tiktok.com/video/${videoId}`,
          displayId: videoId,
        },
      };
    }

    // C. Mobile Shortlink: vt.tiktok.com/ZSxxxxxxx or vm.tiktok.com/xxxx
    if (host.startsWith("vt.") || host.startsWith("vm.")) {
      const shortCodeMatch = pathname.match(/\/([a-zA-Z0-9_-]+)/);
      if (shortCodeMatch) {
        const shortCode = shortCodeMatch[1];
        return {
          isValid: true,
          data: {
            platform: "tiktok",
            normalizedIdentifier: `tiktok:short:${shortCode}`,
            cleanUrl: `https://${host}/${shortCode}`,
            displayId: shortCode,
          },
        };
      }
    }

    return {
      isValid: false,
      error: "Tautan TikTok harus mengarah ke video spesifik (contoh: https://www.tiktok.com/@mrbob/video/... atau vt.tiktok.com/...)",
    };
  }

  // 2. INSTAGRAM REELS & POST DETECTION & NORMALIZATION
  if (host === "instagram.com" || host.endsWith(".instagram.com")) {
    // Both /reel/CODE and /p/CODE share the same Instagram shortcode namespace
    const igMatch = pathname.match(/\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/i);
    if (igMatch) {
      const mediaCode = igMatch[1];
      return {
        isValid: true,
        data: {
          platform: "instagram",
          normalizedIdentifier: `instagram:reel:${mediaCode}`,
          cleanUrl: `https://www.instagram.com/reel/${mediaCode}/`,
          displayId: mediaCode,
        },
      };
    }

    return {
      isValid: false,
      error: "Tautan Instagram harus mengarah ke Reel atau Postingan video (contoh: https://www.instagram.com/reel/CODE/)",
    };
  }

  return {
    isValid: false,
    error: "Platform tidak didukung. Harap masukkan tautan video dari TikTok atau Instagram Reels.",
  };
}
