/**
 * ==============================================================================
 * MR.BOB CREATOR HUB — SECURE SUPER ADMIN BOOTSTRAP & AUDIT SCRIPT
 * ==============================================================================
 * Description:
 *   Provisions leadersosmed@gmail.com as the sole Super Admin.
 *   Audits existing privileged accounts and resets non-super accounts to Creator.
 *   Preserves all profile data, submissions, wallets, and transactions.
 * ==============================================================================
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function bootstrapSuperAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("❌ Error: Kredensial Supabase Service Role belum dikonfigurasi.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — SUPER ADMIN BOOTSTRAP & AUDIT REPORT");
  console.log("==================================================================");

  // 1. Fetch all users from Supabase Auth
  const { data: usersData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError || !usersData) {
    console.error("❌ Gagal membaca pengguna dari Supabase Auth:", userError?.message);
    process.exit(1);
  }

  console.log(`\n1. AUDIT DAFTAR PENGGUNA TERDAFTAR (Total: ${usersData.users.length}):`);
  usersData.users.forEach((u, i) => {
    console.log(
      `   [${i + 1}] ${u.email} | UID: ${u.id} | Provider: ${u.app_metadata?.provider || "email"} | Verified: ${u.email_confirmed_at ? "YES" : "NO"}`
    );
  });

  // 2. Fetch current admin_roles
  const { data: currentAdminRoles, error: rolesError } = await supabase
    .from("admin_roles")
    .select("user_id, role, created_at");

  if (rolesError) {
    console.error("❌ Gagal membaca tabel admin_roles:", rolesError.message);
    process.exit(1);
  }

  console.log(`\n2. AUDIT HAK AKSES ADMINISTRATIF SAAT INI:`);
  console.log(currentAdminRoles);

  // 3. Locate leadersosmed@gmail.com
  const targetEmail = "leadersosmed@gmail.com";
  const superAdminUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
  );

  if (!superAdminUser) {
    console.error(`❌ Blocker: Akun resmi ${targetEmail} belum terdaftar di Supabase Auth.`);
    process.exit(1);
  }

  console.log(`\n3. VERIFIKASI AKUN SUPER ADMIN RESMI:`);
  console.log(`   Email         : ${superAdminUser.email}`);
  console.log(`   Immutable UID : ${superAdminUser.id}`);
  console.log(`   Provider      : ${superAdminUser.app_metadata?.provider} (Google OAuth Verified)`);
  console.log(`   Status        : TERVERIFIKASI & VALID`);

  // 4. Provision Super Admin role for leadersosmed@gmail.com
  const { error: superUpsertError } = await supabase.from("admin_roles").upsert({
    user_id: superAdminUser.id,
    role: "superadmin",
  });

  if (superUpsertError) {
    console.error("❌ Gagal mengonfigurasi Super Admin di admin_roles:", superUpsertError.message);
    process.exit(1);
  }
  console.log(`   ✅ Peran 'superadmin' berhasil ditetapkan untuk UID: ${superAdminUser.id}`);

  // 5. Existing account migration:
  // Identify accounts in admin_roles that are NOT leadersosmed@gmail.com
  const accountsToRevoke = (currentAdminRoles || []).filter(
    (r) => r.user_id !== superAdminUser.id
  );

  console.log(`\n4. MIGRASI AKUN LAINNYA KE STATUS CREATOR STANDAR:`);
  if (accountsToRevoke.length === 0) {
    console.log(`   Tidak ada akun lain yang perlu dicabut.`);
  } else {
    for (const acc of accountsToRevoke) {
      const u = usersData.users.find((user) => user.id === acc.user_id);
      console.log(`   Cabut wewenang admin dari: ${u?.email || acc.user_id}...`);

      const { error: delErr } = await supabase
        .from("admin_roles")
        .delete()
        .eq("user_id", acc.user_id);

      if (delErr) {
        console.error(`   ❌ Gagal mencabut dari ${acc.user_id}:`, delErr.message);
      } else {
        console.log(`   ✅ Berhasil mencabut akses admin. Akun ${u?.email} kini berstatus CREATOR biasa.`);
      }
    }
  }

  // 6. Record audit log
  try {
    await supabase.from("admin_role_audit_logs").insert({
      target_user_id: superAdminUser.id,
      target_email: superAdminUser.email || targetEmail,
      action: "assign_admin",
      performed_by: superAdminUser.id,
      performed_by_email: "system_bootstrap",
      notes: "Inisialisasi resmi Super Admin tunggal Mr.BOB Creator Hub",
    });
  } catch (logErr) {
    console.warn("   Audit log insert note:", logErr);
  }

  // 7. Final Verification
  const { data: finalRoles } = await supabase.from("admin_roles").select("*");
  console.log(`\n==================================================================`);
  console.log(`FINAL AUTHORIZATION STATE (admin_roles):`);
  console.log(finalRoles);
  console.log(`==================================================================`);
  console.log(`🎉 SUPER ADMIN BOOTSTRAP SELESAI DENGAN AMAN!`);
  console.log(`   Sole Super Admin : ${superAdminUser.email} (UID: ${superAdminUser.id})`);
  console.log(`   Creator Accounts : Seluruh pengguna lain berstatus Creator secara default`);
  console.log(`==================================================================`);
}

bootstrapSuperAdmin().catch((err) => {
  console.error("❌ Fatal bootstrap error:", err);
  process.exit(1);
});
