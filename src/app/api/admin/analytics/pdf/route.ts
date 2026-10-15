import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { Database } from "@/lib/types/database";
import { QuarterName } from "@/lib/types/analytics";
import { fetchQuarterlyAnalytics } from "@/lib/supabase/analytics";
import { generateQuarterlyPDF } from "@/lib/pdf/generate-quarterly-report";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const quarterParam = searchParams.get("quarter") as QuarterName | null;

  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const quarter: QuarterName =
    quarterParam && ["Q1", "Q2", "Q3", "Q4"].includes(quarterParam)
      ? quarterParam
      : "Q4";

  const { url, publishableKey, isConfigured } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfigured) {
    return NextResponse.json({ error: "Layanan database belum siap." }, { status: 503 });
  }

  // 1. Authenticate caller (Must be admin or super_admin)
  const cookieStore = await cookies();
  const userClient = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir." }, { status: 401 });
  }

  const adminClient = createAdminClient(url, serviceKey || publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: adminRole } = await adminClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isAdmin =
    user.email === "leadersosmed@gmail.com" ||
    adminRole?.role === "admin" ||
    adminRole?.role === "superadmin" ||
    adminRole?.role === "super_admin";

  if (!isAdmin) {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya administrator yang dapat mengunduh laporan PDF." },
      { status: 403 }
    );
  }

  // 2. Fetch analytics dataset
  const analyticsData = await fetchQuarterlyAnalytics(year, quarter, adminClient);

  // 3. Generate PDF
  const pdfDoc = generateQuarterlyPDF(analyticsData);
  const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));

  const fileName = `Laporan-UGC-MrBOB-${quarter}-${year}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": pdfBuffer.byteLength.toString(),
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
    },
  });
}
