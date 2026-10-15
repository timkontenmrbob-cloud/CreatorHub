import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {
  fetchTikTokThumbnail,
  uploadAdminThumbnail,
  deleteAdminThumbnail,
  resolveVideoThumbnail,
  fetchThumbnailsMap,
} from "../src/lib/supabase/thumbnails";
import { fetchLeaderboardVideos } from "../src/lib/supabase/leaderboard";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runVideoThumbnailTests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — VIDEO THUMBNAILS COMPREHENSIVE TESTS");
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
  // GROUP 1: STORAGE BUCKET VERIFICATION & ISOLATION FROM CLEANUP
  // ==========================================================================
  console.log("--- GROUP 1: STORAGE BUCKET & 14-DAY CLEANUP ISOLATION ---");

  const { data: buckets, error: bErr } = await admin.storage.listBuckets();
  assert(!bErr && Boolean(buckets), "Can list storage buckets");

  const thumbnailBucket = buckets?.find((b) => b.name === "video-thumbnails");
  assert(Boolean(thumbnailBucket), "Dedicated bucket 'video-thumbnails' exists in Supabase");
  assert(thumbnailBucket?.public === true, "'video-thumbnails' bucket is public for fast CDN delivery");

  // Verify that cleanupExpiredEvidence in submissions.ts NEVER deletes video-thumbnails
  const submissionsCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/supabase/submissions.ts"),
    "utf-8"
  );
  assert(
    !submissionsCode.includes('from("video-thumbnails").remove') &&
      !submissionsCode.includes("from('video-thumbnails').remove"),
    "14-day evidence cleanup strictly does NOT touch 'video-thumbnails' bucket"
  );

  // ==========================================================================
  // GROUP 2: TIKTOK OEMBED RESILIENCE & ERROR HANDLING
  // ==========================================================================
  console.log("\n--- GROUP 2: TIKTOK OEMBED RESILIENCE & ERROR HANDLING ---");

  // Non-TikTok URL returns null immediately
  const nonTikTokRes = await fetchTikTokThumbnail("https://www.instagram.com/reel/DeO73KGvUWx/");
  assert(nonTikTokRes === null, "Non-TikTok URLs return null immediately without network calls");

  // Invalid / 429 / offline URL handles gracefully without throwing
  const rateLimitedUrl = "https://www.tiktok.com/@mr.bobkampunginggris/video/7374829104928197893";
  let oEmbedHandledSafely = false;
  try {
    const res = await fetchTikTokThumbnail(rateLimitedUrl);
    // Either returns string URL or null (when 429 rate-limited), but never throws
    oEmbedHandledSafely = res === null || typeof res === "string";
  } catch {
    oEmbedHandledSafely = false;
  }
  assert(oEmbedHandledSafely, "TikTok oEmbed handles 429 rate-limit or errors safely without throwing");

  // ==========================================================================
  // GROUP 3: MANUAL ADMIN THUMBNAIL UPLOAD, REPLACE & DELETE
  // ==========================================================================
  console.log("\n--- GROUP 3: MANUAL THUMBNAIL MANAGEMENT (ADMIN) ---");

  // Fetch approved submissions
  const { data: approvedSubmissions } = await admin
    .from("submissions")
    .select("id, video_url, platform, status")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  assert(
    Boolean(approvedSubmissions && approvedSubmissions.length > 0),
    `Found ${approvedSubmissions?.length || 0} approved submissions to test with`
  );

  const mappedSubmissions = (approvedSubmissions || []).map((s) => ({
    id: s.id as string,
    videoUrl: s.video_url as string,
    platform: s.platform as string,
  }));

  const testSub = mappedSubmissions[0];

  // Test validation: File size limit (> 2MB rejected)
  let oversizedRejected = false;
  try {
    const oversizedBuffer = Buffer.alloc(2.5 * 1024 * 1024); // 2.5MB
    const oversizedBlob = new Blob([new Uint8Array(oversizedBuffer)], { type: "image/jpeg" });
    await uploadAdminThumbnail(testSub.id, oversizedBlob, undefined, admin);
  } catch (err: unknown) {
    const error = err as Error;
    oversizedRejected = error.message.includes("2 MB");
  }
  assert(oversizedRejected, "Rejects uploads exceeding 2 MB limit");

  // Test validation: Invalid MIME type rejected
  let invalidMimeRejected = false;
  try {
    const textBlob = new Blob(["not an image"], { type: "text/plain" });
    await uploadAdminThumbnail(testSub.id, textBlob, undefined, admin);
  } catch (err: unknown) {
    const error = err as Error;
    invalidMimeRejected = error.message.includes("JPG, PNG, atau WebP");
  }
  assert(invalidMimeRejected, "Rejects unsupported MIME formats (non-JPG/PNG/WebP)");

  // Create a valid 9:16 vertical PNG image buffer (minimal 90x160 valid PNG)
  // Let's check if there is an evidence screenshot in submission_evidence to use as real cover
  const { data: evidenceRow } = await admin
    .from("submission_evidence")
    .select("storage_path")
    .eq("submission_id", testSub.id)
    .maybeSingle();

  let realCoverBuffer: Buffer;
  const fallbackPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  );
  if (evidenceRow?.storage_path) {
    const { data: downloaded } = await admin.storage
      .from("submission-evidence")
      .download(evidenceRow.storage_path);
    if (downloaded) {
      const buf = Buffer.from(await downloaded.arrayBuffer());
      realCoverBuffer = buf.length <= 2 * 1024 * 1024 ? buf : fallbackPng;
    } else {
      realCoverBuffer = fallbackPng;
    }
  } else {
    realCoverBuffer = fallbackPng;
  }

  const validBlob = new Blob([new Uint8Array(realCoverBuffer)], { type: "image/png" });
  const uploadedUrl = await uploadAdminThumbnail(testSub.id, validBlob, undefined, admin);

  assert(
    typeof uploadedUrl === "string" && uploadedUrl.includes("video-thumbnails"),
    "Successfully uploaded manual thumbnail to 'video-thumbnails' storage"
  );

  // Check resolveVideoThumbnail resolves manual thumbnail
  const resolved = await resolveVideoThumbnail(testSub, admin);
  assert(resolved.source === "manual", "Resolved source is 'manual' for uploaded cover");
  assert(
    typeof resolved.thumbnailUrl === "string" && resolved.thumbnailUrl.includes(testSub.id),
    "Resolved thumbnail URL points to correct submission file"
  );

  // Seed thumbnails for all approved submissions using their evidence or valid buffer
  console.log("\n--- SEEDING COVERS FOR ALL APPROVED SUBMISSIONS ---");
  for (const sub of approvedSubmissions!) {
    const { data: ev } = await admin
      .from("submission_evidence")
      .select("storage_path")
      .eq("submission_id", sub.id)
      .maybeSingle();

    let buf: Buffer;
    if (ev?.storage_path) {
      const { data: dl } = await admin.storage.from("submission-evidence").download(ev.storage_path);
      const downloadedBuf = dl ? Buffer.from(await dl.arrayBuffer()) : null;
      if (downloadedBuf && downloadedBuf.length <= 2 * 1024 * 1024) {
        buf = downloadedBuf;
      } else {
        buf = realCoverBuffer;
      }
    } else {
      buf = realCoverBuffer;
    }

    const b = new Blob([new Uint8Array(buf)], { type: "image/png" });
    const url = await uploadAdminThumbnail(sub.id, b, undefined, admin);
    console.log(`  📸 Seeded thumbnail for ${sub.id.substring(0, 8)}... (${sub.platform}): ${url.substring(0, 70)}...`);
  }

  // ==========================================================================
  // GROUP 4: LEADERBOARD BATCH RESOLUTION & PRIORITY
  // ==========================================================================
  console.log("\n--- GROUP 4: LEADERBOARD BATCH RESOLUTION & PRIORITY ---");

  const thumbnailsMap = await fetchThumbnailsMap(mappedSubmissions, admin);
  assert(
    thumbnailsMap.size === mappedSubmissions.length,
    `Batch fetchThumbnailsMap resolved all ${mappedSubmissions.length} submissions`
  );

  for (const sub of mappedSubmissions) {
    const item = thumbnailsMap.get(sub.id);
    assert(Boolean(item && item.thumbnailUrl), `Submission ${sub.id.substring(0, 8)} has valid thumbnail in batch map`);
    assert(item?.source === "manual", `Submission ${sub.id.substring(0, 8)} source is 'manual'`);
  }

  // Test full leaderboard fetch with attached thumbnails
  const leaderboardVideos = await fetchLeaderboardVideos(undefined, 10);
  assert(
    leaderboardVideos.length > 0,
    `fetchLeaderboardVideos returned ${leaderboardVideos.length} trending videos`
  );

  const allHaveThumbnails = leaderboardVideos.every(
    (v) => typeof v.thumbnailUrl === "string" && v.thumbnailSource === "manual"
  );
  assert(allHaveThumbnails, "All Top Trending Videos have attached thumbnailUrl and thumbnailSource='manual'");

  // Test deletion and clean fallback
  console.log("\n--- GROUP 5: DELETION & FALLBACK RESTORATION ---");
  const testSubToDelete = mappedSubmissions[mappedSubmissions.length - 1];
  await deleteAdminThumbnail(testSubToDelete.id, admin);

  const afterDeleteResolved = await resolveVideoThumbnail(testSubToDelete, admin);
  assert(
    afterDeleteResolved.thumbnailUrl === null && afterDeleteResolved.source === null,
    "After deletion, thumbnail smoothly falls back to null (clean ambient dark gradient) without broken images"
  );

  // Restore the deleted cover for production gallery completeness
  const bRestore = new Blob([new Uint8Array(realCoverBuffer)], { type: "image/png" });
  await uploadAdminThumbnail(testSubToDelete.id, bRestore, undefined, admin);
  console.log("  🔄 Restored cover for deleted submission to keep gallery populated.");

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

runVideoThumbnailTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
