import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SECRET_KEY!;

const client = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function inspect() {
  console.log("=== INSPECTING REMOTE SUPABASE SCHEMA ===");

  // Check what profiles has
  const { data: pData, error: pError } = await client
    .from("profiles")
    .select("*")
    .limit(1);

  if (pError) {
    console.error("profiles select error:", pError);
  } else {
    console.log("profiles sample row:", pData);
    if (pData && pData.length > 0) {
      console.log("profiles columns:", Object.keys(pData[0]));
    }
  }

  // Check point_lots
  const { data: lData, error: lError } = await client
    .from("point_lots")
    .select("*")
    .limit(1);

  if (lError) {
    console.error("point_lots select error:", lError);
  } else {
    console.log("point_lots sample row:", lData);
    if (lData && lData.length > 0) {
      console.log("point_lots columns:", Object.keys(lData[0]));
    }
  }

  // Check RPC functions
  const rpcTests = [
    { name: "get_wallet_summary", args: { target_user_id: "00000000-0000-0000-0000-000000000000" } },
    { name: "expire_overdue_point_lots", args: {} },
  ];

  for (const r of rpcTests) {
    const { data, error } = await client.rpc(r.name, r.args);
    console.log(`RPC ${r.name}:`, error ? `FAILED: ${error.message}` : `SUCCESS: ${JSON.stringify(data)}`);
  }
}

inspect();
