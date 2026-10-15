import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { normalizeVideoUrl } from "../src/lib/video-url";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runNativeVideoPreviewTests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — NATIVE VIDEO PLAYER AS GALLERY PREVIEW TESTS");
  console.log("==================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let testCount = 0;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    testCount++;
    if (condition) {
      console.log(`✅ PASS [Test ${testCount}]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL [Test ${testCount}]: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // ==========================================================================
  // GROUP 1: GALLERY ARCHITECTURE & UI COMPONENT AUDIT
  // ==========================================================================
  console.log("--- GROUP 1: GALLERY ARCHITECTURE & REMOVAL OF UNNECESSARY THUMBNAIL UI ---");

  const gallerySource = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/leaderboard/video-gallery.tsx"),
    "utf-8"
  );

  // 1. Check vertical 9:16 aspect ratio
  assert(
    gallerySource.includes("aspect-[9/16]"),
    "Cards strictly maintain vertical 9:16 aspect ratio (aspect-[9/16])"
  );

  // 2. Responsive 1 to 3 column grid
  assert(
    gallerySource.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"),
    "Gallery layout is fully responsive with 1 col mobile, 2 col tablet, and 3 col desktop"
  );

  // 3. Removed custom thumbnail overlays and Cover Resmi badges
  assert(
    !gallerySource.includes("Cover Resmi"),
    "Removed 'Cover Resmi' badges from ordinary video gallery"
  );
  assert(
    !gallerySource.includes("<img") && !gallerySource.includes("rawThumb"),
    "Removed custom image thumbnail overlays that hide the native player"
  );
  assert(
    !gallerySource.includes("Putar Video"),
    "Removed duplicate custom 'Putar Video' button; native platform player provides native play controls"
  );

  // 4. No autoplay
  assert(
    !gallerySource.includes("autoplay=1") && !gallerySource.includes("autoplay=true"),
    "Strictly does not force autoplay; allows platform to show native paused player state"
  );

  // 5. Performance lazy loading
  assert(
    gallerySource.includes("IntersectionObserver") && gallerySource.includes("loading=\"lazy\""),
    "Lazy-loads embedded players approaching viewport via IntersectionObserver + loading='lazy'"
  );

  // 6. Functional fallback
  assert(
    gallerySource.includes("hasError") &&
      gallerySource.includes("Tonton di Instagram") &&
      gallerySource.includes("Tonton di TikTok"),
    "Includes functional fallback with clear 'Tonton di Platform' button when embedding fails/times out"
  );

  // 7. Privacy protection for opted-out creators
  assert(
    gallerySource.includes("v.isAnonymous") &&
      gallerySource.includes("Pratinjau video disembunyikan untuk melindungi privasi kreator"),
    "Respects creator consent: opted-out creators do not render identifying third-party embeds"
  );

  // 8. Dedicated Top Header outside player
  assert(
    gallerySource.includes("border-b border-border-subtle") &&
      gallerySource.includes("px-3.5 py-2.5"),
    "Top Header with Ranking and Platform badges is placed completely outside the video player"
  );

  // 9. Dedicated Bottom Creator Information outside player
  assert(
    gallerySource.includes("border-t border-border-subtle") &&
      gallerySource.includes("Avatar") &&
      gallerySource.includes("formatViews") &&
      gallerySource.includes("formatPoints"),
    "Bottom Creator information with views, points, and platform link is placed outside the video player"
  );

  // ==========================================================================
  // GROUP 2: ZERO EXPOSURE OF PRIVATE SUBMISSION EVIDENCE
  // ==========================================================================
  console.log("\n--- GROUP 2: EVIDENCE PRIVACY & STORAGE ISOLATION ---");

  const { data: buckets } = await admin.storage.listBuckets();
  const evidenceBucket = buckets?.find((b) => b.name === "submission-evidence");
  assert(
    evidenceBucket?.public === false,
    "'submission-evidence' storage bucket is strictly private (public: false)"
  );

  const { data: covers } = await admin.storage.from("video-thumbnails").list("covers");
  assert(
    !covers || covers.length === 0,
    "No private submission evidence screenshots are stored or exposed in public covers directory"
  );

  // ==========================================================================
  // GROUP 3: ACTUAL APPROVED VIDEOS INSPECTION & EMBED VERIFICATION
  // ==========================================================================
  console.log("\n--- GROUP 3: ACTUAL APPROVED VIDEOS INSPECTION & EMBED STATUS ---");

  const { data: approvedSubmissions, error: subErr } = await admin
    .from("submissions")
    .select("id, video_url, platform, verified_views, approved_points, status")
    .eq("status", "approved")
    .order("verified_views", { ascending: false });

  assert(!subErr && Boolean(approvedSubmissions), "Successfully queried approved submissions from Supabase");
  console.log(`Found ${approvedSubmissions?.length || 0} approved submissions in database:`);

  const report: Array<{
    id: string;
    platform: string;
    url: string;
    embedUrl: string | null;
    httpStatus: number | string;
    embedHttpStatus: number | string;
    playableState: string;
  }> = [];

  for (const sub of approvedSubmissions || []) {
    const norm = normalizeVideoUrl(sub.video_url);
    let embedUrl: string | null = null;
    if (norm.isValid && norm.data) {
      if (norm.data.platform === "instagram") {
        embedUrl = `https://www.instagram.com/reel/${norm.data.displayId}/embed/`;
      } else if (norm.data.platform === "tiktok") {
        embedUrl = `https://www.tiktok.com/embed/v2/${norm.data.displayId}`;
      }
    }

    let pageStatus: number | string = "Error";
    let embedStatus: number | string = "Error";

    try {
      const pageRes = await fetch(sub.video_url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      pageStatus = pageRes.status;
    } catch (e: unknown) {
      pageStatus = (e as Error).message;
    }

    if (embedUrl) {
      try {
        const embedRes = await fetch(embedUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        embedStatus = embedRes.status;
      } catch (e: unknown) {
        embedStatus = (e as Error).message;
      }
    }

    const isPlayable = pageStatus === 200 && embedStatus === 200;
    const playableState = isPlayable
      ? "PLAYABLE (Native Embed OK)"
      : "BLOCKED / REQUIRES FALLBACK";

    report.push({
      id: sub.id,
      platform: sub.platform,
      url: sub.video_url,
      embedUrl,
      httpStatus: pageStatus,
      embedHttpStatus: embedStatus,
      playableState,
    });

    assert(
      norm.isValid && Boolean(embedUrl),
      `Canonical embed URL generated for submission ${sub.id.substring(0, 8)}: ${embedUrl}`
    );
    assert(
      pageStatus === 200,
      `Original video URL is active and accessible (HTTP ${pageStatus})`
    );
    assert(
      embedStatus === 200,
      `Native embed endpoint responded with HTTP ${embedStatus}`
    );
  }

  // Print Detailed Real Video Report
  console.log("\n==================================================================");
  console.log("ACTUAL APPROVED VIDEOS PLAYABILITY REPORT:");
  console.log("==================================================================");
  report.forEach((r, idx) => {
    console.log(`\n[Video #${idx + 1}] ID: ${r.id}`);
    console.log(`  Platform: ${r.platform}`);
    console.log(`  Original URL: ${r.url} (Status: ${r.httpStatus})`);
    console.log(`  Embed URL: ${r.embedUrl} (Status: ${r.embedHttpStatus})`);
    console.log(`  Playability: ${r.playableState}`);
  });
  console.log("==================================================================\n");

  // ==========================================================================
  // GROUP 4: TIKTOK NORMALIZATION & FALLBACK LOGIC
  // ==========================================================================
  console.log("--- GROUP 4: TIKTOK EMBED FORMATTING & NUMERIC ID VALIDATION ---");

  const validTikTokUrl = "https://www.tiktok.com/@mr.bobkampunginggris/video/7374829104928197893";
  const normTikTok = normalizeVideoUrl(validTikTokUrl);
  assert(normTikTok.isValid && normTikTok.data?.platform === "tiktok", "Normalizes valid TikTok URL correctly");
  assert(
    normTikTok.data?.displayId === "7374829104928197893",
    "Extracts numeric video ID from TikTok URL"
  );

  const tiktokEmbedUrl = `https://www.tiktok.com/embed/v2/${normTikTok.data?.displayId}`;
  assert(
    tiktokEmbedUrl === "https://www.tiktok.com/embed/v2/7374829104928197893",
    "Generates official TikTok v2 player embed URL"
  );

  // Invalid / non-embeddable TikTok URL handles fallback gracefully
  const invalidTikTokUrl = "https://www.tiktok.com/@mr.bobkampunginggris";
  const normInvalid = normalizeVideoUrl(invalidTikTokUrl);
  assert(!normInvalid.isValid, "Non-video TikTok profile URLs are recognized as invalid for embed");

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${testCount}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runNativeVideoPreviewTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
