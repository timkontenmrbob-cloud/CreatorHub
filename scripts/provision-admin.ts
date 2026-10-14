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
  const targetEmail = process.argv[2];

  if (!targetEmail || !targetEmail.includes("@")) {
    console.error("❌ Error: Harap sertakan email akun target yang valid.");
    console.error("   Contoh: npx tsx scripts/provision-admin.ts admin@mrbobkampunginggris.com");
    process.exit(1);
  }

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

  console.log(`🔍 Mencari akun dengan email: ${targetEmail}...`);

  // 1. Find user in auth.users using Admin API
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("❌ Gagal mengambil daftar pengguna dari Supabase Auth:", listError.message);
    process.exit(1);
  }

  const targetUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
  );

  if (!targetUser) {
    console.error(`❌ Pengguna dengan email "${targetEmail}" belum terdaftar di Supabase Auth.`);
    console.error("   Silakan daftarkan akun terlebih dahulu melalui halaman /register.");
    process.exit(1);
  }

  const userId = targetUser.id;
  console.log(`✅ Akun ditemukan! UID: ${userId}`);

  // 2. Insert or upsert into protected admin_roles table
  const { error: roleError } = await supabase.from("admin_roles").upsert({
    user_id: userId,
    role: "admin",
  });

  if (roleError) {
    console.error("❌ Gagal menetapkan role admin di tabel admin_roles:", roleError.message);
    process.exit(1);
  }

  console.log("==================================================================");
  console.log("🎉 SUKSES! Hak akses Administrator berhasil diberikan.");
  console.log(`   User ID : ${userId}`);
  console.log(`   Email   : ${targetUser.email}`);
  console.log(`   Role    : admin`);
  console.log("==================================================================");
}

provisionAdmin().catch((err) => {
  console.error("❌ Terjadi kesalahan fatal:", err);
  process.exit(1);
});
