import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const serviceKey = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function testCreatorIsolation() {
  console.log("=== TESTING CREATOR ISOLATION & RLS ENFORCEMENT ===");

  const user1Email = "bayuuuajisantoso@gmail.com";
  const user2Email = "leadersosmed@gmail.com";

  // Generate tokens for both users using Admin API
  const { data: link1 } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user1Email,
  });
  const { data: link2 } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: user2Email,
  });

  if (!link1?.user || !link2?.user) {
    throw new Error("Could not find test users in Supabase Auth");
  }

  const user1Id = link1.user.id;
  const user2Id = link2.user.id;
  console.log(`Creator 1: ${user1Email} (${user1Id})`);
  console.log(`Creator 2: ${user2Email} (${user2Id})`);

  // Create authenticated client for Creator 1
  const client1 = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });
  const { data: session1, error: sessErr } = await client1.auth.verifyOtp({
    token_hash: link1.properties?.hashed_token || "",
    type: "magiclink",
  });

  if (sessErr || !session1.session) {
    console.error("Failed to authenticate client 1:", sessErr);
    return;
  }
  console.log("✅ Creator 1 authenticated via real session.");

  // Test 1: Creator 1 attempts to query their own point_lots
  const { data: ownLots, error: ownLotsErr } = await client1
    .from("point_lots")
    .select("*");
  console.log("Creator 1 querying own lots:", ownLotsErr ? ownLotsErr.message : `OK (${ownLots?.length} rows)`);

  // Test 2: Creator 1 attempts to query Creator 2's point_lots
  const { data: otherLots, error: otherLotsErr } = await client1
    .from("point_lots")
    .select("*")
    .eq("user_id", user2Id);
  console.log("Creator 1 querying Creator 2 lots:", otherLotsErr ? otherLotsErr.message : `Returned ${otherLots?.length} rows (Must be 0)`);
  if (otherLots && otherLots.length === 0) {
    console.log("✅ PASSED: Creator 1 cannot read Creator 2's lots.");
  } else {
    console.error("❌ FAILED: Creator 1 could read Creator 2's lots!");
  }

  // Test 3: Creator 1 attempts to direct INSERT into point_lots
  const { error: insertErr } = await client1.from("point_lots").insert({
    user_id: user1Id,
    original_points: 1000,
    remaining_points: 1000,
    source_type: "bonus",
  });
  console.log("Creator 1 attempting direct INSERT into point_lots:", insertErr ? `BLOCKED (${insertErr.message})` : "FAILED (Insert succeeded!)");
  if (insertErr) {
    console.log("✅ PASSED: Direct insert to point_lots is rejected by RLS.");
  }

  // Test 4: Creator 1 attempts to call issue_points_lot RPC
  const { error: rpcIssueErr } = await client1.rpc("issue_points_lot", {
    target_user_id: user1Id,
    p_points: 500,
    p_source_type: "bonus",
    p_description: "Self-issued bonus",
  });
  console.log("Creator 1 calling issue_points_lot RPC:", rpcIssueErr ? `BLOCKED (${rpcIssueErr.message})` : "FAILED (RPC succeeded!)");
  if (rpcIssueErr) {
    console.log("✅ PASSED: Creator cannot issue points via RPC.");
  }

  // Test 5: Creator 1 attempts to call get_wallet_summary for Creator 2
  const { data: otherSummary, error: rpcSummaryErr } = await client1.rpc("get_wallet_summary", {
    target_user_id: user2Id,
  });
  console.log("Creator 1 calling get_wallet_summary for Creator 2:", rpcSummaryErr ? `BLOCKED (${rpcSummaryErr.message})` : `FAILED (${JSON.stringify(otherSummary)})`);
  if (rpcSummaryErr) {
    console.log("✅ PASSED: Creator 1 cannot access Creator 2's wallet summary.");
  }
}

testCreatorIsolation().catch(console.error);
