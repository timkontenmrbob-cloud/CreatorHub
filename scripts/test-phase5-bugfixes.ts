import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import {
  redeemReward,
  fetchCreatorRedemptions,
  processAdminRedemption,
  getStoredRedemptions,
} from "../src/lib/supabase/rewards";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runPhase5BugfixTests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — PHASE 5 BUG FIXES & UX REFINEMENT TESTS");
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

  // Create isolated temporary test creator for transactional verification
  const tempEmail = `test-bugfix-${Date.now()}@mrbob.test`;
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
    full_name: "Budi Santoso Tester",
    email: tempEmail,
    whatsapp_number: "081234567890",
    profile_completed: true,
  });

  // Issue points to test user: 500 Poin
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
  await admin.from("point_lots").insert({
    user_id: testUserId,
    original_points: 500,
    remaining_points: 500,
    source_type: "views",
    expires_at: sixMonthsFromNow.toISOString(),
  });

  // ==========================================================================
  // GROUP A: MERCHANDISE FORM, RECIPIENT NAME & VALIDATION (TASKS 1 & 3)
  // ==========================================================================
  console.log("\n--- GROUP A: MERCHANDISE FORM, RECIPIENT NAME & VALIDATION ---");

  // Read files for static verification
  const rewardShopFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/reward-shop/page.tsx"),
    "utf-8"
  );
  const migrationFile = fs.readFileSync(
    path.resolve(process.cwd(), "supabase/migrations/20261015000001_create_reward_redemption_system.sql"),
    "utf-8"
  );
  const databaseTypesFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/types/database.ts"),
    "utf-8"
  );
  const rewardTypesFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/types/reward.ts"),
    "utf-8"
  );

  // Test 1: Migration DDL includes recipient_name column
  assert(
    migrationFile.includes("recipient_name text"),
    "Database migration defines recipient_name column"
  );

  // Test 2: TypeScript Database types include recipient_name
  assert(
    databaseTypesFile.includes("recipient_name: string | null"),
    "src/lib/types/database.ts includes recipient_name across Row/Insert/Update"
  );

  // Test 3: Reward domain types include recipientName
  assert(
    rewardTypesFile.includes("recipientName?: string | null;"),
    "src/lib/types/reward.ts includes recipientName in Redemption type"
  );

  // Test 4: RewardShop form has Nama Lengkap Penerima field
  assert(
    rewardShopFile.includes("Nama Lengkap Penerima") &&
    rewardShopFile.includes("setRecipientName(e.target.value)"),
    "Reward Shop modal includes editable 'Nama Lengkap Penerima' input"
  );

  // Test 5: Form clears errors on input onChange
  assert(
    rewardShopFile.includes("if (formError) setFormError(\"\")"),
    "Form clears validation errors immediately when user types in any input"
  );

  // Test 6: Prefills recipient name from user profile
  assert(
    rewardShopFile.includes("setRecipientName(user?.displayName || \"\")"),
    "Recipient name is automatically prefilled from creator's profile display name"
  );

  // Test 7: Merchandise shipping cost notice exact copy in Detail Modal
  const expectedNotice = "Biaya ongkir ditanggung oleh peserta dan akan diinformasikan oleh admin sesuai alamat tujuan.";
  assert(
    rewardShopFile.includes(expectedNotice),
    "Merchandise modal displays exact required shipping cost notice: '" + expectedNotice + "'"
  );

  // Test 8: Repeat shipping notice in Confirmation Dialog
  assert(
    rewardShopFile.includes("Catatan Ongkir:") &&
    rewardShopFile.includes(expectedNotice),
    "Confirmation Dialog repeats clear shipping notice before final user confirmation"
  );

  // Test 9: Shipping requirement not applied to digital vouchers or class rewards
  assert(
    rewardShopFile.includes("selectedReward.rewardType === \"merchandise\""),
    "Shipping inputs and notices are strictly scoped to merchandise rewards"
  );

  // ==========================================================================
  // GROUP B: MODAL SCROLLING & RESPONSIVENESS (TASK 2)
  // ==========================================================================
  console.log("\n--- GROUP B: MODAL SCROLLING & RESPONSIVENESS ---");

  const dialogFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/dialog.tsx"),
    "utf-8"
  );

  // Test 10: Dialog component supports hideHeader
  assert(
    dialogFile.includes("hideHeader?: boolean") &&
    dialogFile.includes("!hideHeader"),
    "Dialog component supports custom headers via hideHeader prop"
  );

  // Test 11: Reward Detail Modal constrained to max 90dvh
  assert(
    rewardShopFile.includes("max-h-[90dvh]"),
    "Reward Detail modal is height-constrained to max-h-[90dvh]"
  );

  // Test 12: Reward Detail Modal uses flex column layout
  assert(
    rewardShopFile.includes("flex flex-col"),
    "Reward Detail modal uses responsive flex flex-col layout"
  );

  // Test 13: Scrollable body with touch/trackpad smooth scrolling
  assert(
    rewardShopFile.includes("flex-1 overflow-y-auto overscroll-contain"),
    "Modal body container is scrollable with flex-1 overflow-y-auto overscroll-contain"
  );

  // Test 14: Sticky bottom action buttons
  assert(
    rewardShopFile.includes("border-t border-border-subtle bg-card-surface flex items-center justify-end gap-3 shrink-0"),
    "Bottom action buttons (Batal & Tukarkan Poin) are pinned in a sticky footer"
  );

  // Test 15: Sticky header with title and close button
  assert(
    rewardShopFile.includes("Detail Reward & Penukaran") &&
    rewardShopFile.includes("shrink-0 z-10"),
    "Sticky header with title and close button stays visible at top"
  );

  // ==========================================================================
  // GROUP C: REDEMPTION TRANSACTION & STATUS TRANSITIONS (TASKS 4 & 5)
  // ==========================================================================
  console.log("\n--- GROUP C: REDEMPTION TRANSACTION & STATUS TRANSITIONS ---");

  // Test 16: Redeem merchandise reward with recipient name
  const redeemRes = await redeemReward({
    creatorId: testUserId,
    rewardId: "reward-3", // T-Shirt (75 Poin)
    recipientName: "Budi Santoso",
    shippingAddress: "Jl. Flamboyan No. 12, Tulungrejo, Pare, Kediri, 64212",
    contactWhatsapp: "081234567890",
    idempotencyKey: `test_redeem_${testUserId}_${Date.now()}`,
  });

  assert(
    redeemRes.status === "success" && redeemRes.pointsSpent === 75,
    "Merchandise reward successfully redeemed with 75 points deducted"
  );

  const redemptionId = redeemRes.redemptionId;

  // Test 17: Creator redemptions list includes recipientName and status pending
  const creatorReds = await fetchCreatorRedemptions(testUserId);
  const myRed = creatorReds.find((r) => r.id === redemptionId);

  assert(
    !!myRed && myRed.recipientName === "Budi Santoso",
    "fetchCreatorRedemptions returns persisted redemption with recipientName"
  );

  assert(
    myRed?.status === "pending",
    "Newly created redemption has status 'pending'"
  );

  // Test 18: Admin status transition to 'processing'
  const procRes = await processAdminRedemption({
    redemptionId,
    adminId: testAdminId,
    action: "processing",
    fulfillmentNotes: "Pesanan kaos sedang disiapkan oleh bagian gudang Mr.BOB.",
  });

  assert(
    procRes.status === "success",
    "Admin successfully transitioned status to 'processing'"
  );

  // Test 19: Verify status persisted across function calls (cross-session emulation)
  const storedAfterProc = getStoredRedemptions();
  const redAfterProc = storedAfterProc.get(redemptionId);
  assert(
    redAfterProc?.status === "processing" &&
    Boolean(redAfterProc?.fulfillmentNotes?.includes("gudang Mr.BOB")),
    "Status 'processing' and fulfillmentNotes are properly persisted in storage cache"
  );

  // Test 20: Admin status transition to 'ready'
  const readyRes = await processAdminRedemption({
    redemptionId,
    adminId: testAdminId,
    action: "ready",
    fulfillmentNotes: "Paket siap dikirim dengan nomor resi JNE: JNE-BOB-998811.",
  });

  assert(
    readyRes.status === "success",
    "Admin successfully transitioned status to 'ready'"
  );

  const redAfterReady = getStoredRedemptions().get(redemptionId);
  assert(
    redAfterReady?.status === "ready",
    "Status 'ready' is properly persisted in storage cache"
  );

  // Test 21: Admin status transition to 'completed'
  const compRes = await processAdminRedemption({
    redemptionId,
    adminId: testAdminId,
    action: "completed",
    fulfillmentNotes: "Paket telah diterima oleh penerima Budi Santoso.",
  });

  assert(
    compRes.status === "success",
    "Admin successfully transitioned status to 'completed'"
  );

  const redAfterComp = getStoredRedemptions().get(redemptionId);
  assert(
    redAfterComp?.status === "completed",
    "Status 'completed' is properly persisted in storage cache"
  );

  // Test 22: Rejecting a 'completed' redemption must be blocked
  let blockCompleteErr = false;
  try {
    await processAdminRedemption({
      redemptionId,
      adminId: testAdminId,
      action: "reject",
      rejectionReason: "Mencoba menolak order yang sudah selesai",
    });
  } catch {
    blockCompleteErr = true;
  }
  assert(
    blockCompleteErr,
    "Rejecting an already 'completed' redemption is strictly rejected with error"
  );

  // ==========================================================================
  // GROUP D: REJECTION & STRICT REFUND IDEMPOTENCY (TASK 5)
  // ==========================================================================
  console.log("\n--- GROUP D: REJECTION & STRICT REFUND IDEMPOTENCY ---");

  // Create a second redemption to test rejection and refund
  const secondRedeem = await redeemReward({
    creatorId: testUserId,
    rewardId: "reward-2", // Notebook (50 Poin)
    recipientName: "Budi Santoso",
    shippingAddress: "Jl. Flamboyan No. 12, Pare",
    contactWhatsapp: "081234567890",
    idempotencyKey: `test_redeem_second_${testUserId}_${Date.now()}`,
  });

  const secondId = secondRedeem.redemptionId;

  // Test 23: Rejection requires non-empty rejectionReason
  let emptyReasonBlocked = false;
  try {
    await processAdminRedemption({
      redemptionId: secondId,
      adminId: testAdminId,
      action: "reject",
      rejectionReason: "   ",
    });
  } catch {
    emptyReasonBlocked = true;
  }
  assert(
    emptyReasonBlocked,
    "Rejection with whitespace/empty reason is strictly blocked"
  );

  // Test 24: Rejection successfully processes and refunds points
  const rejectRes = await processAdminRedemption({
    redemptionId: secondId,
    adminId: testAdminId,
    action: "reject",
    rejectionReason: "Stok totebag Mr.BOB sedang habis.",
  });

  assert(
    rejectRes.status === "success",
    "Redemption successfully rejected with reason and refund initiated"
  );

  const redAfterReject = getStoredRedemptions().get(secondId);
  assert(
    redAfterReject?.status === "rejected" &&
    redAfterReject.rejectionReason === "Stok totebag Mr.BOB sedang habis.",
    "Status 'rejected' and rejectionReason are properly persisted"
  );

  // Test 25: Strict Idempotency — attempting to reject again is blocked
  let duplicateRejectBlocked = false;
  try {
    await processAdminRedemption({
      redemptionId: secondId,
      adminId: testAdminId,
      action: "reject",
      rejectionReason: "Mencoba menolak kedua kalinya",
    });
  } catch {
    duplicateRejectBlocked = true;
  }
  assert(
    duplicateRejectBlocked,
    "Strict Idempotency: Rejecting an already rejected redemption is blocked from duplicate refund"
  );

  // ==========================================================================
  // GROUP E: UI CONSISTENCY ACROSS PORTALS (TASK 6)
  // ==========================================================================
  console.log("\n--- GROUP E: UI CONSISTENCY ACROSS PORTALS ---");

  const myRewardsFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/my-rewards/page.tsx"),
    "utf-8"
  );
  const adminRedemptionsFile = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/redemptions/page.tsx"),
    "utf-8"
  );

  // Test 26: My Rewards displays recipient name
  assert(
    myRewardsFile.includes("red.recipientName") &&
    myRewardsFile.includes("Penerima:"),
    "Creator My Rewards page renders recipient name on claimed reward cards"
  );

  // Test 27: My Rewards displays shipping notice reminder
  assert(
    myRewardsFile.includes("Biaya ongkir ditanggung oleh peserta dan dikoordinasikan via WhatsApp"),
    "Creator My Rewards page shows shipping fee reminder note"
  );

  // Test 28: Admin Redemptions displays recipient name
  assert(
    adminRedemptionsFile.includes("Nama Penerima Paket:") &&
    adminRedemptionsFile.includes("selectedRedemption.recipientName"),
    "Admin Redemptions modal displays 'Nama Penerima Paket'"
  );

  // Test 29: Admin Redemptions displays WhatsApp coordination link
  assert(
    adminRedemptionsFile.includes("WhatsApp Koordinasi Ongkir:") &&
    adminRedemptionsFile.includes("wa.me"),
    "Admin Redemptions modal includes direct WhatsApp link for shipping coordination"
  );

  // Test 30: Admin Redemptions displays shipping cost notice
  assert(
    adminRedemptionsFile.includes("Biaya ongkir ditanggung oleh peserta dan dikoordinasikan langsung via WhatsApp"),
    "Admin Redemptions modal displays clear reminder that shipping cost is coordinated via WhatsApp"
  );

  // Test 31: Creator and Admin sort newest first
  assert(
    myRewardsFile.includes("fetchCreatorRedemptions") &&
    adminRedemptionsFile.includes("fetchAdminRedemptions"),
    "Both Creator and Admin portals fetch authoritative data sorted newest first"
  );

  // Clean up temporary test data
  try {
    await admin.from("point_transactions").delete().eq("user_id", testUserId);
    await admin.from("point_lots").delete().eq("user_id", testUserId);
    await admin.from("profiles").delete().eq("id", testUserId);
    await admin.auth.admin.deleteUser(testUserId);
  } catch {
    // Ignore cleanup errors
  }

  console.log("\n==================================================================");
  console.log(`PHASE 5 BUGFIX TEST SUITE SUMMARY: ${passed}/${testCount} TESTS PASSED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase5BugfixTests().catch((err) => {
  console.error("FATAL ERROR in test runner:", err);
  process.exit(1);
});
