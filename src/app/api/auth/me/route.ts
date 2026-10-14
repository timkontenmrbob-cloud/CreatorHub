import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized: Sesi tidak ditemukan atau telah kadaluarsa." },
      { status: 401 }
    );
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Check admin role securely server-side
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role =
    adminRole && (adminRole.role === "admin" || adminRole.role === "superadmin")
      ? "admin"
      : "creator";

  return NextResponse.json({
    authenticated: true,
    uid: user.id,
    email: user.email,
    role,
    user: profile,
  });
}
