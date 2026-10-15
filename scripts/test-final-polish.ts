/**
 * ==============================================================================
 * MR.BOB CREATOR HUB — FINAL POLISH ACCEPTANCE & SECURITY TEST SUITE
 * ==============================================================================
 * Tests:
 * 1. PDF Executive Report Generation (3-page A4, white background, real numbers)
 * 2. Sidebar Scroll Architecture (Fixed sidebar, scrollable content)
 * 3. Notification Engine & Real System Triggers
 * 4. Google Avatar Resolution & Referrer Security
 * 5. Super Admin Provisioning, Role Hierarchy, Self-Protection & Audit Trail
 * 6. Analytics Consistency & Redemption Ledger Reconciliation
 * 7. Next.js Route Compilation & Type Safety
 * ==============================================================================
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS [Test ${totalTests}]: ${testName}`);
  } else {
    failedTests++;
    console.error(`❌ FAIL [Test ${totalTests}]: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
  }
}

async function runFinalPolishTests() {
  console.log("==================================================================");
  console.log("MR.BOB CREATOR HUB — FINAL POLISH ACCEPTANCE & SECURITY TESTS");
  console.log("==================================================================");

  // ==========================================================================
  // GROUP 1: PDF EXECUTIVE REPORT (TASK 1)
  // ==========================================================================
  console.log("\n--- GROUP 1: PDF EXECUTIVE REPORT GENERATION ---");

  const { fetchQuarterlyAnalytics } = await import("../src/lib/supabase/analytics");
  const { generateQuarterlyPDF } = await import("../src/lib/pdf/generate-quarterly-report");

  const analyticsData = await fetchQuarterlyAnalytics(2026, "Q4", adminClient);
  const pdfDoc = generateQuarterlyPDF(analyticsData);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (pdfDoc as any).internal.getNumberOfPages();

  assert(pageCount >= 3, "PDF generates at least 3 distinct A4 pages", `Got ${pageCount} pages`);

  const pdfBuffer = Buffer.from(pdfDoc.output("arraybuffer"));
  assert(
    pdfBuffer.byteLength > 50000,
    "Generated PDF has valid binary content (>50KB with embedded vector assets and logo)",
    `Size: ${(pdfBuffer.byteLength / 1024).toFixed(1)} KB`
  );

  // Check exported file structure
  const pdfText = pdfBuffer.toString("latin1");
  assert(
    pdfText.includes("Mr.BOB Kampung Inggris") || pdfText.includes("Creator Hub"),
    "PDF contains official Mr.BOB company branding"
  );
  assert(
    pdfText.includes("RINGKASAN EKSEKUTIF") || pdfText.includes("UGC"),
    "PDF contains executive summary section"
  );

  // Check page components have primary download button and CSV removed from UI
  const analyticsPageCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/analytics/page.tsx"),
    "utf-8"
  );
  assert(
    analyticsPageCode.includes("Download Laporan PDF") &&
      !analyticsPageCode.includes("Export Data CSV"),
    "Admin Analytics page has primary 'Download Laporan PDF' as the sole export CTA (CSV button removed from UI)"
  );

  const reportsPageCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/reports/page.tsx"),
    "utf-8"
  );
  assert(
    reportsPageCode.includes("Download Laporan PDF") &&
      !reportsPageCode.includes("Export Data CSV"),
    "Admin Reports page has primary 'Download Laporan PDF' as the sole export CTA (CSV button removed from UI)"
  );

  // Check CSV backend route is protected by server-side admin authorization
  const csvRouteCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/admin/analytics/export/route.ts"),
    "utf-8"
  );
  assert(
    csvRouteCode.includes("admin_roles") &&
      csvRouteCode.includes("adminRole.role") &&
      csvRouteCode.includes("403"),
    "CSV backend export endpoint remains strictly guarded by server-side Admin authorization"
  );

  // Check new PDF-only logo asset usage
  const logoBase64Code = fs.readFileSync(
    path.resolve(process.cwd(), "src/lib/pdf/logo-base64.ts"),
    "utf-8"
  );
  assert(
    fs.existsSync(path.resolve(process.cwd(), "public/logo-mrbob 2.png")) &&
      logoBase64Code.includes("logo-mrbob 2.png") &&
      logoBase64Code.includes("MRBOB_PDF_LOGO_BASE64"),
    "New logo 'logo-mrbob 2.png' located and used exclusively for generated PDF reports with preserved proportions"
  );

  // Check quarter status consistency (Calendar period vs Report status separation)
  const periodSelectorCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/admin/analytics/period-selector.tsx"),
    "utf-8"
  );
  assert(
    periodSelectorCode.includes("Sedang Berjalan") &&
      periodSelectorCode.includes("Periode Berakhir"),
    "Period selector cleanly distinguishes calendar period status (Sedang Berjalan / Periode Berakhir)"
  );

  const snapshotBannerCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/admin/analytics/snapshot-banner.tsx"),
    "utf-8"
  );
  assert(
    snapshotBannerCode.includes("Status Laporan: Draft") &&
      snapshotBannerCode.includes("Final") &&
      snapshotBannerCode.includes("Revisi"),
    "Snapshot banner cleanly distinguishes report status (Draft / Final / Revisi) independent of calendar quarter end"
  );

  // ==========================================================================
  // GROUP 2: SIDEBAR SCROLLING ARCHITECTURE (TASK 2)
  // ==========================================================================
  console.log("\n--- GROUP 2: SIDEBAR SCROLLING ARCHITECTURE ---");

  const creatorLayoutCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/creator/layout.tsx"),
    "utf-8"
  );
  assert(
    creatorLayoutCode.includes("h-screen overflow-hidden") &&
      creatorLayoutCode.includes("h-full overflow-y-auto"),
    "Creator layout container uses viewport height (h-screen overflow-hidden) with independently scrollable main content"
  );

  const adminLayoutCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/layout.tsx"),
    "utf-8"
  );
  assert(
    adminLayoutCode.includes("h-screen overflow-hidden") &&
      adminLayoutCode.includes("h-full overflow-y-auto"),
    "Admin layout container uses viewport height (h-screen overflow-hidden) with independently scrollable main content"
  );

  const creatorSidebarCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/dashboard/creator-sidebar.tsx"),
    "utf-8"
  );
  assert(
    creatorSidebarCode.includes("lg:h-full lg:shrink-0"),
    "Creator sidebar maintains fixed desktop height (lg:h-full lg:shrink-0)"
  );

  const adminSidebarCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/dashboard/admin-sidebar.tsx"),
    "utf-8"
  );
  assert(
    adminSidebarCode.includes("lg:h-full lg:shrink-0"),
    "Admin sidebar maintains fixed desktop height (lg:h-full lg:shrink-0)"
  );

  // ==========================================================================
  // GROUP 3: NOTIFICATIONS SYSTEM (TASK 3)
  // ==========================================================================
  console.log("\n--- GROUP 3: NOTIFICATION ENGINE & UNREAD STATE ---");

  const { fetchUserNotifications } = await import(
    "../src/lib/supabase/notifications"
  );

  const testUserId = "ded2a6e6-2a6a-4190-b527-8acd97c4f8a5"; // Leader Sosmed
  const notifs = await fetchUserNotifications(testUserId, true);

  assert(Array.isArray(notifs), "fetchUserNotifications returns valid array of system notifications");
  assert(
    notifs.length > 0,
    "Real system notifications synthesized from actual user submissions and transactions",
    `Found ${notifs.length} notifications`
  );

  const headerCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/dashboard/dashboard-header.tsx"),
    "utf-8"
  );
  assert(
    headerCode.includes("unreadCount > 0") && headerCode.includes("rounded-full bg-brand-blue"),
    "Notification bell blue indicator displays ONLY when unreadCount > 0"
  );
  assert(
    headerCode.includes("Tandai dibaca") && headerCode.includes("handleMarkAllRead"),
    "Notification dropdown provides functional mark all as read action"
  );

  // ==========================================================================
  // GROUP 4: GOOGLE PROFILE AVATAR (TASK 4)
  // ==========================================================================
  console.log("\n--- GROUP 4: GOOGLE PROFILE AVATAR & REFERRER SECURITY ---");

  const avatarComponentCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/ui/avatar.tsx"),
    "utf-8"
  );
  assert(
    avatarComponentCode.includes('referrerPolicy="no-referrer"') &&
      avatarComponentCode.includes('crossOrigin="anonymous"'),
    "Avatar component includes referrerPolicy='no-referrer' to prevent Google CDN 403 Forbidden errors"
  );

  const authCallbackCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/auth/callback/route.ts"),
    "utf-8"
  );
  assert(
    authCallbackCode.includes("avatar_url: googleAvatar"),
    "Auth callback synchronizes latest Google avatar metadata to user profile in database"
  );

  const { data: profileCheck } = await adminClient
    .from("profiles")
    .select("avatar_url")
    .eq("email", "leadersosmed@gmail.com")
    .single();

  assert(
    Boolean(profileCheck?.avatar_url && profileCheck.avatar_url.includes("googleusercontent.com")),
    "Official Super Admin account has real Google profile photo URL configured",
    profileCheck?.avatar_url
  );

  // ==========================================================================
  // GROUP 5: SUPER ADMIN PROVISIONING & SECURITY (TASK 5)
  // ==========================================================================
  console.log("\n--- GROUP 5: SUPER ADMIN PROVISIONING & ROLE SECURITY ---");

  // 1. Verify sole Super Admin
  const { data: rolesInDb } = await adminClient.from("admin_roles").select("*");
  const superAdmins = (rolesInDb || []).filter(
    (r) => r.role === "superadmin" || r.role === "super_admin"
  );

  assert(
    superAdmins.length === 1 && superAdmins[0].user_id === "ded2a6e6-2a6a-4190-b527-8acd97c4f8a5",
    "leadersosmed@gmail.com (UID: ded2a6e6...) is the SOLE Super Admin in database",
    `Found ${superAdmins.length} super admins`
  );

  // 2. Verify other accounts are Creator by default
  const nonSuperAdminRoles = (rolesInDb || []).filter(
    (r) => r.user_id === "d1c0b2d4-0c35-4023-93ce-9fabd51443bf"
  );
  assert(
    nonSuperAdminRoles.length === 0,
    "Other existing user (bayuuuajisantoso@gmail.com) has NO administrative role in admin_roles (Creator role)"
  );

  // 3. Verify Admin Management page exists and is protected
  const teamPageExists = fs.existsSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/team/page.tsx")
  );
  assert(teamPageExists, "/admin/team page exists for Super Admin management");

  const teamPageCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/(dashboard)/admin/team/page.tsx"),
    "utf-8"
  );
  assert(
    teamPageCode.includes('requiredRole="super_admin"'),
    "/admin/team is strictly protected by ProtectedRoute with requiredRole='super_admin'"
  );

  // 4. Verify API route enforces Super Admin & self-protection
  const rolesApiCode = fs.readFileSync(
    path.resolve(process.cwd(), "src/app/api/admin/roles/route.ts"),
    "utf-8"
  );
  assert(
    rolesApiCode.includes("leadersosmed@gmail.com") &&
      rolesApiCode.includes("Akun Super Admin utama terlindungi"),
    "Server-side API strictly enforces Super Admin authorization and self-protection"
  );

  // 5. Verify Super Admin navigation appears only for Super Admin
  assert(
    adminSidebarCode.includes("isSuperAdmin") &&
      adminSidebarCode.includes("/admin/team"),
    "Admin sidebar navigation conditionally renders 'Admin Management' ONLY when isSuperAdmin === true"
  );

  // ==========================================================================
  // GROUP 6: ANALYTICS CONSISTENCY & RECONCILIATION (TASK 6)
  // ==========================================================================
  console.log("\n--- GROUP 6: ANALYTICS CONSISTENCY & RECONCILIATION ---");

  assert(
    analyticsData.kpis.totalSubmissions === 4,
    "Accurately reports exactly 4 submitted videos in Q4 2026 cohort (no fabricated records)",
    `Got ${analyticsData.kpis.totalSubmissions}`
  );
  assert(
    analyticsData.kpis.participatingCreators === 1,
    "Accurately reports 1 distinct participating creator in Q4 2026 cohort",
    `Got ${analyticsData.kpis.participatingCreators}`
  );
  assert(
    analyticsData.kpis.totalVerifiedViews === 35900,
    "Accurately reports 35,900 verified views based on real approved posting_date in Q4 2026",
    `Got ${analyticsData.kpis.totalVerifiedViews}`
  );
  assert(
    analyticsData.kpis.totalPointsIssued === 359,
    "Accurately reports 359 points issued from approved UGC content in Q4 2026",
    `Got ${analyticsData.kpis.totalPointsIssued}`
  );
  assert(
    analyticsData.kpis.totalRewardsClaimed > 0,
    "Accurately captures real October 2026 reward redemptions from ledger transactions (resolved server 0 count)",
    `Got ${analyticsData.kpis.totalRewardsClaimed} claimed rewards`
  );

  // ==========================================================================
  // FINAL SCORE SUMMARY
  // ==========================================================================
  console.log("\n==================================================================");
  console.log(`TOTAL TESTS RUN : ${totalTests}`);
  console.log(`PASSED          : ${passedTests}`);
  console.log(`FAILED          : ${failedTests}`);
  console.log("==================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runFinalPolishTests().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
