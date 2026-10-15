import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

const anonClient = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("=== CHECKPOINT 2: REAL SUPABASE DATABASE VERIFICATION ===");
  console.log(`Target Supabase URL: ${supabaseUrl}\n`);

  // 1. Check point_lots table
  console.log("Checking table: point_lots...");
  const { error: lotsError } = await adminClient
    .from("point_lots")
    .select("id, user_id, remaining_points, expires_at")
    .limit(1);

  if (lotsError) {
    console.error("❌ point_lots table check FAILED:", lotsError.message);
  } else {
    console.log("✅ point_lots table exists and is queryable.");
  }

  // 2. Check point_transactions table
  console.log("Checking table: point_transactions...");
  const { error: txError } = await adminClient
    .from("point_transactions")
    .select("id, user_id, amount, transaction_type")
    .limit(1);

  if (txError) {
    console.error("❌ point_transactions table check FAILED:", txError.message);
  } else {
    console.log("✅ point_transactions table exists and is queryable.");
  }

  // 3. Check profiles table
  console.log("Checking table: profiles...");
  const { data: profilesData, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, email, full_name, profile_completed")
    .limit(5);

  if (profilesError) {
    console.error("❌ profiles table check FAILED:", profilesError.message);
  } else {
    console.log(`✅ profiles table exists. Found ${profilesData?.length || 0} profiles.`);
  }

  // 4. Check admin_roles table
  console.log("Checking table: admin_roles...");
  const { data: rolesData, error: rolesError } = await adminClient
    .from("admin_roles")
    .select("user_id, role")
    .limit(5);

  if (rolesError) {
    console.error("❌ admin_roles table check FAILED:", rolesError.message);
  } else {
    console.log(`✅ admin_roles table exists. Found ${rolesData?.length || 0} admin users.`);
  }

  // 5. Test RPC function: get_wallet_summary
  if (profilesData && profilesData.length > 0) {
    const testUserId = profilesData[0].id;
    console.log(`Testing RPC get_wallet_summary for user ${testUserId}...`);
    const { data: summaryData, error: summaryError } = await adminClient.rpc("get_wallet_summary", {
      target_user_id: testUserId,
    });

    if (summaryError) {
      console.error("❌ RPC get_wallet_summary FAILED:", summaryError.message);
    } else {
      console.log("✅ RPC get_wallet_summary executed successfully:", summaryData);
    }
  }

  // 6. Test RLS: Can unauthenticated / anon client access point_lots?
  console.log("Testing RLS: Anonymous access to point_lots...");
  const { data: anonLots, error: anonLotsError } = await anonClient
    .from("point_lots")
    .select("*");

  if (anonLotsError || (anonLots && anonLots.length === 0)) {
    console.log("✅ RLS Active: Anonymous query returned 0 rows / blocked.");
  } else {
    console.warn("⚠️ Warning: Anonymous client retrieved rows from point_lots:", anonLots);
  }

  // 7. Test RLS: Can anonymous client insert a lot?
  console.log("Testing RLS: Anonymous insert to point_lots...");
  const { error: anonInsertError } = await anonClient
    .from("point_lots")
    .insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      source_type: "bonus",
      original_points: 9999,
      remaining_points: 9999,
    });

  if (anonInsertError) {
    console.log("✅ RLS Protected: Anonymous insert successfully rejected:", anonInsertError.message);
  } else {
    console.error("❌ CRITICAL RLS FAILURE: Anonymous insert succeeded!");
  }

  // 8. Test Storage Bucket: submission-evidence
  console.log("Checking storage bucket: submission-evidence...");
  const { data: buckets, error: bucketsError } = await adminClient.storage.listBuckets();
  if (bucketsError) {
    console.error("❌ Bucket listing failed:", bucketsError.message);
  } else {
    const evidenceBucket = buckets.find((b) => b.id === "submission-evidence" || b.name === "submission-evidence");
    if (evidenceBucket) {
      console.log(`✅ Bucket submission-evidence exists (public=${evidenceBucket.public}).`);
    } else {
      console.error("❌ Bucket submission-evidence NOT FOUND! Found buckets:", buckets.map((b) => b.name));
    }
  }
}

main().catch((err) => {
  console.error("Fatal verification error:", err);
  process.exit(1);
});
