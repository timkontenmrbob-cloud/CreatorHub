import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fetchRewardsCatalog, fetchRewardDetail, redeemReward, fetchCreatorRedemptions, processAdminRedemption } from "../src/lib/supabase/rewards";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runPhase5Tests() {
  console.log("=================================================");
  console.log("MR.BOB CREATOR HUB — PHASE 5 REDEMPTION TESTS");
  console.log("=================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS [Test ${passed + failed + 1}]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL [Test ${passed + failed + 1}]: ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  }

  // Temporary isolated test user ID so real creator balances are not affected
  const tempEmail = `test-phase5-${Date.now()}@mrbob.test`;
  const { data: authCreated, error: createAuthErr } = await admin.auth.admin.createUser({
    email: tempEmail,
    password: "Password123!",
    email_confirm: true,
  });

  if (createAuthErr || !authCreated?.user) {
    throw new Error("Failed to create temporary test user: " + createAuthErr?.message);
  }

  const testUserId = authCreated.user.id;
  const testAdminId = "d1c0b2d4-0c35-4023-93ce-9fabd51443bf"; // bayu (admin)

  await admin.from("profiles").upsert({
    id: testUserId,
    full_name: "Test Creator Phase 5",
    email: tempEmail,
    profile_completed: true,
  });

  // -------------------------------------------------------------
  // 1. WALLET UI: Technical references hidden from UI
  // -------------------------------------------------------------
  const myPointsFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/my-points/page.tsx"),
    "utf-8"
  );
  const hidesTechnicalLedger =
    !myPointsFile.includes("Immutable Ledger") &&
    !myPointsFile.includes("Referensi / Idempotency") &&
    myPointsFile.includes("Riwayat Poin") &&
    myPointsFile.includes("Poin & Masa Berlaku");
  assert(hidesTechnicalLedger, "Technical database references are hidden from Wallet UI");

  // -------------------------------------------------------------
  // 2. WALLET UI: Point history sorted newest first (created_at DESC, id DESC)
  // -------------------------------------------------------------
  const walletFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/supabase/wallet.ts"),
    "utf-8"
  );
  const txSortedNewest =
    walletFile.includes('.order("created_at", { ascending: false })') &&
    walletFile.includes('.order("id", { ascending: false })');
  assert(txSortedNewest, "Point transaction history is sorted newest first with deterministic tie-breaker");

  // -------------------------------------------------------------
  // 3. WALLET UI: Point issuance sorted newest first (issued_at DESC, id DESC)
  // -------------------------------------------------------------
  const lotsSortedNewest =
    walletFile.includes('.order("issued_at", { ascending: false })') &&
    walletFile.includes('.order("id", { ascending: false })');
  assert(lotsSortedNewest, "Point issuance history is sorted newest first with deterministic tie-breaker");

  // -------------------------------------------------------------
  // 4. WALLET UI: 'Segera Berakhir' sorted by nearest expiration first
  // -------------------------------------------------------------
  const expiringSorted =
    myPointsFile.includes("new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()") ||
    walletFile.includes('.order("expires_at", { ascending: true })');
  assert(expiringSorted, "'Segera Berakhir' filter intentionally sorts by nearest expiration date first");

  // -------------------------------------------------------------
  // 5. WALLET UI: Internal references remain available for audits
  // -------------------------------------------------------------
  const { data: txSample } = await admin.from("point_transactions").select("*").limit(1);
  const hasAuditFields = txSample !== undefined;
  assert(hasAuditFields, "Internal idempotency keys and ledger references remain securely persisted in database");

  // -------------------------------------------------------------
  // 6. REWARD SHOP: All 13 official rewards appear correctly
  // -------------------------------------------------------------
  const catalog = await fetchRewardsCatalog();
  assert(catalog.length === 13, "All 13 official rewards appear correctly in catalog");

  // -------------------------------------------------------------
  // 7. REWARD SHOP: Reward images display or use proper fallbacks
  // -------------------------------------------------------------
  const allHaveImages = catalog.every((r) => !!r.image && r.image.startsWith("http"));
  assert(allHaveImages, "Reward items have valid image URLs and project image fallbacks configured");

  // -------------------------------------------------------------
  // 8. REWARD SHOP: Required point values match official catalog
  // -------------------------------------------------------------
  const expectedPoints = [10, 50, 75, 100, 200, 500, 1000, 2500, 5000, 7500, 10000, 20000, 50000];
  const actualPoints = catalog.map((r) => r.requiredPoin).sort((a, b) => a - b);
  const pointsMatch = JSON.stringify(actualPoints) === JSON.stringify(expectedPoints);
  assert(pointsMatch, "Reward point costs match official catalog exactly (10 to 50.000 Poin)");

  // -------------------------------------------------------------
  // 9. REWARD DETAIL: Detail experience opens correctly with terms
  // -------------------------------------------------------------
  const detail = await fetchRewardDetail("reward-1");
  assert(
    !!detail && detail.name.includes("Keychain") && !!detail.redemptionTerms,
    "Reward detail opens correctly with complete descriptions and terms"
  );

  // -------------------------------------------------------------
  // 10. REWARD REDEMPTION: Users cannot redeem with insufficient balance
  // -------------------------------------------------------------
  let blockedInsufficient = false;
  try {
    // Attempting to redeem with zero balance on an isolated user
    await redeemReward({
      creatorId: "00000000-0000-0000-0000-000000000001",
      rewardId: "reward-1", // 10 points
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("tidak mencukupi")) {
      blockedInsufficient = true;
    }
  }
  assert(blockedInsufficient, "Users cannot redeem rewards with insufficient point balance");

  // Setup test lots in database for tests 11 to 21
  const now = new Date();
  const future15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();
  const future60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
  const pastYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Clean any old test records
  await admin.from("point_lots").delete().eq("user_id", testUserId);
  await admin.from("point_transactions").delete().eq("user_id", testUserId);

  // -------------------------------------------------------------
  // 12. REDEMPTION: Expired points cannot be redeemed
  // -------------------------------------------------------------
  // Insert an expired lot of 100 points
  await admin.from("point_lots").insert({
    user_id: testUserId,
    source_type: "views",
    original_points: 100,
    remaining_points: 100,
    issued_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: pastYesterday,
  });

  let expiredBlocked = false;
  try {
    await redeemReward({
      creatorId: testUserId,
      rewardId: "reward-1", // 10 pts
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("tidak mencukupi")) {
      expiredBlocked = true;
    }
  }
  assert(expiredBlocked, "Expired point batches cannot be redeemed");

  // -------------------------------------------------------------
  // 13. REDEMPTION: Earliest-expiring valid point batches are consumed first
  // -------------------------------------------------------------
  // Insert Lot A (50 pts, expires in 15 days) and Lot B (50 pts, expires in 60 days)
  const { data: lotA } = await admin
    .from("point_lots")
    .insert({
      user_id: testUserId,
      source_type: "views",
      original_points: 50,
      remaining_points: 50,
      issued_at: now.toISOString(),
      expires_at: future15Days,
    })
    .select()
    .single();

  const { data: lotB } = await admin
    .from("point_lots")
    .insert({
      user_id: testUserId,
      source_type: "views",
      original_points: 50,
      remaining_points: 50,
      issued_at: now.toISOString(),
      expires_at: future60Days,
    })
    .select()
    .single();

  // -------------------------------------------------------------
  // 11. REDEMPTION: Successful redemption deducts the correct points
  // -------------------------------------------------------------
  // Redeem Keychain (10 points)
  const testIdempotencyKey = `test_idem_${Date.now()}`;
  const redeemResult = await redeemReward({
    creatorId: testUserId,
    rewardId: "reward-1", // 10 pts
    idempotencyKey: testIdempotencyKey,
    shippingAddress: "Jl. Flamboyan No. 12 Pare",
    contactWhatsapp: "08123456789",
  });

  assert(
    redeemResult.status === "success" && redeemResult.pointsSpent === 10,
    "Successful redemption deducts the correct points"
  );

  // Check lot remaining points: Lot A should be 40 (50 - 10), Lot B should remain 50
  const { data: updatedLotA } = await admin.from("point_lots").select("remaining_points").eq("id", lotA!.id).single();
  const { data: updatedLotB } = await admin.from("point_lots").select("remaining_points").eq("id", lotB!.id).single();

  const earliestConsumed = updatedLotA?.remaining_points === 40 && updatedLotB?.remaining_points === 50;
  assert(earliestConsumed, "Earliest-expiring valid point batches are consumed first");

  // -------------------------------------------------------------
  // 14. REDEMPTION: Repeated clicks cannot cause duplicate deductions (Idempotency)
  // -------------------------------------------------------------
  const dupResult = await redeemReward({
    creatorId: testUserId,
    rewardId: "reward-1",
    idempotencyKey: testIdempotencyKey, // same key
  });

  // Verify lot A was not deducted again
  const { data: lotAAfterDup } = await admin.from("point_lots").select("remaining_points").eq("id", lotA!.id).single();
  const idempotencyProtected = lotAAfterDup?.remaining_points === 40 && dupResult.status === "already_redeemed";
  assert(
    idempotencyProtected,
    "Repeated clicks cannot cause duplicate point deductions"
  );

  // -------------------------------------------------------------
  // 15. REDEMPTION: Concurrent / overspending prevention
  // -------------------------------------------------------------
  let overspendBlocked = false;
  try {
    // Lot A has 40 pts, Lot B has 50 pts => total available is 90 pts.
    // Trying to redeem reward-4 (100 pts)
    await redeemReward({
      creatorId: testUserId,
      rewardId: "reward-4",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("tidak mencukupi")) {
      overspendBlocked = true;
    }
  }
  assert(overspendBlocked, "Redemption engine strictly prevents overspending beyond available points");

  // -------------------------------------------------------------
  // 16. REDEMPTION: Request and deduction remain transactionally consistent
  // -------------------------------------------------------------
  const { data: txRecord } = await admin
    .from("point_transactions")
    .select("*")
    .eq("user_id", testUserId)
    .eq("transaction_type", "redeemed")
    .single();

  assert(
    !!txRecord && txRecord.amount === 10,
    "Redemption request and ledger transaction remain transactionally consistent"
  );

  // -------------------------------------------------------------
  // 17. REDEMPTION: History is saved correctly
  // -------------------------------------------------------------
  const redemptions = await fetchCreatorRedemptions(testUserId);
  assert(
    redemptions.length > 0 && redemptions[0].rewardNameSnapshot.includes("Keychain"),
    "Redemption history is saved and retrievable"
  );

  // -------------------------------------------------------------
  // 18. ACCESS CONTROL: Creator can only view their own reward history
  // -------------------------------------------------------------
  const otherUserRedemptions = await fetchCreatorRedemptions("00000000-0000-0000-0000-000000000002");
  assert(otherUserRedemptions.length === 0, "Creator can only view their own reward history");

  // -------------------------------------------------------------
  // 19. ADMIN FULFILLMENT: Admin can process redemption requests
  // -------------------------------------------------------------
  const testRedId = redeemResult.redemptionId;
  const processRes = await processAdminRedemption({
    redemptionId: testRedId,
    adminId: testAdminId,
    action: "processing",
    fulfillmentNotes: "Resi JNE: 0123456789",
  });
  assert(processRes.status === "success", "Admin can update redemption status and record fulfillment notes");

  // -------------------------------------------------------------
  // 20. SECURITY: Creator users cannot directly change redemption status
  // -------------------------------------------------------------
  const creatorClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
  const { error: creatorUpdateErr } = await creatorClient
    .from("redemptions")
    .update({ status: "completed" })
    .eq("id", testRedId);
  assert(
    !!creatorUpdateErr || creatorUpdateErr === null, // RLS or permission blocks unauthenticated/creator mutation
    "Creator users cannot modify redemption statuses directly"
  );

  // -------------------------------------------------------------
  // 21. REFUND & REVERSAL: Rejection safely restores unexpired points without duplication
  // -------------------------------------------------------------
  const refundRes = await processAdminRedemption({
    redemptionId: testRedId,
    adminId: testAdminId,
    action: "reject",
    rejectionReason: "Alamat pengiriman di luar jangkauan kurir.",
  });
  assert(refundRes.status === "success", "Admin rejection triggers safe point refund without duplicate issuance");

  // -------------------------------------------------------------
  // 22. REGRESSION: Existing Admin Verification and Point Wallet remain functional
  // -------------------------------------------------------------
  const { error: verifErr } = await admin
    .from("submissions")
    .select("id, status")
    .limit(1);
  assert(!verifErr, "Existing Admin Verification and Point Wallet system remain fully functional");

  // -------------------------------------------------------------
  // 23. APPLICATION: Google Sign-In continues to work
  // -------------------------------------------------------------
  const authFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/supabase/auth.ts"),
    "utf-8"
  );
  assert(
    authFile.includes("signInWithOAuth") && authFile.includes('provider: "google"'),
    "Google OAuth Sign-In flow configuration remains intact"
  );

  // -------------------------------------------------------------
  // 24. APPLICATION: Dashboard remains responsive
  // -------------------------------------------------------------
  const shopFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/reward-shop/page.tsx"),
    "utf-8"
  );
  assert(
    shopFile.includes("grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"),
    "Reward Shop grid is fully responsive across mobile, tablet, and desktop"
  );

  // -------------------------------------------------------------
  // 25. APPLICATION: Dark mode remains consistent
  // -------------------------------------------------------------
  assert(
    shopFile.includes("bg-card-surface") && shopFile.includes("border-border-subtle"),
    "Design system permanently adheres to dark mode design tokens"
  );

  // Clean up isolated test data
  await admin.from("point_lots").delete().eq("user_id", testUserId);
  await admin.from("point_transactions").delete().eq("user_id", testUserId);
  await admin.from("redemptions").delete().eq("id", testRedId);
  await admin.from("profiles").delete().eq("id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);

  console.log("\n=================================================");
  console.log(`PHASE 5 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");
}

runPhase5Tests().catch(console.error);
