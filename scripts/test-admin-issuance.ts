import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("=== TESTING ADMIN ISSUANCE & REDEMPTION LIFECYCLE ===");

  const adminEmail = "leadersosmed@gmail.com";
  const creatorEmail = "bayuuuajisantoso@gmail.com";

  // 1. Ensure adminEmail has role in admin_roles
  const { data: users } = await admin.auth.admin.listUsers();
  const adminUser = users.users.find((u) => u.email === adminEmail);
  const creatorUser = users.users.find((u) => u.email === creatorEmail);

  if (!adminUser || !creatorUser) {
    console.error("Users not found in auth.users");
    return;
  }

  console.log(`Setting admin role for ${adminEmail} (${adminUser.id})...`);
  await admin.from("admin_roles").upsert({
    user_id: adminUser.id,
    role: "admin",
  });

  // 2. Generate session for Admin
  const { data: linkAdmin } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: adminEmail,
  });
  const clientAdmin = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: adminSession, error: adminSessErr } = await clientAdmin.auth.verifyOtp({
    token_hash: linkAdmin.properties?.hashed_token || "",
    type: "magiclink",
  });

  if (adminSessErr || !adminSession.session) {
    console.error("Admin verifyOtp failed:", adminSessErr);
    return;
  }
  console.log("✅ Admin session active.");

  // 3. Admin issues points to creatorUser
  const idempotencyKey = `audit-test-${Date.now()}`;
  console.log(`Admin issuing 100 points to creator (${creatorUser.id}) with idempotency key ${idempotencyKey}...`);
  const { data: issueRes, error: issueErr } = await clientAdmin.rpc("issue_points_lot", {
    target_user_id: creatorUser.id,
    p_points: 100,
    p_source_type: "bonus",
    p_description: "Audit Verifikasi Phase 2 Checkpoint",
    p_idempotency_key: idempotencyKey,
  });

  if (issueErr) {
    console.error("❌ issue_points_lot failed:", issueErr);
    return;
  }
  console.log("✅ issue_points_lot succeeded:", issueRes);

  // 4. Test Idempotency: Issue again with same key
  console.log("Testing Idempotency replay with same key...");
  const { data: replayRes } = await clientAdmin.rpc("issue_points_lot", {
    target_user_id: creatorUser.id,
    p_points: 100,
    p_source_type: "bonus",
    p_description: "Duplicate test",
    p_idempotency_key: idempotencyKey,
  });
  console.log("Idempotency replay response:", replayRes);
  if (replayRes && (replayRes.status === "already_processed" || typeof replayRes === "string" && replayRes.includes("already_processed"))) {
    console.log("✅ PASSED: Idempotency prevented duplicate issuance.");
  }

  // 5. Verify Creator Wallet
  const { data: creatorSummary } = await clientAdmin.rpc("get_wallet_summary", {
    target_user_id: creatorUser.id,
  });
  console.log("Creator wallet summary after issuance:", creatorSummary);
  const available = typeof creatorSummary === "string" ? JSON.parse(creatorSummary).available_points : creatorSummary.available_points;
  if (available >= 100) {
    console.log(`✅ PASSED: Creator wallet has ${available} available points.`);
  }

  // 6. Creator session tests redemption of 20 points
  console.log("Testing Creator redemption of 20 points...");
  const { data: linkCreator } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: creatorEmail,
  });
  const clientCreator = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  await clientCreator.auth.verifyOtp({
    token_hash: linkCreator.properties?.hashed_token || "",
    type: "magiclink",
  });

  const { data: redeemRes, error: redeemErr } = await clientCreator.rpc("redeem_points_ordered", {
    target_user_id: creatorUser.id,
    p_points: 20,
    p_description: "Penukaran Test Merchandise Keychain",
    p_idempotency_key: `redeem-test-${Date.now()}`,
  });

  if (redeemErr) {
    console.error("❌ redeem_points_ordered failed:", redeemErr);
  } else {
    console.log("✅ redeem_points_ordered succeeded:", redeemRes);
  }

  // 7. Verify updated balance
  const { data: postSummary } = await clientCreator.rpc("get_wallet_summary", {
    target_user_id: creatorUser.id,
  });
  const postAvailable = typeof postSummary === "string" ? JSON.parse(postSummary).available_points : postSummary.available_points;
  console.log(`Creator balance after 20 pt redemption: ${postAvailable} Poin (Expected: ${available - 20})`);
  if (postAvailable === available - 20) {
    console.log("✅ PASSED: Balance accurately reflects ordered lot deduction.");
  }
}

main().catch(console.error);
