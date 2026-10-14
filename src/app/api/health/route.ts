import { NextResponse } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/config";

export async function GET() {
  const { isConfigured, isAdminConfigured } = getSupabaseEnv();

  return NextResponse.json({
    status: "ok",
    app: "Mr.BOB Creator Hub",
    tagline: "Post Your Video, Claim Your Reward!",
    version: "1.0.0-phase1",
    phase: 1,
    backend: "supabase",
    supabaseConfigured: isConfigured,
    adminConfigured: isAdminConfigured,
    timestamp: new Date().toISOString(),
  });
}
