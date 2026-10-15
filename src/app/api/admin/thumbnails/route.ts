import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { uploadAdminThumbnail, deleteAdminThumbnail } from "@/lib/supabase/thumbnails";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin authorization
    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperEmail = user.email === "leadersosmed@gmail.com";
    const hasAdminRole = adminRole && ["admin", "superadmin", "super_admin"].includes(adminRole.role);

    if (!isSuperEmail && !hasAdminRole) {
      return NextResponse.json(
        { error: "Forbidden: Hanya admin yang dapat mengelola thumbnail video." },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const submissionId = formData.get("submissionId") as string;
    const file = formData.get("file") as File;

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId wajib disertakan." },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "File thumbnail wajib diunggah." },
        { status: 400 }
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 2 MB." },
        { status: 400 }
      );
    }

    const mime = file.type || "";
    if (!["image/jpeg", "image/png", "image/webp"].includes(mime)) {
      return NextResponse.json(
        { error: "Format file harus berupa JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }

    const publicUrl = await uploadAdminThumbnail(submissionId, file, user.id, supabase);

    return NextResponse.json({
      success: true,
      thumbnailUrl: publicUrl,
      source: "manual",
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }
    console.error("Admin thumbnail upload error:", error);
    const msg = error instanceof Error ? error.message : "Gagal mengunggah thumbnail.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminRole } = await supabase
      .from("admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const isSuperEmail = user.email === "leadersosmed@gmail.com";
    const hasAdminRole = adminRole && ["admin", "superadmin", "super_admin"].includes(adminRole.role);

    if (!isSuperEmail && !hasAdminRole) {
      return NextResponse.json(
        { error: "Forbidden: Hanya admin yang dapat mengelola thumbnail video." },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const submissionId = searchParams.get("submissionId");

    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId wajib disertakan." },
        { status: 400 }
      );
    }

    await deleteAdminThumbnail(submissionId, supabase);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      (error as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
    ) {
      throw error;
    }
    console.error("Admin thumbnail delete error:", error);
    return NextResponse.json(
      { error: "Gagal menghapus thumbnail." },
      { status: 500 }
    );
  }
}
