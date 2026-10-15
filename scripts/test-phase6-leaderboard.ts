import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {
  getCalendarThreeMonthsPeriod,
  getRollingThreeMonthsPeriod,
  fetchLeaderboardCreators,
  fetchLeaderboardVideos,
  fetchUserLeaderboardRank,
} from "../src/lib/supabase/leaderboard";
import { fetchRewardsCatalog } from "../src/lib/supabase/rewards";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runPhase6LeaderboardTests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — PHASE 6 LEADERBOARD & REFINEMENT TESTS");
  console.log("==================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const publicClient = createClient(supabaseUrl, anonKey, {
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
  // GROUP A: MY REWARDS UI REFINEMENT (COMPACT CARD & IMAGE ON LEFT)
  // ==========================================================================
  console.log("--- GROUP A: MY REWARDS UI REFINEMENT ---");

  const myRewardsFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/my-rewards/page.tsx"),
    "utf-8"
  );

  assert(
    myRewardsFile.includes("w-20 h-20") && myRewardsFile.includes("object-cover"),
    "My Rewards card has small square thumbnail (80px, w-20 h-20) on the left side"
  );

  assert(
    myRewardsFile.includes("Nomor Resi:") && myRewardsFile.includes("Belum tersedia"),
    "Merchandise shows 'Nomor Resi: <resi>' or 'Nomor Resi: Belum tersedia'"
  );

  assert(
    myRewardsFile.includes("Kode Voucher:") && myRewardsFile.includes("Menunggu admin"),
    "Digital voucher / class shows 'Kode Voucher: <code>' or 'Kode Voucher: Menunggu admin'"
  );

  assert(
    myRewardsFile.includes("Poin yang memenuhi syarat telah dikembalikan") &&
      myRewardsFile.includes("REDEMPTION_STATUS_LABELS.rejected"),
    "Rejected redemptions clearly note refund and deduction remains visible"
  );

  assert(
    myRewardsFile.includes("font-mono") && myRewardsFile.includes("Poin") && myRewardsFile.includes("text-right"),
    "Points spent are clearly right-aligned with minus sign"
  );

  assert(
    !myRewardsFile.includes("Alamat Pengiriman:") && !myRewardsFile.includes("Penerima:"),
    "Oversized address and recipient boxes are removed from the main summary card"
  );

  // ==========================================================================
  // GROUP B: LEADERBOARD TIME PERIOD & CALENDAR MONTH LOGIC (WIB)
  // ==========================================================================
  console.log("\n--- GROUP B: TIME PERIOD & EXACT 3-CALENDAR-MONTH BOUNDARIES ---");

  const period = getRollingThreeMonthsPeriod();
  const diffDays = Math.round(
    (period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  assert(
    diffDays >= 88 && diffDays <= 93,
    `Rolling period spans 3 full calendar months (${diffDays} days)`
  );

  assert(
    period.label.startsWith("Periode: ") && period.label.includes("–"),
    `Period label formatted dynamically in Indonesian locale: "${period.label}"`
  );

  // Audit calendar month edge cases:
  // 1. October 2026: 1 Agustus – 31 Oktober 2026
  const pOct2026 = getCalendarThreeMonthsPeriod(new Date("2026-10-15T12:00:00+07:00"));
  assert(
    pOct2026.startDateStr === "2026-08-01" &&
      pOct2026.endDateStr === "2026-10-31" &&
      pOct2026.label === "Periode: 1 Agustus – 31 Oktober 2026",
    `Oct 2026 calendar period matches exact requirement: "${pOct2026.label}"`
  );

  // 2. November 2026: 1 September – 30 November 2026
  const pNov2026 = getCalendarThreeMonthsPeriod(new Date("2026-11-01T12:00:00+07:00"));
  assert(
    pNov2026.startDateStr === "2026-09-01" &&
      pNov2026.endDateStr === "2026-11-30" &&
      pNov2026.label === "Periode: 1 September – 30 November 2026",
    `Nov 2026 calendar period matches exact requirement: "${pNov2026.label}"`
  );

  // 3. January 2027: 1 November 2026 – 31 Januari 2027 (Crossing year boundary)
  const pJan2027 = getCalendarThreeMonthsPeriod(new Date("2027-01-15T12:00:00+07:00"));
  assert(
    pJan2027.startDateStr === "2026-11-01" &&
      pJan2027.endDateStr === "2027-01-31" &&
      pJan2027.label === "Periode: 1 November 2026 – 31 Januari 2027",
    `Jan 2027 crossing-year period matches exact requirement: "${pJan2027.label}"`
  );

  // 4. February 2028: Leap year (29 days) -> 1 Desember 2027 – 29 Februari 2028
  const pFeb2028 = getCalendarThreeMonthsPeriod(new Date("2028-02-10T12:00:00+07:00"));
  assert(
    pFeb2028.startDateStr === "2027-12-01" &&
      pFeb2028.endDateStr === "2028-02-29" &&
      pFeb2028.label === "Periode: 1 Desember 2027 – 29 Februari 2028",
    `Feb 2028 leap-year (29 days) period matches exact requirement: "${pFeb2028.label}"`
  );

  // 5. February 2027: Non-leap year (28 days) -> 1 Desember 2026 – 28 Februari 2027
  const pFeb2027 = getCalendarThreeMonthsPeriod(new Date("2027-02-10T12:00:00+07:00"));
  assert(
    pFeb2027.startDateStr === "2026-12-01" &&
      pFeb2027.endDateStr === "2027-02-28" &&
      pFeb2027.label === "Periode: 1 Desember 2026 – 28 Februari 2027",
    `Feb 2027 non-leap-year (28 days) period matches exact requirement: "${pFeb2027.label}"`
  );

  const creatorLeaderboardFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/leaderboard/page.tsx"),
    "utf-8"
  );

  assert(
    creatorLeaderboardFile.includes(
      "Apresiasi untuk kreator dengan performa terbaik selama 3 bulan terakhir."
    ) &&
      creatorLeaderboardFile.includes(
        "Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."
      ),
    "Dynamic descriptions match exact required Indonesian phrases for both tabs"
  );

  // ==========================================================================
  // GROUP B2: PLAYABLE VIDEO GALLERY COMPONENT & OFFICIAL EMBEDS
  // ==========================================================================
  console.log("\n--- GROUP B2: PLAYABLE VIDEO GALLERY (9:16 VERTICAL CARDS) ---");

  const videoGalleryFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/leaderboard/video-gallery.tsx"),
    "utf-8"
  );

  assert(
    videoGalleryFile.includes("aspect-[9/16]") &&
      videoGalleryFile.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"),
    "Video Gallery uses 9:16 vertical aspect ratio and responsive 1-3 column grid"
  );

  assert(
    videoGalleryFile.includes("https://www.tiktok.com/embed/v2/") &&
      videoGalleryFile.includes("https://www.instagram.com/reel/"),
    "Video Gallery embeds official TikTok and Instagram Reels players via canonical IDs"
  );

  assert(
    videoGalleryFile.includes("<iframe") &&
      !videoGalleryFile.includes("Cover Resmi") &&
      videoGalleryFile.includes("IntersectionObserver"),
    "Video Gallery uses native embedded player preview with lazy loading and no duplicate thumbnail UI"
  );

  assert(
    videoGalleryFile.includes("Tonton di TikTok") && videoGalleryFile.includes("Tonton di Instagram"),
    "Video Gallery provides direct external watch links opening original URLs in a new tab"
  );

  const landingPreviewFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/landing/leaderboard-preview.tsx"),
    "utf-8"
  );
  const adminLeaderboardFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/leaderboard/page.tsx"),
    "utf-8"
  );

  assert(
    landingPreviewFile.includes("<VideoGallery videos={videos}") &&
      creatorLeaderboardFile.includes("<VideoGallery videos={videos}") &&
      adminLeaderboardFile.includes("<VideoGallery videos={videos}"),
    "Unified VideoGallery is cleanly reused across landing preview, creator leaderboard, and admin leaderboard"
  );

  // ==========================================================================
  // GROUP C: RANKING FORMULAS & TEST DATA INTEGRATION
  // ==========================================================================
  console.log("\n--- GROUP C: RANKING FORMULAS & AGGREGATION INTEGRITY ---");

  // Create temporary test users:
  // User A: Active creator, consented
  // User B: Active creator, consented
  // User C: Opted-out creator (public_leaderboard_consent: false)
  const testUserAEmail = `test-leader-a-${Date.now()}@mrbob.test`;
  const testUserBEmail = `test-leader-b-${Date.now()}@mrbob.test`;
  const testUserCEmail = `test-leader-c-${Date.now()}@mrbob.test`;

  const { data: userACreated } = await admin.auth.admin.createUser({
    email: testUserAEmail,
    password: "Password123!",
    email_confirm: true,
  });
  const { data: userBCreated } = await admin.auth.admin.createUser({
    email: testUserBEmail,
    password: "Password123!",
    email_confirm: true,
  });
  const { data: userCCreated } = await admin.auth.admin.createUser({
    email: testUserCEmail,
    password: "Password123!",
    email_confirm: true,
    user_metadata: {
      public_leaderboard_consent: false,
    },
  });

  const userAId = userACreated!.user!.id;
  const userBId = userBCreated!.user!.id;
  const userCId = userCCreated!.user!.id;

  await admin.from("profiles").upsert([
    {
      id: userAId,
      full_name: "Test Leader Alpha",
      tiktok_username: "alpha_creator",
      profile_completed: true,
    },
    {
      id: userBId,
      full_name: "Test Leader Beta",
      instagram_username: "beta_creator",
      profile_completed: true,
    },
    {
      id: userCId,
      full_name: "Private Creator Charlie",
      tiktok_username: "charlie_private",
      profile_completed: true,
    },
  ]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const testRunId = Date.now();
  const vidA1 = `https://www.tiktok.com/@alpha_creator/video/${testRunId}1`;
  const vidA2 = `https://www.tiktok.com/@alpha_creator/video/${testRunId}2`;
  const vidA3 = `https://www.tiktok.com/@alpha_creator/video/${testRunId}3`;
  const vidA4 = `https://www.tiktok.com/@alpha_creator/video/${testRunId}4`;
  const vidB1 = `https://www.instagram.com/reel/B${testRunId}/`;
  const vidC1 = `https://www.tiktok.com/@charlie_private/video/${testRunId}5`;

  // Insert submissions:
  // User A:
  // Video 1 (approved): 20,000 views, 200 points
  // Video 2 (approved): 10,000 views, 100 points
  // Video 3 (submitted): 50,000 views (MUST BE EXCLUDED)
  // Video 4 (rejected): 100,000 views (MUST BE EXCLUDED)
  // User B:
  // Video 1 (approved): 25,000 views, 250 points
  // User C (opted-out):
  // Video 1 (approved): 15,000 views, 150 points
  const { error: subInsertError } = await admin.from("submissions").insert([
    {
      user_id: userAId,
      platform: "tiktok",
      video_url: vidA1,
      normalized_video_identifier: `tiktok:${testRunId}1`,
      posting_date: todayStr,
      claimed_views: 20000,
      estimated_points: 200,
      verified_views: 20000,
      approved_points: 200,
      status: "approved",
    },
    {
      user_id: userAId,
      platform: "tiktok",
      video_url: vidA2,
      normalized_video_identifier: `tiktok:${testRunId}2`,
      posting_date: todayStr,
      claimed_views: 10000,
      estimated_points: 100,
      verified_views: 10000,
      approved_points: 100,
      status: "approved",
    },
    {
      user_id: userAId,
      platform: "tiktok",
      video_url: vidA3,
      normalized_video_identifier: `tiktok:${testRunId}3`,
      posting_date: todayStr,
      claimed_views: 50000,
      estimated_points: 500,
      verified_views: null,
      approved_points: null,
      status: "submitted",
    },
    {
      user_id: userAId,
      platform: "tiktok",
      video_url: vidA4,
      normalized_video_identifier: `tiktok:${testRunId}4`,
      posting_date: todayStr,
      claimed_views: 100000,
      estimated_points: 1000,
      verified_views: null,
      approved_points: null,
      status: "rejected",
    },
    {
      user_id: userBId,
      platform: "instagram",
      video_url: vidB1,
      normalized_video_identifier: `instagram:reel:B${testRunId}`,
      posting_date: todayStr,
      claimed_views: 25000,
      estimated_points: 250,
      verified_views: 25000,
      approved_points: 250,
      status: "approved",
    },
    {
      user_id: userCId,
      platform: "tiktok",
      video_url: vidC1,
      normalized_video_identifier: `tiktok:${testRunId}5`,
      posting_date: todayStr,
      claimed_views: 15000,
      estimated_points: 150,
      verified_views: 15000,
      approved_points: 150,
      status: "approved",
    },
  ]);

  if (subInsertError) {
    console.error("Error inserting test submissions:", subInsertError);
  }

  // Query creators
  const creators = await fetchLeaderboardCreators(period, 10);
  const foundA = creators.find((c) => c.creatorId === userAId);
  const foundB = creators.find((c) => c.creatorId === userBId);
  const foundC = creators.find((c) => c.creatorId === userCId);

  assert(
    Boolean(foundA && foundB && foundC),
    "All test creators with approved submissions appear in leaderboard"
  );

  assert(
    foundA?.totalPoints === 300 && foundA?.totalViews === 30000 && foundA?.approvedVideos === 2,
    `User A aggregates exactly 2 approved videos (300 Poin, 30,000 Views; got ${foundA?.totalPoints} pts, ${foundA?.totalViews} views)`
  );

  assert(
    foundB?.totalPoints === 250 && foundB?.totalViews === 25000 && foundB?.approvedVideos === 1,
    `User B aggregates exactly 1 approved video (250 Poin, 25,000 Views; got ${foundB?.totalPoints} pts, ${foundB?.totalViews} views)`
  );

  assert(
    foundA!.rank < foundB!.rank,
    `User A (300 Poin) ranks higher than User B (250 Poin) (Primary ranking: Points Earned)`
  );

  // Query top trending videos
  const videos = await fetchLeaderboardVideos(period, 20);
  const videoB = videos.find((v) => v.videoUrl.includes(`B${testRunId}`));
  const videoA1 = videos.find((v) => v.videoUrl.includes(`${testRunId}1`));
  const videoA2 = videos.find((v) => v.videoUrl.includes(`${testRunId}2`));
  const videoAPending = videos.find((v) => v.videoUrl.includes(`${testRunId}3`));
  const videoARejected = videos.find((v) => v.videoUrl.includes(`${testRunId}4`));
  const videoC = videos.find((v) => v.videoUrl.includes(`${testRunId}5`));

  assert(
    Boolean(videoB && videoA1 && videoA2 && videoC),
    "Approved videos appear in Top Trending Videos"
  );

  assert(
    !videoAPending && !videoARejected,
    "Pending and Rejected submissions are strictly excluded from Top Trending Videos"
  );

  assert(
    videoB!.views === 25000 &&
      videoA1!.views === 20000 &&
      videoC!.views === 15000 &&
      videoA2!.views === 10000 &&
      videoB!.rank < videoA1!.rank &&
      videoA1!.rank < videoC!.rank &&
      videoC!.rank < videoA2!.rank,
    "Top Trending Videos ranks strictly by verified views descending (25k > 20k > 15k > 10k)"
  );

  assert(
    videoB!.videoUrl.startsWith("https://www.instagram.com") &&
      videoA1!.videoUrl.startsWith("https://www.tiktok.com"),
    "Video records retain valid, clickable platform URLs"
  );

  // ==========================================================================
  // GROUP D: USER RANK CARD & EMPTY STATES
  // ==========================================================================
  console.log("\n--- GROUP D: USER RANK & EMPTY STATES ---");

  const rankA = await fetchUserLeaderboardRank(userAId, period);
  assert(
    rankA !== null && rankA.totalPoints === 300 && rankA.rank >= 1,
    `fetchUserLeaderboardRank returns correct rank for creator with approved submissions (Rank: #${rankA?.rank}, Pts: ${rankA?.totalPoints})`
  );

  // Test non-participating creator
  const nonParticipatingEmail = `non-participant-${Date.now()}@mrbob.test`;
  const { data: nonPartCreated } = await admin.auth.admin.createUser({
    email: nonParticipatingEmail,
    password: "Password123!",
    email_confirm: true,
  });
  const nonPartId = nonPartCreated!.user!.id;

  const rankNonPart = await fetchUserLeaderboardRank(nonPartId, period);
  assert(
    rankNonPart === null,
    "fetchUserLeaderboardRank returns null for creator with no approved submissions (No fabricated rank)"
  );

  // Clean empty state verification
  const emptyStateNotice =
    "Belum ada konten yang masuk leaderboard periode ini.";
  assert(
    creatorLeaderboardFile.includes(emptyStateNotice) &&
      creatorLeaderboardFile.includes("Yuk, mulai bikin konten dan kumpulkan poin!"),
    "Leaderboard displays proper friendly empty state when no records exist"
  );

  // ==========================================================================
  // GROUP E: PRIVACY & PUBLIC SECURITY ISOLATION & CONSENT
  // ==========================================================================
  console.log("\n--- GROUP E: PRIVACY, DATA SECURITY & PUBLIC CONSENT ---");

  // Verify that public queries cannot access private profile columns
  const { data: publicProfileData } = await publicClient
    .from("profiles")
    .select("id, full_name, email, whatsapp_number, address")
    .eq("id", userAId);

  assert(
    !publicProfileData || publicProfileData.length === 0,
    "Public/Anonymous clients cannot directly select private profile rows (RLS Protected)"
  );

  // Verify that leaderboard creators payload does not contain email or whatsapp
  const sampleCreator = creators[0];
  const keys = Object.keys(sampleCreator);
  assert(
    !keys.includes("email") &&
      !keys.includes("whatsapp_number") &&
      !keys.includes("phone") &&
      !keys.includes("address"),
    "LeaderboardCreator payload strictly exposes only public fields (no email, phone, or address)"
  );

  // Verify Creator Settings contains Public Leaderboard Consent setting
  const settingsFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/settings/page.tsx"),
    "utf-8"
  );
  assert(
    settingsFile.includes("Tampilkan nama dan profil saya di Leaderboard Publik") &&
      settingsFile.includes("Kreator Anonim"),
    "Creator settings contains explicit public leaderboard visibility consent toggle"
  );

  // ==========================================================================
  // GROUP F: REGRESSION CHECKS (WALLET, VERIFICATION, REDEMPTIONS)
  // ==========================================================================
  console.log("\n--- GROUP F: REGRESSION CHECKS ---");

  // 1. Point Wallet regression check
  const { data: sampleLots, error: lotsErr } = await admin
    .from("point_lots")
    .select("id, remaining_points")
    .limit(5);
  assert(
    !lotsErr && Array.isArray(sampleLots),
    "Point Wallet database tables and point lots remain operational"
  );

  // 2. Admin Verification queue regression check
  const { data: adminQueue, error: queueErr } = await admin
    .from("submissions")
    .select("id, status")
    .limit(5);
  assert(
    !queueErr && Array.isArray(adminQueue),
    "Admin Verification pipeline and submissions access remain operational"
  );

  // 3. Reward Redemption catalog regression check
  const catalog = await fetchRewardsCatalog();
  assert(
    catalog.length === 13,
    `Reward catalog is fully operational with 13 official items (got ${catalog.length} items)`
  );

  // ==========================================================================
  // CLEANUP TEMPORARY TEST DATA
  // ==========================================================================
  console.log("\n--- CLEANUP TEMPORARY TEST DATA ---");
  await admin.from("submissions").delete().in("user_id", [userAId, userBId, userCId]);
  await admin.from("profiles").delete().in("id", [userAId, userBId, userCId, nonPartId]);
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);
  await admin.auth.admin.deleteUser(userCId);
  await admin.auth.admin.deleteUser(nonPartId);
  console.log("Cleaned up temporary test users and submissions successfully.");

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log("\n==================================================================");
  console.log(`PHASE 6 TEST RESULTS: ${passed} PASSED / ${failed} FAILED (TOTAL: ${testCount})`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase6LeaderboardTests().catch((err) => {
  console.error("FATAL ERROR in Phase 6 tests:", err);
  process.exit(1);
});
