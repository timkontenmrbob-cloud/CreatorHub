import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredEvidence } from "@/lib/supabase/submissions";


/**
 * Cron Endpoint: Automated Retention Cleanup for Screenshot Evidence
 * Triggered daily by Vercel Cron, GitHub Actions, or Supabase pg_cron
 * 
 * Authorization:
 * Authorization: Bearer <CRON_SECRET> or x-cron-secret
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Secure authorization check if CRON_SECRET is configured
    if (cronSecret) {
      const token = authHeader?.replace("Bearer ", "");
      if (token !== cronSecret && req.headers.get("x-cron-secret") !== cronSecret) {
        return NextResponse.json(
          { error: "Unauthorized cron request" },
          { status: 401 }
        );
      }
    }

    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const result = await cleanupExpiredEvidence(limit);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    console.error("Cron evidence cleanup error:", error);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
