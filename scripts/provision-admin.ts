/**
 * ==============================================================================
 * MR.BOB CREATOR HUB — SECURE ADMINISTRATOR PROVISIONING SCRIPT
 * ==============================================================================
 * Usage:
 *   npx tsx scripts/provision-admin.ts <target-user-email>
 *
 * Description:
 *   Provisions trusted administrative privileges to an explicitly specified user.
 *   Uses the Supabase Service Role Key to insert into the protected admin_roles
 *   table. This script runs ONLY in a trusted server/CLI environment.
 *   Never expose this capability through public HTTP API endpoints.
 * ==============================================================================
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function provisionAdmin() {
  const targetArg = process.argv[2]?.trim();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Error: Kredensial Supabase Service Role belum dikonfigurasi.");
    console.error("   Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY tersedia di .env.local");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all users and active admin roles
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("❌ Gagal mengambil daftar pengguna dari Supabase Auth:", listError.message);
    process.exit(1);
  }

  const { data: adminList } = await supabase.from("admin_roles").select("user_id, role");
  const adminIds = new Set((adminList || []).map((a) => a.user_id));

  if (!targetArg) {
    console.log("==================================================================");
    console.log("MR.BOB CREATOR HUB — DAFTAR PENGGUNA TERDAFTAR");
    console.log("==================================================================");
    usersData.users.forEach((u, i) => {
      const isAdmin = adminIds.has(u.id);
      console.log(
        `${i + 1}. [${isAdmin ? "ADMIN" : "CREATOR"}] ${u.email} (UID: ${u.id})`
      );
    });
    console.log("==================================================================");
    console.log("💡 Cara memberikan hak akses Administrator:");
    console.log("   npx tsx scripts/provision-admin.ts <email-atau-uid>");
    console.log("   Contoh: npx tsx scripts/provision-admin.ts bayuuuajisantoso@gmail.com");
    console.log("==================================================================");
    return;
  }

  console.log(`🔍 Mencari akun: "${targetArg}"...`);

  // Find user by email or by id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetArg);
  const targetUser = usersData.users.find((u) =>
    isUuid ? u.id === targetArg : u.email?.toLowerCase() === targetArg.toLowerCase()
  );

  if (!targetUser) {
    console.error(`❌ Pengguna "${targetArg}" tidak ditemukan di Supabase Auth.`);
    console.error("   Pastikan akun sudah mendaftar terlebih dahulu via Google Sign-In atau /register.");
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`✅ Akun ditemukan! Email: ${targetUser.email} | UID: ${userId}`);

  // Upsert into protected admin_roles table
  const { error: roleError } = await supabase.from("admin_roles").upsert({
    user_id: userId,
    role: "admin",
  });

  if (roleError) {
    console.error("❌ Gagal menetapkan role admin di tabel admin_roles:", roleError.message);
    process.exit(1);
  }

  // Ensure profile exists and is marked completed
  await supabase
    .from("profiles")
    .update({ profile_completed: true })
    .eq("id", userId);

  console.log("==================================================================");
  console.log("🎉 SUKSES! Hak akses Administrator resmi diberikan.");
  console.log(`   User ID : ${userId}`);
  console.log(`   Email   : ${targetUser.email}`);
  console.log(`   Role    : admin`);
  console.log("   Akses   : /admin/dashboard");
  console.log("==================================================================");
}

provisionAdmin().catch((err) => {
  console.error("❌ Terjadi kesalahan fatal:", err);
  process.exit(1);
});
