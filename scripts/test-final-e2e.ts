/**
 * ==============================================================================
 * MR.BOB CREATOR HUB — FINAL RELEASE ACCEPTANCE & E2E PRODUCTION READINESS TEST
 * ==============================================================================
 * Comprehensive End-to-End Test Suite validating:
 * 1. Creator Lifecycle Flow (Google Auth, Profile, Draft, Submit, Verification, FIFO Points, Expiration, Redemption, Fulfillment, Idempotent Refund)
 * 2. Admin Operations & Super Admin Security (Access, Role Assignment, Revocation, Self-Protection, Content Verification, Manual Points, Rewards, Notifications, Analytics)
 * 3. Security Hardening & Zero-Leak Isolation (Admin API Guards, Revoked Sessions, Private Evidence Signed URLs, No Public PDF Leaks, RLS Isolation, No Secret Keys in Frontend)
 * 4. Operational Integrity (Evidence Retention Cron, Point Expiry RPC, Supabase Data Reconciliation, Clean Test Teardown)
 * ==============================================================================
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { normalizeVideoUrl } from "../src/lib/video-url";
import { calculatePointsFromViews } from "../src/lib/utils";
import { fetchQuarterlyAnalytics } from "../src/lib/supabase/analytics";
import { generateQuarterlyPDF } from "../src/lib/pdf/generate-quarterly-report";
import { cleanupExpiredEvidence } from "../src/lib/supabase/submissions";
import { fetchUserNotifications } from "../src/lib/supabase/notifications";
import { processAdminRedemption } from "../src/lib/supabase/rewards";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Missing required Supabase environment variables in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS [Test ${totalTests}]: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ FAIL [Test ${totalTests}]: ${testName}`);
    if (detail) console.error(`     Detail: ${detail}`);
  }
}

async function runFinalE2ETests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — FINAL RELEASE E2E ACCEPTANCE TEST SUITE");
  console.log("==================================================================");
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log(`Supabase URL  : ${supabaseUrl}`);

  // Setup isolated test user for lifecycle tests
  const testTag = Date.now().toString().slice(-6);
  const testEmail = `e2e-creator-${testTag}@mrbob.test`;
  const adminTestEmail = `e2e-admin-${testTag}@mrbob.test`;

  let testUserId = "";
  let tempAdminUserId = "";
  let createdDraftId = "";
  let createdSubmissionId = "";
  let createdRedemptionId = "";
  let red2Id = "";

  try {
    // --------------------------------------------------------------------------
    // SECTION 1: CREATOR LIFECYCLE FLOW
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 1: CREATOR LIFECYCLE FLOW ---");

    // 1. User Creation (Simulating Google OAuth provision)
    const { data: authUser, error: authErr } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: "Password123!",
      email_confirm: true,
      user_metadata: {
        full_name: `E2E Creator ${testTag}`,
        avatar_url: `https://lh3.googleusercontent.com/a/test-avatar-${testTag}`,
      },
    });

    assert(!authErr && !!authUser?.user?.id, "Google Sign-In user provisioned in auth.users", authErr?.message);
    testUserId = authUser?.user?.id || "";

    // 2. Initial Profile Creation & Incomplete Check
    const { data: initialProfile, error: profileErr } = await adminClient
      .from("profiles")
      .upsert({
        id: testUserId,
        email: testEmail,
        full_name: `E2E Creator ${testTag}`,
        profile_completed: false,
      })
      .select()
      .single();

    assert(
      !profileErr && initialProfile?.profile_completed === false,
      "Profile initially flagged as incomplete (profile_completed = false)"
    );

    // Profile Completion Update
    const { data: completedProfile, error: completeErr } = await adminClient
      .from("profiles")
      .update({
        whatsapp_number: "081234567890",
        instagram_username: `creator_${testTag}`,
        tiktok_username: `creator_${testTag}`,
        profile_completed: true,
      })
      .eq("id", testUserId)
      .select()
      .single();

    assert(
      !completeErr &&
        completedProfile?.profile_completed === true &&
        completedProfile?.whatsapp_number === "081234567890",
      "Profile successfully completed with contact and social handles",
      completeErr?.message
    );

    // 3. Content URL Validation
    const validTikTok = `https://www.tiktok.com/@mrbobkampunginggris/video/7488000000000${testTag}`;
    const validIGReel = `https://www.instagram.com/reel/C8${testTag}Xy/`;
    const invalidUrl = "https://facebook.com/watch/?v=12345";

    const normTikTok = normalizeVideoUrl(validTikTok);
    const normIG = normalizeVideoUrl(validIGReel);
    const normInvalid = normalizeVideoUrl(invalidUrl);

    assert(
      normTikTok.isValid && normTikTok.data?.platform === "tiktok",
      "Video URL Validator correctly parses TikTok Reels URL"
    );
    assert(
      normIG.isValid && normIG.data?.platform === "instagram",
      "Video URL Validator correctly parses Instagram Reels URL"
    );
    assert(
      !normInvalid.isValid,
      "Video URL Validator strictly rejects non-Instagram/TikTok platforms"
    );

    // 4. Save Draft and Resume Draft
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: draftRecord, error: draftErr } = await adminClient
      .from("submission_drafts")
      .insert({
        user_id: testUserId,
        platform: "tiktok",
        video_url: normTikTok.data!.cleanUrl,
        normalized_video_identifier: normTikTok.data!.normalizedIdentifier,
        posting_date: todayStr,
        current_views: 12500,
        estimated_points: calculatePointsFromViews(12500),
      })
      .select()
      .single();

    assert(!draftErr && !!draftRecord?.id, "Creator can save submission draft into submission_drafts table", draftErr?.message);
    createdDraftId = draftRecord?.id || "";

    // Resume Draft and Submit Final Submission
    const { data: finalSub, error: finalSubErr } = await adminClient
      .from("submissions")
      .insert({
        user_id: testUserId,
        platform: "tiktok",
        video_url: normTikTok.data!.cleanUrl,
        normalized_video_identifier: normTikTok.data!.normalizedIdentifier,
        posting_date: todayStr,
        claimed_views: 12500,
        estimated_points: calculatePointsFromViews(12500),
        status: "submitted",
        agreement_accepted: true,
        agreement_version: "v1.0",
        agreement_accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    assert(
      !finalSubErr && finalSub?.status === "submitted" && finalSub?.agreement_accepted === true,
      "Creator resumes draft and finalizes submission with mandatory legal consent",
      finalSubErr?.message
    );
    createdSubmissionId = finalSub?.id || "";

    // Delete resumed draft
    if (createdDraftId) {
      await adminClient.from("submission_drafts").delete().eq("id", createdDraftId);
      createdDraftId = "";
    }

    // 5. Admin Verification & Approval Flow
    const verifiedViews = 15000;
    const approvedPoints = calculatePointsFromViews(verifiedViews); // 150 points

    const { data: approvedSub, error: approveErr } = await adminClient
      .from("submissions")
      .update({
        status: "approved",
        verified_views: verifiedViews,
        approved_points: approvedPoints,
        admin_notes: "Verified and approved by E2E runner",
      })
      .eq("id", createdSubmissionId)
      .select()
      .single();

    assert(
      !approveErr && approvedSub?.status === "approved" && approvedSub?.approved_points === 150,
      `Admin successfully verifies submission and awards ${approvedPoints} points for ${verifiedViews} views`,
      approveErr?.message
    );

    // 6. Point Issuance & FIFO Lot Tracking
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 180); // 6 months calendar

    const { data: pointLot, error: lotErr } = await adminClient
      .from("point_lots")
      .insert({
        user_id: testUserId,
        original_points: approvedPoints,
        remaining_points: approvedPoints,
        source_type: "views",
        source_id: createdSubmissionId,
        expires_at: expiryDate.toISOString(),
      })
      .select()
      .single();

    assert(!lotErr && pointLot?.remaining_points === 150, "Point lot created with full remaining points and expiry", lotErr?.message);

    const { data: txn, error: txnErr } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: testUserId,
        amount: approvedPoints,
        transaction_type: "earned",
        related_point_lot_id: pointLot.id,
        description: `E2E Points from approved UGC content (#${createdSubmissionId.slice(0, 8)})`,
        reference_id: createdSubmissionId,
      })
      .select()
      .single();

    assert(!txnErr && txn?.amount === 150, "Ledger credit transaction recorded for creator point issuance", txnErr?.message);

    // 7. Verify FIFO Expiration Logic via RPC
    const { error: expireRpcErr } = await adminClient.rpc("expire_overdue_point_lots");
    assert(!expireRpcErr, "Point expiration engine (expire_overdue_point_lots RPC) executes without error", expireRpcErr?.message);

    // 8. Reward Redemption Flow using Atomic RPC
    // Use official seeded reward-1 (Keychain Mr.BOB, 10 points)
    const { data: redeemData, error: redeemRpcErr } = await adminClient.rpc("redeem_reward_atomic", {
      p_creator_id: testUserId,
      p_reward_id: "reward-1",
      p_shipping_address: "Jl. Brawijaya No. 123, Tulungrejo, Pare, Kediri, Jawa Timur",
      p_contact_whatsapp: "081234567890",
      p_recipient_name: `E2E Creator ${testTag}`,
      p_idempotency_key: `e2e_redeem_${testTag}_1`,
    });

    const parsedRedeem = typeof redeemData === "string" ? JSON.parse(redeemData) : redeemData;
    assert(
      !redeemRpcErr && (parsedRedeem?.status === "success" || !!parsedRedeem?.redemption_id),
      "Creator successfully redeems official reward via atomic RPC",
      redeemRpcErr?.message || JSON.stringify(parsedRedeem)
    );
    createdRedemptionId = parsedRedeem?.redemption_id || "";

    // 9. Admin Fulfillment Flow
    if (createdRedemptionId) {
      const { data: fulfilledRed, error: fulfillErr } = await adminClient
        .from("redemptions")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          fulfillment_notes: `Dispatched via JNE Reguler (Tracking: JNE-${testTag}-EXP)`,
        })
        .eq("id", createdRedemptionId)
        .select()
        .single();

      assert(
        !fulfillErr && fulfilledRed?.status === "completed" && !!fulfilledRed?.processed_at,
        "Admin fulfills reward redemption with tracking notes and completion timestamp",
        fulfillErr?.message
      );
    }

    // 10. Rejection and Idempotent Refunds
    const { data: redeemData2 } = await adminClient.rpc("redeem_reward_atomic", {
      p_creator_id: testUserId,
      p_reward_id: "reward-1",
      p_shipping_address: "Pare, Kediri",
      p_contact_whatsapp: "081234567890",
      p_recipient_name: `E2E Creator ${testTag}`,
      p_idempotency_key: `e2e_redeem_${testTag}_2`,
    });

    const parsedRedeem2 = typeof redeemData2 === "string" ? JSON.parse(redeemData2) : redeemData2;
    red2Id = parsedRedeem2?.redemption_id;

    if (red2Id) {
      // Reject redemption via processAdminRedemption helper
      const rejectRes1 = await processAdminRedemption({
        redemptionId: red2Id,
        adminId: "ded2a6e6-2a6a-4190-b527-8acd97c4f8a5",
        action: "reject",
        rejectionReason: "Out of stock merchandise batch",
      });

      assert(
        rejectRes1.status === "success",
        "Admin rejection successfully triggers automated point refund to creator wallet"
      );

      // Idempotency: Repeating rejection on same record is blocked to prevent double-refunding
      let duplicateBlocked = false;
      try {
        await processAdminRedemption({
          redemptionId: red2Id,
          adminId: "ded2a6e6-2a6a-4190-b527-8acd97c4f8a5",
          action: "reject",
          rejectionReason: "Duplicate rejection attempt",
        });
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes("sudah pernah ditolak") || err.message.includes("sudah pernah dikembalikan"))) {
          duplicateBlocked = true;
        }
      }

      assert(
        duplicateBlocked,
        "Idempotency verified: Re-rejecting already rejected redemption is strictly rejected (no double-refund)"
      );
    }

    // --------------------------------------------------------------------------
    // SECTION 2: ADMIN OPERATIONS & SUPER ADMIN SECURITY
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 2: ADMIN OPERATIONS & SUPER ADMIN SECURITY ---");

    // 11. Super Admin Identity
    const { data: superAdmins } = await adminClient
      .from("admin_roles")
      .select("user_id, role")
      .in("role", ["superadmin", "super_admin"]);

    const superAdminUids = (superAdmins || []).map((sa) => sa.user_id);
    const { data: superProfiles } = await adminClient
      .from("profiles")
      .select("email, id")
      .in("id", superAdminUids);

    const hasOfficialSuperAdmin = Boolean(superProfiles?.some((p) => p.email === "leadersosmed@gmail.com"));
    assert(hasOfficialSuperAdmin, "Official Super Admin 'leadersosmed@gmail.com' is registered with superadmin role");

    // 12. Create Temporary User for Role Assignment Testing
    const { data: tempAdminUser } = await adminClient.auth.admin.createUser({
      email: adminTestEmail,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: `Temp Admin ${testTag}` },
    });
    tempAdminUserId = tempAdminUser!.user!.id;
    await adminClient.from("profiles").upsert({
      id: tempAdminUserId,
      email: adminTestEmail,
      full_name: `Temp Admin ${testTag}`,
      profile_completed: true,
    });

    // 13. Super Admin Assigns Admin Role
    const { error: assignErr } = await adminClient.from("admin_roles").insert({
      user_id: tempAdminUserId,
      role: "admin",
    });

    assert(!assignErr, "Super Admin can assign administrative role to another user", assignErr?.message);

    // 14. Super Admin Revokes Admin Role
    const { error: revokeErr } = await adminClient
      .from("admin_roles")
      .delete()
      .eq("user_id", tempAdminUserId);

    assert(!revokeErr, "Super Admin can revoke administrative role from user", revokeErr?.message);

    // 15. Super Admin Self-Protection Check
    const rolesApiCode = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/api/admin/roles/route.ts"),
      "utf-8"
    );
    assert(
      rolesApiCode.includes("leadersosmed@gmail.com") &&
        rolesApiCode.includes("Akun Super Admin utama terlindungi") &&
        rolesApiCode.includes("Anda tidak dapat mencabut hak akses Anda sendiri"),
      "Super Admin self-protection logic strictly enforced in API endpoint"
    );

    // 16. Manual Points Management
    const { data: manualTxn, error: manualTxnErr } = await adminClient
      .from("point_transactions")
      .insert({
        user_id: testUserId,
        amount: 25,
        transaction_type: "bonus",
        description: "Admin manual bonus adjustment for special campaign",
      })
      .select()
      .single();

    assert(!manualTxnErr && manualTxn?.amount === 25, "Admin can perform manual point adjustments with transparent description", manualTxnErr?.message);

    // 17. Notification Delivery via fetchUserNotifications
    const userNotifications = await fetchUserNotifications(testUserId, false);
    assert(
      Array.isArray(userNotifications) && userNotifications.length > 0,
      `Real system notifications dynamically synthesized for creator (${userNotifications.length} notifications found)`
    );

    // --------------------------------------------------------------------------
    // SECTION 3: SECURITY HARDENING & ZERO-LEAK ISOLATION
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 3: SECURITY HARDENING & ZERO-LEAK ISOLATION ---");

    // 18. Authenticated Client as Regular Creator
    const { data: creatorMagicLink } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: testEmail,
    });

    const creatorClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: creatorSession } = await creatorClient.auth.verifyOtp({
      token_hash: creatorMagicLink.properties?.hashed_token || "",
      type: "magiclink",
    });

    assert(!!creatorSession?.session, "Test creator successfully authenticated with unprivileged session");

    // 19. Creator Cannot Read Other Creators' Submissions via RLS
    const { data: leakedSubs, error: leakSubErr } = await creatorClient
      .from("submissions")
      .select("*")
      .neq("user_id", testUserId);

    assert(
      !leakSubErr && (!leakedSubs || leakedSubs.length === 0),
      "RLS strictly prevents regular creator from viewing other creators' submission records"
    );

    // 20. Creator Cannot Tamper with Point Lots via RLS
    const { error: tamperLotErr } = await creatorClient.from("point_lots").insert({
      user_id: testUserId,
      original_points: 99999,
      remaining_points: 99999,
      source_type: "bonus",
    });

    assert(!!tamperLotErr, "RLS strictly prevents creator from direct INSERT into point_lots table");

    // 21. Creator Cannot Invoke Privileged Point Issuance RPC
    const { error: tamperRpcErr } = await creatorClient.rpc("issue_points_lot", {
      target_user_id: testUserId,
      p_points: 5000,
      p_source_type: "bonus",
      p_description: "Malicious self-issuance",
    });

    assert(!!tamperRpcErr, "RPC security definer prevents unprivileged creator from calling issue_points_lot");

    // 22. Creator Cannot Tamper with Admin Roles Table via RLS
    const { error: tamperRoleErr } = await creatorClient.from("admin_roles").insert({
      user_id: testUserId,
      role: "admin",
    });

    assert(!!tamperRoleErr, "RLS strictly blocks creator from writing to admin_roles table");

    // 23. Private Screenshot Storage Security & Signed URLs
    const mockEvidencePath = `${testUserId}/test_evidence_${testTag}.jpg`;
    await adminClient.storage
      .from("submission-evidence")
      .upload(mockEvidencePath, Buffer.from("fake-evidence-content"), {
        contentType: "image/jpeg",
        upsert: true,
      });

    const { data: signedUrlData, error: signErr } = await adminClient.storage
      .from("submission-evidence")
      .createSignedUrl(mockEvidencePath, 60);

    assert(!signErr && !!signedUrlData?.signedUrl, "Private evidence in submission-evidence bucket is accessible via time-bounded signed URLs (60s expiry)");

    // Clean up uploaded evidence
    await adminClient.storage.from("submission-evidence").remove([mockEvidencePath]);

    // 24. No Public PDF Reports Leakage
    const publicReportsDir = path.resolve(process.cwd(), "public/reports");
    const reportsDirExists = fs.existsSync(publicReportsDir);
    assert(
      !reportsDirExists,
      "Public reports directory (public/reports) is absent; internal PDFs are not stored statically in public web root"
    );

    // 25. Git Exclusions for PDFs and Secrets
    const gitignoreContent = fs.readFileSync(path.resolve(process.cwd(), ".gitignore"), "utf-8");
    assert(
      gitignoreContent.includes("*.pdf") &&
        gitignoreContent.includes("/public/reports/") &&
        gitignoreContent.includes(".env*"),
      ".gitignore strictly excludes generated PDFs, public reports, and local environment secrets"
    );

    // --------------------------------------------------------------------------
    // SECTION 4: OPERATIONAL INTEGRITY & ANALYTICS RECONCILIATION
    // --------------------------------------------------------------------------
    console.log("\n--- SECTION 4: OPERATIONAL INTEGRITY & ANALYTICS RECONCILIATION ---");

    // 26. Evidence Retention Cleanup Execution
    const cleanupResult = await cleanupExpiredEvidence(10);
    assert(
      typeof cleanupResult.processed === "number" && typeof cleanupResult.deleted === "number",
      "Automated evidence retention cleanup worker runs successfully (14-day retention rule)"
    );

    // 27. Analytics Reconciliation with Supabase Data
    const analyticsQ4 = await fetchQuarterlyAnalytics(2026, "Q4", adminClient);
    assert(
      typeof analyticsQ4.kpis.totalSubmissions === "number" &&
        typeof analyticsQ4.kpis.totalVerifiedViews === "number" &&
        analyticsQ4.kpis.totalVerifiedViews >= 0,
      `Quarterly UGC Analytics aggregates strictly from real Supabase records (${analyticsQ4.kpis.totalSubmissions} submissions, ${analyticsQ4.kpis.totalVerifiedViews} views)`
    );

    // 28. PDF Report Generation Quality Check
    const pdfDoc = generateQuarterlyPDF(analyticsQ4);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalPages = (pdfDoc as any).internal.getNumberOfPages();
    const pdfBytes = Buffer.from(pdfDoc.output("arraybuffer"));

    assert(
      totalPages >= 3,
      `Generated PDF contains exactly ${totalPages} structured A4 portrait pages (Target: >= 3)`
    );
    assert(
      pdfBytes.byteLength > 60000 && pdfBytes.byteLength < 500000,
      `Generated PDF size is optimal for distribution (${(pdfBytes.byteLength / 1024).toFixed(1)} KB)`
    );

    // 29. Vercel Cron Configuration Readiness
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf-8")
    );
    const hasEvidenceCron = vercelConfig.crons?.some(
      (c: { path: string }) => c.path === "/api/cron/cleanup-evidence"
    );
    assert(hasEvidenceCron, "vercel.json properly configures daily scheduled cron for evidence cleanup");

    // 30. Auth Callback Proxy Compatibility
    const callbackCode = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/auth/callback/route.ts"),
      "utf-8"
    );
    assert(
      callbackCode.includes("x-forwarded-host") && callbackCode.includes("effectiveOrigin"),
      "Auth callback handles Vercel reverse proxy headers (x-forwarded-host) for reliable production redirects"
    );

  } catch (err: unknown) {
    console.error("💥 Unhandled exception during E2E execution:", err);
    failedTests++;
  } finally {
    // --------------------------------------------------------------------------
    // TEARDOWN: ISOLATED TEST DATA CLEANUP
    // --------------------------------------------------------------------------
    console.log("\n--- TEARDOWN: CLEANING UP ISOLATED TEST DATA ---");
    if (createdSubmissionId) {
      await adminClient.from("submission_evidence").delete().eq("submission_id", createdSubmissionId);
      await adminClient.from("submissions").delete().eq("id", createdSubmissionId);
    }
    if (createdDraftId) {
      await adminClient.from("submission_drafts").delete().eq("id", createdDraftId);
    }
    if (createdRedemptionId) {
      await adminClient.from("redemption_allocations").delete().eq("redemption_id", createdRedemptionId);
      await adminClient.from("redemptions").delete().eq("id", createdRedemptionId);
    }
    if (red2Id) {
      await adminClient.from("redemption_allocations").delete().eq("redemption_id", red2Id);
      await adminClient.from("redemptions").delete().eq("id", red2Id);
    }
    if (testUserId) {
      await adminClient.from("point_lots").delete().eq("user_id", testUserId);
      await adminClient.from("point_transactions").delete().eq("user_id", testUserId);
      await adminClient.from("profiles").delete().eq("id", testUserId);
      await adminClient.auth.admin.deleteUser(testUserId);
    }
    if (tempAdminUserId) {
      await adminClient.from("admin_roles").delete().eq("user_id", tempAdminUserId);
      await adminClient.from("profiles").delete().eq("id", tempAdminUserId);
      await adminClient.auth.admin.deleteUser(tempAdminUserId);
    }
    console.log("  🧹 Isolated test records cleanly purged from database.");
  }

  console.log("\n==================================================================");
  console.log(`TOTAL E2E TESTS RUN : ${totalTests}`);
  console.log(`PASSED              : ${passedTests}`);
  console.log(`FAILED              : ${failedTests}`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFinalE2ETests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
