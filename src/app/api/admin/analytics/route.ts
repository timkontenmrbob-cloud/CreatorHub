import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchQuarterlyAnalytics,
  addCampaignCost,
  deleteCampaignCost,
  assignSubmissionCategory,
  fetchQuarterlySnapshots,
  saveQuarterlySnapshot,
} from "@/lib/supabase/analytics";
import {
  QuarterName,
  CampaignCostCategory,
  CONTENT_CATEGORIES,
  ContentCategory,
} from "@/lib/types/analytics";

async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { authorized: false, status: 401, error: "Unauthorized" };
  }

  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuperEmail = user.email === "leadersosmed@gmail.com";
  const hasAdminRole = adminRole && ["admin", "superadmin", "super_admin"].includes(adminRole.role);

  if (!isSuperEmail && !hasAdminRole) {
    return {
      authorized: false,
      status: 403,
      error: "Forbidden: Akses analitik terbatas untuk administrator.",
    };
  }

  return { authorized: true, user, supabase };
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = await verifyAdmin();
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const searchParams = req.nextUrl.searchParams;
    const yearParam = searchParams.get("year");
    const quarterParam = searchParams.get("quarter") as QuarterName | null;

    const currentYear = new Date().getFullYear();
    const year = yearParam ? parseInt(yearParam, 10) : currentYear;
    const quarter: QuarterName =
      quarterParam && ["Q1", "Q2", "Q3", "Q4"].includes(quarterParam)
        ? quarterParam
        : "Q3";

    const data = await fetchQuarterlyAnalytics(year, quarter);

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      throw error;
    }
    console.error("Admin Analytics GET Error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memuat data analitik.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = await verifyAdmin();
    if (!authCheck.authorized || !authCheck.user) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const action = body.action;

    // 1. ADD CAMPAIGN COST
    if (action === "add_cost") {
      const { year, quarter, category, description, amountIdr, expenseDate } = body;

      if (!year || !quarter || !category || !description || amountIdr === undefined) {
        return NextResponse.json(
          { error: "Mohon lengkapi seluruh field biaya kampanye." },
          { status: 400 }
        );
      }

      if (amountIdr <= 0) {
        return NextResponse.json(
          { error: "Nominal biaya harus lebih besar dari Rp0." },
          { status: 400 }
        );
      }

      const validCategories: CampaignCostCategory[] = [
        "merchandise",
        "voucher",
        "class_program",
        "operational",
        "other",
      ];

      if (!validCategories.includes(category)) {
        return NextResponse.json({ error: "Kategori biaya tidak valid." }, { status: 400 });
      }

      const cost = await addCampaignCost(
        {
          year: Number(year),
          quarter: quarter as QuarterName,
          category,
          description: String(description).trim(),
          amountIdr: Number(amountIdr),
          expenseDate: expenseDate || new Date().toISOString().slice(0, 10),
        },
        authCheck.user.id
      );

      return NextResponse.json({ success: true, cost });
    }

    // 2. DELETE CAMPAIGN COST
    if (action === "delete_cost") {
      const { costId } = body;
      if (!costId) {
        return NextResponse.json({ error: "costId wajib disertakan." }, { status: 400 });
      }
      await deleteCampaignCost(costId);
      return NextResponse.json({ success: true });
    }

    // 3. ASSIGN SUBMISSION CONTENT CATEGORY
    if (action === "assign_category") {
      const { submissionId, category } = body;
      if (!submissionId || !category) {
        return NextResponse.json(
          { error: "submissionId dan category wajib disertakan." },
          { status: 400 }
        );
      }

      if (!CONTENT_CATEGORIES.includes(category as ContentCategory)) {
        return NextResponse.json(
          { error: `Kategori tidak valid. Pilihan: ${CONTENT_CATEGORIES.join(", ")}` },
          { status: 400 }
        );
      }

      await assignSubmissionCategory(submissionId, category as ContentCategory);
      return NextResponse.json({ success: true });
    }

    // 4. FINALIZE / REVISE QUARTERLY SNAPSHOT
    if (action === "finalize_snapshot") {
      const { year, quarter, revisionReason } = body;

      if (!year || !quarter) {
        return NextResponse.json(
          { error: "year dan quarter wajib disertakan." },
          { status: 400 }
        );
      }

      const existingSnapshots = await fetchQuarterlySnapshots(Number(year), quarter as QuarterName);
      const isRevision = existingSnapshots.length > 0;

      if (isRevision && (!revisionReason || !revisionReason.trim())) {
        return NextResponse.json(
          { error: "Alasan revisi (revisionReason) wajib diisi untuk memperbarui snapshot yang sudah ada." },
          { status: 400 }
        );
      }

      const latestData = await fetchQuarterlyAnalytics(Number(year), quarter as QuarterName);
      const nextVersion = isRevision ? existingSnapshots[0].version + 1 : 1;
      const status = isRevision ? "revised" : "finalized";
      const nowIso = new Date().toISOString();

      const snapshot = await saveQuarterlySnapshot({
        year: Number(year),
        quarter: quarter as QuarterName,
        version: nextVersion,
        status,
        kpiData: latestData.kpis,
        platformData: latestData.platformComparison,
        costData: latestData.rewardCosts,
        monthlyData: latestData.monthlyBreakdown,
        contentData: latestData.contentFormats,
        methodologyVersion: "v1.0",
        cutoffAt: nowIso,
        finalizedBy: authCheck.user.id,
        finalizedAt: nowIso,
        revisionReason: isRevision ? revisionReason.trim() : null,
      });

      return NextResponse.json({ success: true, snapshot });
    }

    return NextResponse.json({ error: `Aksi '${action}' tidak dikenali.` }, { status: 400 });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "digest" in error) {
      throw error;
    }
    console.error("Admin Analytics POST Error:", error);
    const msg = error instanceof Error ? error.message : "Gagal memproses aksi analitik.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
