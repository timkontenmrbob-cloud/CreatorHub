import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { Database } from "@/lib/types/database";

export async function GET() {
  const { url, publishableKey, isConfigured } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfigured) {
    return NextResponse.json({ error: "Database belum dikonfigurasi." }, { status: 503 });
  }

  // 1. Authenticate caller
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

  // Use service role for privileged admin checks and management
  const adminClient = createAdminClient(url, serviceKey || publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Check if caller is Super Admin
  const { data: callerRole } = await adminClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuper =
    user.email === "leadersosmed@gmail.com" ||
    callerRole?.role === "superadmin" ||
    callerRole?.role === "super_admin";

  if (!isSuper) {
    return NextResponse.json(
      { error: "Akses ditolak. Fitur ini hanya dapat diakses oleh Super Admin." },
      { status: 403 }
    );
  }

  // 3. Fetch users and roles
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, email, full_name, avatar_url, created_at")
    .order("created_at", { ascending: false });

  const { data: adminRoles } = await adminClient.from("admin_roles").select("user_id, role");
  const roleMap = new Map<string, string>();
  for (const r of adminRoles || []) {
    roleMap.set(r.user_id, r.role);
  }

  const users = (profiles || []).map((p) => {
    const rawRole = roleMap.get(p.id);
    let role = "creator";
    let isSuperAdmin = false;

    if (rawRole === "superadmin" || rawRole === "super_admin" || p.email === "leadersosmed@gmail.com") {
      role = "super_admin";
      isSuperAdmin = true;
    } else if (rawRole === "admin") {
      role = "admin";
    }

    return {
      id: p.id,
      email: p.email,
      fullName: p.full_name || p.email.split("@")[0] || "User",
      avatarUrl: p.avatar_url,
      role,
      isSuperAdmin,
      createdAt: p.created_at,
    };
  });

  // 4. Fetch audit logs if available
  let auditLogs: Array<{
    id: string;
    target_user_id: string;
    target_email: string;
    action: string;
    performed_by: string;
    performed_by_email: string;
    notes?: string;
    created_at: string;
  }> = [];

  try {
    const { data: logs } = await adminClient
      .from("admin_role_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (logs) auditLogs = logs;
  } catch {
    // Non-fatal if table not yet migrated
  }

  return NextResponse.json({ users, auditLogs });
}

export async function POST(request: NextRequest) {
  const { url, publishableKey, isConfigured } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isConfigured || !serviceKey) {
    return NextResponse.json({ error: "Layanan database belum siap." }, { status: 503 });
  }

  // 1. Authenticate caller
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
    return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
  }

  const adminClient = createAdminClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 2. Strict Super Admin check
  const { data: callerRole } = await adminClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const isSuper =
    user.email === "leadersosmed@gmail.com" ||
    callerRole?.role === "superadmin" ||
    callerRole?.role === "super_admin";

  if (!isSuper) {
    return NextResponse.json(
      { error: "Akses ditolak. Hanya Super Admin yang berhak mengubah hak akses tim." },
      { status: 403 }
    );
  }

  // 3. Parse input
  const body = await request.json().catch(() => ({}));
  const { action, targetUserId, notes } = body;

  if (!action || !targetUserId) {
    return NextResponse.json(
      { error: "Parameter action dan targetUserId wajib diisi." },
      { status: 400 }
    );
  }

  // Fetch target user info
  const { data: targetProfile } = await adminClient
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: "Pengguna target tidak ditemukan." }, { status: 404 });
  }

  // Self-protection & Super Admin protection
  if (targetProfile.email === "leadersosmed@gmail.com") {
    return NextResponse.json(
      { error: "Akun Super Admin utama terlindungi dan hak aksesnya tidak dapat diubah atau dicabut." },
      { status: 400 }
    );
  }

  if (targetUserId === user.id && action === "revoke_admin") {
    return NextResponse.json(
      { error: "Anda tidak dapat mencabut hak akses Anda sendiri." },
      { status: 400 }
    );
  }

  if (action === "assign_admin") {
    // Assign admin role (uses 'admin' which is universally allowed)
    const { error: upsertErr } = await adminClient.from("admin_roles").upsert({
      user_id: targetUserId,
      role: "admin",
    });

    if (upsertErr) {
      console.error("Failed to assign admin:", upsertErr);
      return NextResponse.json({ error: "Gagal menetapkan hak akses admin." }, { status: 500 });
    }

    // Try record audit log
    try {
      await adminClient.from("admin_role_audit_logs").insert({
        target_user_id: targetUserId,
        target_email: targetProfile.email,
        action: "assign_admin",
        performed_by: user.id,
        performed_by_email: user.email || "superadmin",
        notes: notes || "Pemberian hak akses Admin oleh Super Admin",
      });
    } catch (logErr) {
      console.warn("Audit log insert skipped:", logErr);
    }

    return NextResponse.json({
      success: true,
      action: "assign_admin",
      targetUserId,
      newRole: "admin",
      message: `Pengguna ${targetProfile.full_name || targetProfile.email} berhasil dijadikan Admin.`,
    });
  } else if (action === "revoke_admin") {
    // Revoke admin access by deleting from admin_roles
    const { error: deleteErr } = await adminClient
      .from("admin_roles")
      .delete()
      .eq("user_id", targetUserId);

    if (deleteErr) {
      console.error("Failed to revoke admin:", deleteErr);
      return NextResponse.json({ error: "Gagal mencabut hak akses admin." }, { status: 500 });
    }

    // Try record audit log
    try {
      await adminClient.from("admin_role_audit_logs").insert({
        target_user_id: targetUserId,
        target_email: targetProfile.email,
        action: "revoke_admin",
        performed_by: user.id,
        performed_by_email: user.email || "superadmin",
        notes: notes || "Pencabutan hak akses Admin oleh Super Admin",
      });
    } catch (logErr) {
      console.warn("Audit log insert skipped:", logErr);
    }

    return NextResponse.json({
      success: true,
      action: "revoke_admin",
      targetUserId,
      newRole: "creator",
      message: `Hak akses Admin untuk ${targetProfile.full_name || targetProfile.email} berhasil dicabut. Akun kembali menjadi Creator.`,
    });
  } else {
    return NextResponse.json({ error: "Action tidak dikenal." }, { status: 400 });
  }
}
