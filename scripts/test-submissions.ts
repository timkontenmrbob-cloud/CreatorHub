import { normalizeVideoUrl } from "../src/lib/video-url";
import { calculatePointsFromViews } from "../src/lib/utils";

async function runTests() {
  console.log("=================================================");
  console.log("MR.BOB CREATOR HUB — PHASE 3 SUBMISSION TEST SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Video URL Normalization & Validation
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: URL Normalization & Anti-Duplication ---");

  // TikTok Desktop
  const ttDesktop = normalizeVideoUrl("https://www.tiktok.com/@mr.bobkampunginggris/video/7339182910283746561?is_from_webapp=1&sender_device=pc");
  assert(ttDesktop.isValid, "TikTok Desktop valid");
  assert(ttDesktop.data?.platform === "tiktok", "TikTok platform detected");
  assert(ttDesktop.data?.normalizedIdentifier === "tiktok:7339182910283746561", "TikTok canonical ID extracted");
  assert(!ttDesktop.data?.cleanUrl.includes("is_from_webapp"), "TikTok tracking params stripped");

  // TikTok Shortlink
  const ttShort = normalizeVideoUrl("https://vt.tiktok.com/ZSjX9988a/");
  assert(ttShort.isValid, "TikTok Shortlink valid");
  assert(ttShort.data?.normalizedIdentifier === "tiktok:short:ZSjX9988a", "TikTok short canonical ID extracted");

  // TikTok Mobile Web
  const ttMobile = normalizeVideoUrl("https://m.tiktok.com/v/7339182910283746561.html");
  assert(ttMobile.isValid, "TikTok Mobile Web valid");
  assert(ttMobile.data?.normalizedIdentifier === "tiktok:7339182910283746561", "TikTok Mobile ID matches Desktop ID");

  // Instagram Reel
  const igReel = normalizeVideoUrl("https://www.instagram.com/reel/C8xYz123456/?igsh=MWQxMTJ4NWlrbmRveA==");
  assert(igReel.isValid, "Instagram Reel valid");
  assert(igReel.data?.platform === "instagram", "Instagram platform detected");
  assert(igReel.data?.normalizedIdentifier === "instagram:reel:C8xYz123456", "IG Reel canonical shortcode extracted");
  assert(!igReel.data?.cleanUrl.includes("igsh"), "IG tracking params stripped");

  // Instagram Post (Video)
  const igPost = normalizeVideoUrl("https://instagram.com/p/C8xYz123456/");
  assert(igPost.isValid, "Instagram Post URL valid");
  assert(igPost.data?.normalizedIdentifier === "instagram:reel:C8xYz123456", "IG Post normalized to same ID as Reel");

  // Invalid URLs
  const ytUrl = normalizeVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert(!ytUrl.isValid, "YouTube URL rejected");

  const randomUrl = normalizeVideoUrl("https://google.com");
  assert(!randomUrl.isValid, "Non-video URL rejected");

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Smart Submission Window (30-Day Calendar Rule)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Smart Submission Window (30-Day Rule) ---");

  // Helper matching the server-side window logic
  function checkWindow(postingDateStr: string) {
    const pDate = new Date(postingDateStr + "T00:00:00+07:00");
    const now = new Date();
    if (isNaN(pDate.getTime())) return { valid: false, reason: "invalid_date" };
    if (pDate.getTime() > now.getTime()) return { valid: false, reason: "future_date" };

    // End of Day 30 is posting date + 29 days at 23:59:59.999 WIB
    const deadline = new Date(pDate.getTime() + 29 * 24 * 60 * 60 * 1000);
    deadline.setHours(23, 59, 59, 999);

    const diffMs = deadline.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));

    if (diffMs <= 0) {
      return { valid: false, reason: "expired", daysRemaining: 0 };
    }
    return { valid: true, daysRemaining, deadline: deadline.toISOString() };
  }

  // Today (Day 1)
  const todayStr = new Date().toISOString().split("T")[0];
  const todayResult = checkWindow(todayStr);
  assert(todayResult.valid, "Posting date today is eligible (Day 1)");
  assert(todayResult.daysRemaining !== undefined && todayResult.daysRemaining >= 29, "Day 1 has ~30 days remaining");

  // 15 days ago
  const date15DaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const res15 = checkWindow(date15DaysAgo);
  assert(res15.valid, "Posting date 15 days ago is eligible");
  assert(res15.daysRemaining !== undefined && res15.daysRemaining >= 14 && res15.daysRemaining <= 16, "Day 16 has ~14-15 days remaining");

  // 35 days ago (Expired)
  const date35DaysAgo = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const res35 = checkWindow(date35DaysAgo);
  assert(!res35.valid, "Posting date 35 days ago is expired");
  assert(res35.reason === "expired", "Expired reason correctly assigned");

  // Tomorrow (Future date)
  const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const resTomorrow = checkWindow(tomorrow);
  assert(!resTomorrow.valid, "Future posting date is rejected");
  assert(resTomorrow.reason === "future_date", "Future date reason correctly assigned");

  // --------------------------------------------------------------------------
  // TEST GROUP 3: View-to-Point Conversion Formula
  // --------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: View-to-Point Conversion Formula ---");

  assert(calculatePointsFromViews(0) === 0, "0 views = 0 points");
  assert(calculatePointsFromViews(99) === 0, "99 views = 0 points (floor rule)");
  assert(calculatePointsFromViews(100) === 1, "100 views = 1 point");
  assert(calculatePointsFromViews(199) === 1, "199 views = 1 point");
  assert(calculatePointsFromViews(1250) === 12, "1,250 views = 12 points");
  assert(calculatePointsFromViews(10000) === 100, "10,000 views = 100 points");
  assert(calculatePointsFromViews(50000) === 500, "50,000 views = 500 points");

  // Summary
  console.log("\n=================================================");
  console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
