# PHASE PROGRESS — MR.BOB CREATOR HUB

## Phase Tracker

| Phase | Description | Status | Completion Date |
|---|---|---|---|
| **Phase 0** | Architecture & Project Setup | **COMPLETED** | 2026-10-14 |
| **Phase 1** | UI Foundation & Landing Polish | **COMPLETED** | 2026-10-14 |
| **Checkpoint 1.5** | Firebase to Supabase Migration & Google OAuth | **COMPLETED** | 2026-10-14 |
| **Phase 2** | Creator Dashboard & Point Wallet | **COMPLETED** | 2026-10-14 |
| **Checkpoint 2** | Real Database Verification & Point Issuance Security Audit | **COMPLETED** | 2026-10-14 |
| **Phase 3** | Submit Content System & My Contents | **COMPLETED** | 2026-10-14 |
| **Phase 4** | Admin Verification & Review System | **COMPLETED** | 2026-10-14 |
| **Phase 5** | Reward Shop & Redemptions | **COMPLETED** | 2026-10-15 |
| **Phase 6** | Leaderboard & Top Performers | **COMPLETED** | 2026-10-15 |
| **Phase 7** | Quarterly UGC Analytics & Reporting | **COMPLETED** | 2026-10-15 |
| **Phase 8** | Testing, Hardening & Deployment | *Pending* | — |

---

## Phase 5 Deliverables Summary — Reward Shop & Redemption System

### A. Wallet UI Refinement (`/creator/my-points`)
- [x] **Natural Indonesian Terminology:** Renamed sections to "Riwayat Poin" and "Poin & Masa Berlaku".
- [x] **Removed Technical Jargon:** Completely removed "Immutable Ledger" text and the entire "Referensi / Idempotency" column from creator view.
- [x] **Friendly Transaction Labels:** Mapped raw types (`earned` -> Poin Masuk, `redeemed` -> Penukaran Hadiah, `expired` -> Poin Kadaluarsa, `adjustment` -> Penyesuaian Poin, `bonus` -> Bonus Poin).
- [x] **Humanized Source Attribution:** Replaced internal UUIDs with readable sources ("Konten Instagram", "Konten TikTok", "Bonus dari Admin") accompanied by clean external video links.
- [x] **Deterministic Sorting:**
  - Riwayat Poin: Newest transaction first (`created_at DESC, id DESC`).
  - Poin & Masa Berlaku (Semua / Aktif): Newest lot issuance first (`issued_at DESC, id DESC`).
  - Segera Berakhir: Earliest expiration first (`expires_at ASC, id ASC`) for active lots expiring within 30 days.

### B. Reward Shop (`/creator/reward-shop`)
- [x] **Official Catalog:** All 13 official Mr.BOB rewards loaded directly from database table `rewards` with correct point values (10 to 50.000 Poin).
- [x] **Clean E-Commerce Catalog UI:** 1:1 square image aspect ratio, 16-20px rounded cards, dark mode surfaces, no stock numbers, category badges, or filter pills on cards.
- [x] **Reward Detail & Live Eligibility:** Modal displays reward image, description, required points, creator's available balance, and live comparison badge (*"Poinmu cukup untuk reward ini"* vs *"Kurang X poin"*).
- [x] **Fulfillment Inputs:** Merchandise requires shipping address and active WhatsApp number; digital vouchers and class programs display clear instructions.
- [x] **Confirmation Dialog:** Final double-check prompt ("Tukarkan poinmu?") summarizing the transaction before execution.
- [x] **Success Dialog:** Displays celebratory prompt, points spent, remaining balance, and direct links to "Lihat Hadiah Saya" and "Kembali ke Reward Shop".

### C. Database Architecture & Redemption Engine
- [x] **Database Migration:** `20261015000001_create_reward_redemption_system.sql` introducing `rewards`, `redemptions`, and `redemption_allocations`.
- [x] **Atomic Stored Procedure:** `redeem_reward_atomic(p_creator_id, p_reward_id, ...)` executing point deduction, earliest-expiring lot consumption, ledger insertion, and allocation tracking in a single database transaction.
- [x] **Concurrency & Idempotency Protection:** Double-click and network retry deduplication via `p_idempotency_key` and unique transaction constraints.
- [x] **Admin Processing & Safe Refund:** Stored procedure `admin_process_redemption` supporting status updates (`processing`, `ready`, `completed`, `reject`) with mandatory rejection reason and automatic, safe point refund.

### D. My Rewards (`/creator/my-rewards`)
- [x] **Claimed Rewards List:** Displays creator's redemptions with 1:1 image thumbnails, reward names, points spent, requested dates, and clear Indonesian status badges (*Menunggu Diproses*, *Sedang Diproses*, *Siap Digunakan / Diambil*, *Selesai*, *Ditolak / Dibatalkan*).
- [x] **Fulfillment Feedback:** Renders admin fulfillment notes (resi, voucher codes, redemption locations) or rejection reasons.

### E. Admin Redemption Management (`/admin/redemptions`)
- [x] **Fulfillment Queue:** Status filter tabs, creator name & avatar, WhatsApp direct action links, shipping addresses, and status management modal.
- [x] **Status Progression:** Seamless transitions between fulfillment stages and rejection with point refund.

### G. Phase 5 Critical Bug Fixes & Redemption UX Refinement (Completed 2026-10-15)
- [x] **Task 1 — Shipping Cost Information:**
  - Added official notice to merchandise detail modal: *"Biaya ongkir ditanggung oleh peserta dan akan diinformasikan oleh admin sesuai alamat tujuan."*
  - Repeated clear shipping notice in the final confirmation dialog.
  - Zero shipping cost deducted from creator's point balance (points spent strictly equals required reward points).
  - No artificial courier pricing or fake checkout gateways; delivery coordinated directly via WhatsApp.
  - Shipping requirements strictly excluded for digital vouchers and class rewards.
- [x] **Task 2 — Reward Detail Modal Scrolling:**
  - Constrained modal container height to `max-h-[90dvh]` with `flex flex-col` and `overflow-hidden`.
  - Added sticky header with title and close button `X` pinned at the top.
  - Made modal body scrollable (`flex-1 overflow-y-auto overscroll-contain`) with touch, mouse, and trackpad support.
  - Pinned action buttons ("Batal" and "Tukarkan Poin") in a sticky bottom footer so they are always accessible on mobile and desktop.
  - Updated `Dialog` component to support `hideHeader` prop.
- [x] **Task 3 — Recipient Name & Form Validation Fix:**
  - Added mandatory `recipient_name` input prefilled with creator's display name (`user?.displayName`).
  - Added `recipient_name` column to database migration DDL and TypeScript interfaces.
  - Fixed form error persistence: clears validation error on `onChange` of `recipientName`, `shippingAddress`, and `contactWhatsapp`.
- [x] **Task 4 — Redemption Status Cross-Session Persistence:**
  - Diagnosed root cause: Supabase client methods return `{ data, error }` instead of throwing exceptions, causing silent failures on missing remote tables.
  - Added persistent fallback via `getStoredRedemptions()` and `saveStoredRedemptions()` with `localStorage` key `mrbob_redemptions_store_v2`.
  - Admin status transitions (`processing`, `ready`, `completed`, `rejected`) now persist across browser reloads and re-mounts.
- [x] **Task 5 — Critical: Rejection Handling & Strict Refund Idempotency:**
  - Rejection requires mandatory, non-empty `rejectionReason`.
  - Enforced strict refund idempotency by querying `point_transactions` for `idempotency_key = 'refund_redemption_' + id` or matching `adjustment` transaction before issuing refund.
  - Passing unique `p_idempotency_key` to `issue_points_lot`.
  - Disallows rejecting an already rejected or completed redemption.
  - Audited historical duplicate refund test records for user `ded2a6e6-2a6a-4190-b527-8acd97c4f8a5`.
- [x] **Task 6 — Admin & Creator Portal Consistency:**
  - Both portals display `recipientName` for merchandise rewards.
  - Admin process modal includes direct WhatsApp link (`wa.me`) for shipping fee coordination.
  - Both portals sort newest redemptions first.
- [x] **Test Verification:**
  - `test-phase5-redemptions.ts`: 25/25 passed.
  - `test-phase5-bugfixes.ts`: 35/35 passed.
  - Total 60 automated tests passing with 0 errors.
  - `npx tsc --noEmit` & `npm run lint` & `npm run build`: 100% clean with 0 errors.

---

## Phase 4 Deliverables Summary — Admin Verification & Automatic Point Issuance

### A. Admin Verification Dashboard (`/admin/verifications`)
- [x] **Verification Queue:** Displays creator name, avatar, email, platform badge, clickable external video link, claimed views, estimated/approved points, submission date, and verification status.
- [x] **Status Filters:** Tab navigation for *Semua*, *Menunggu* (`submitted`), *Sedang Direview* (`under_review`), *Perlu Bukti Tambahan* (`requires_revision`), *Disetujui* (`approved`), and *Ditolak* (`rejected`), with real-time counter badges.
- [x] **Search:** Instant search by creator name, creator email, or video URL.
- [x] **Verification Detail Inspection Modal / Drawer:**
  - Complete creator profile and video metadata display.
  - 30-Day Window Verification indicator (`diffDays` and eligibility check).
  - Private screenshot evidence loaded via temporary secure signed URLs (never permanent public URLs).
  - Full-size image preview / modal lightbox.
  - Retention status indicator (*Retensi Aktif*, *Jadwal Hapus 14 Hari*, *Terhapus*).
  - Admin evaluation form: verified views input (validated `<= claimed_views`), real-time point calculation display (`floor(views / 100)`), content validity & organic view integrity checklist, admin notes.
  - Audit log timeline showing historical administrative actions on the submission.

### B. Administrative Decision Workflows
- [x] **1. Approval Workflow (Setujui & Terbitkan Poin):**
  - Confirmation modal displaying creator, verified views, and points to issue.
  - Server-side authorization check (must be verified admin in `admin_roles`).
  - Atomic point lot creation in `point_lots` with 6 calendar months expiration.
  - Immutable transaction record in `point_transactions` with unique idempotency key (`submission_approval_<id>`).
  - Submission status updated to `approved` with `verified_views` and `approved_points`.
  - Evidence scheduled for deletion in 14 calendar days.
  - Audit log record created in `submission_audit_logs`.
- [x] **2. Rejection Workflow (Tolak Pengajuan):**
  - Rejection confirmation modal requiring a clear, professional reason.
  - Status updated to `rejected`, admin notes saved, no points issued.
  - Evidence scheduled for deletion in 14 calendar days.
  - Creator sees clear rejection reason in My Contents.
- [x] **3. Request Additional Evidence Workflow (Minta Bukti Tambahan):**
  - Modal with instructions textarea for the creator.
  - Status updated to `requires_revision`, evidence deletion postponed (*Retensi Aktif*).
  - Creator sees revision banner in My Contents and Dashboard with "Upload Bukti Tambahan" button.
  - Creator can upload new screenshot; locked video fields (URL, views, posting date) remain immutable.
  - On upload, status returns to `under_review` for re-verification.

### C. Automated Evidence Retention & Cleanup
- [x] **Retention Policy:**
  - Approved/Rejected: 14 calendar days after decision.
  - Pending/Under Review/Revision: Retained active.
  - Disputed: Deletion suspended (`retention_status = 'disputed'`).
- [x] **Cleanup Worker:**
  - Backend function `cleanupExpiredEvidence(limit)` and CLI runner `scripts/cleanup-evidence.ts`.
  - Scheduled API endpoint `/api/cron/cleanup-evidence` with `CRON_SECRET` authorization.
  - Removes files from Supabase Storage bucket `submission-evidence` and marks database records as `deleted`.

### D. Permanent Audit Trail
- [x] Immutable table `submission_audit_logs` tracking submission ID, admin ID, previous status, new status, verified views, approved points, decision reason, admin notes, and timestamps.
- [x] RLS policies: Admins can view all logs; creators can view logs for their own submissions; client updates/deletions strictly prohibited.

---

## Build & Test Verification
- Automated Unit & Integration Tests:
  - `scripts/test-phase5-redemptions.ts` — **25/25 PASSED** (Technical DB reference removal, newest-first & tie-breaker sorting, 13 official rewards, 10-50k points cost, insufficient balance lock, expired batch lock, earliest lot consumption, idempotency anti-duplicate, overspend prevention, ledger consistency, isolation, admin fulfillment & refund, Google Sign-in integrity, dark-mode design tokens).
  - `scripts/test-phase4-verification.ts` — **17/17 PASSED** (Queue, video URLs, signed URLs, 30-day window, views formula, atomic approval, wallet lot, 6-month expiration, single lot/transaction, idempotency, rejection without points, rejection reasons, revision workflow, creator isolation, 14-day retention, Phase 1-3 integrity).
  - `scripts/test-phase3-ux-fixes.ts` — **20/20 PASSED** (Submission UX, agreement, duplicate recovery, back navigation).
  - `scripts/test-submissions.ts` — **31/31 PASSED** (URL normalization, 30-day window boundaries, points formula).
  - `scripts/test-wallet.ts` — **18/18 PASSED** (Point wallet, expiration, ordered consumption, catalog).
- Evidence Cleanup Runner: `scripts/cleanup-evidence.ts` — **PASSED**.
- TypeScript Type Check: **0 ERRORS** (`npx tsc --noEmit`).
- ESLint: **0 ERRORS, 0 WARNINGS** (`npm run lint`).
- Next.js Production Build: **29/29 ROUTES GENERATED** cleanly in Next.js 16.4.0 Turbopack.

---

## Phase 1 Deliverables Summary

### A. Design System & Theme
- [x] Global permanent **DARK MODE ONLY** (no light theme toggle or light backgrounds).
- [x] Exact brand design tokens configured via Tailwind CSS v4 `@theme`:
  - Main Background `#0B0D11`, Secondary Background `#101319`
  - Card Surface `#171A21`, Elevated Surface `#20242D`, Subtle Borders `#292E39`
  - Primary Brand Blue `#397BE8`, Hover Blue `#568EF0`, Secondary Red `#EF5964`
  - Text Primary `#F5F7FB`, Text Secondary `#AAB2C2`
  - Status tokens: Success `#42BA83`, Warning `#F0B35C`, Error `#EF6874`
- [x] Shape system: 20px main cards, 16px secondary cards, 12-14px buttons/inputs, fully rounded badges (`rounded-full`). No sharp rectangular edges.
- [x] Plus Jakarta Sans primary font with Inter fallback via `next/font/google`.

### B. Landing Page Refinement (Clean, Human, Premium Dark UI)
- [x] **1. Official Brand Logo:** Sourced from `LOGO/logo-mrbob.png`, served via `public/logo-mrbob.png`, rendered consistently in Navbar, Footer, and Auth layouts.
- [x] **2. Hero Section:** Calmer composition, reduced excess AI-like glowing blurs, natural headline rhythm, clear CTAs (*Join as Creator*, *Explore Rewards*), streamlined overview cards.
- [x] **3. How It Works:** Editorial cards with clear step numbers (01–04), scannable copy, and friendly expiration explanation ("Poin yang masa berlakunya lebih dekat akan digunakan lebih dulu").
- [x] **4. Simplified Points Calculator:** Removed quick preset chips; kept only the smooth slider, estimated views, estimated points, and reward recommendation.
- [x] **5. Simplified Reward Showcase:** Removed internal card category tags and stock counts; prominent points typography, 1-line descriptions, and an interactive "Lihat Detail" modal.
- [x] **6. Socially Credible Leaderboard:** Replaced dummy creators with realistic influencer-style creator accounts (Sarah Oktaviani, Dimas Setiawan, Alifia Rahma, etc.) with real photography avatars.
- [x] **7. Top Videos Guidance:** Added official guidance text: *"Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."*
- [x] **8. Terminology Alignment:** Replaced all instances of "siswa" with "member" (member aktif, alumni dan member, calon member).
- [x] **9. Readability & Numbered Lists:** Structured FAQ answers with paragraph breathing room, line breaks, and vertical numbered lists for multi-item guidelines.
- [x] **10. Official Footer Address:** Updated to *Jl. Asparaga No.61, Tegalsari, Tulungrejo, Kec. Pare, Kabupaten Kediri, Jawa Timur 64212*, phone *0857-8481-9391*, and website *mrbobkampunginggris.com*.

### C. Authentication & Supabase Backend Migration (Checkpoint 1.5)
- [x] Complete removal of Firebase client & server dependencies (`firebase`, `firebase-admin`).
- [x] Installation & configuration of `@supabase/supabase-js` and `@supabase/ssr`.
- [x] Next.js 16 session middleware (`src/middleware.ts`) and proxy session refresh (`src/lib/supabase/proxy.ts`).
- [x] PostgreSQL relational schema (`profiles`, `admin_roles`) with version-controlled SQL migration (`supabase/migrations/20261014000000_init_auth_and_profiles.sql`).
- [x] Row Level Security (RLS) policies on all tables ensuring strict creator data isolation.
- [x] Elimination of insecure HTTP bootstrap endpoint in favor of trusted CLI provisioning script (`scripts/provision-admin.ts`).
- [x] Server-side administrative authorization checks via `admin_roles` table.
- [x] Private Storage bucket specification (`submission-evidence`) with 14-day temporary retention architecture.
- [x] Registration page (`/register`) with full name, email, password, TikTok, IG, and WhatsApp fields.
- [x] Login page (`/login`) with session persistence, error mapping, and password reset feedback.
- [x] Global `AuthContext` provider with Supabase session subscription.
- [x] `ProtectedRoute` guard ensuring unauthenticated users redirect to login and non-admins cannot access admin portals.
- [x] Non-intrusive `SupabaseStatusBanner` explaining required `.env.local` keys when Supabase credentials are not yet supplied.

### D. Dashboard Layout Shells
- [x] **Creator Portal Shell (`/creator/dashboard`):**
  - Sidebar navigation with active states and quick Poin balance card.
  - Header with role badge, profile dropdown, and portal switch.
  - Welcome area with creator display name.
  - 4 Key StatCards (Available Points, Pending Points, Verified Views, Total Submissions).
  - Smart Submission Reminder 30-day window card.
  - Target reward progress indicator.
  - Empty state for recent submissions with CTA to submit.
- [x] **Admin Portal Shell (`/admin/dashboard`):**
  - Red-accented administrative sidebar with 10 sections.
  - Admin metrics (Antrean Verifikasi, Creator Terdaftar, Poin Diterbitkan, Klaim Reward).
  - Verification queue empty state.
  - System status widget showing Firebase Client, Server Admin, and role enforcement health.
- [x] **Coming Soon Placeholders:** Clear, honest placeholders for subsequent phases (Submit Content, Reward Shop, Leaderboards, Analytics, etc.) without fake simulations.

---

## Phase 2 Deliverables Summary — Creator Dashboard & Point Wallet

### A. UI Polish & Brand Alignment
- [x] **Removed "Lihat Website":** Removed external link and button from Creator Dashboard header for a clean, focused user experience.
- [x] **Google Profile Picture Integration:**
  - Automatic extraction of Google OAuth avatar URL from Supabase Auth metadata (`avatar_url` or `picture`).
  - Seamless fallback to initials on error or when absent (`src/components/ui/avatar.tsx`).
  - Asynchronous background synchronization to `profiles.avatar_url` without affecting other profile fields.
  - Image domain allowlist configured in `next.config.ts` (`lh3.googleusercontent.com`, `*.googleusercontent.com`).
- [x] **Terminology Alignment (No FEFO):**
  - Completely eliminated the technical jargon "FEFO" across the codebase.
  - Replaced with clear, natural Indonesian: *"Poin yang paling dekat masa kadaluarsanya akan digunakan lebih dulu saat kamu menukar hadiah."*

### B. Point Wallet Database Infrastructure
- [x] **Discrete Point Lots Table (`point_lots`):**
  - Version-controlled migration: `supabase/migrations/20261014000002_create_point_wallet_system.sql`.
  - Discrete tracking per batch with strict constraints (`original_points > 0`, `0 <= remaining_points <= original_points`).
  - 6 calendar months expiration: `expires_at = issued_at + interval '6 months'`.
- [x] **Immutable Transaction Ledger (`point_transactions`):**
  - Append-only ledger recording all movements (`earned`, `redeemed`, `expired`, `reversed`, `bonus`, `adjustment`).
  - Idempotency key uniqueness constraint to prevent accidental duplicate grants.
- [x] **Security & Definer RPC Functions:**
  - `get_wallet_summary(target_user_id)`: High-performance aggregated metrics.
  - `issue_points_lot(...)`: Admin-only lot issuance with audit ledger entry.
  - `redeem_points_ordered(...)`: Order-based redemption locking active lots (`FOR UPDATE`) and consuming earliest expiring lots first.
  - `expire_overdue_point_lots()`: Automated maintenance function to expire overdue lots.
- [x] **Row Level Security (RLS):**
  - Creators can SELECT only their own lots and transactions.
  - Mutations strictly restricted to admins and security definer RPC functions.

### C. Creator Dashboard (`/creator/dashboard`)
- [x] Connected real database wallet metrics: Saldo Poin Tersedia, Poin Pending, Total Views Disetujui, Total Video Diajukan.
- [x] Expiration alert card displaying points expiring within 30 days and remaining days with urgency styling.
- [x] Reassuring wallet health card when all points are safe.
- [x] Dynamic Nearest Target Reward calculated from official 13 catalog items (`OFFICIAL_REWARDS`).
- [x] Empty state for video submissions with CTA to submit.

### D. My Points Page (`/creator/my-points`)
- [x] 4 Key Metric StatCards (Available, Pending, Redeemed, Expired).
- [x] Policy banner explaining 6-month validity and expiration order allocation.
- [x] Active Point Lots table with filtering (All, Active, Expiring Soon), expiration timestamps in WIB (Asia/Jakarta), days remaining, and urgency badges.
- [x] Immutable Transaction Ledger table with timestamp (WIB), type badge, description, reference, and points change.
- [x] Welcoming empty state for new creators with 0 points.

### E. Admin Points Dashboard (`/admin/points`)
- [x] System-wide point statistics (Total Issued, Total in Circulation, Total Redeemed, Total Expired).
- [x] Creator Balances table with search by name/email, available points, expiring points, and quick action.
- [x] Global Transaction Ledger table with filter by mutation type.
- [x] Test / Manual Point Issuance Modal with creator selector, points amount, source category, description, and idempotency key.
- [x] Audit Kedaluwarsa trigger action.

---

## Checkpoint 2 Deliverables Summary — Real Supabase Database Verification & Admin Point Issuance Security Audit

### A. Live Supabase Database Verification
- [x] **Verified Tables & Schemas:** Verified `point_lots`, `point_transactions`, `profiles`, and `admin_roles` exist and are queryable on the remote Supabase project (`https://cxanvbryqeqlgntxvghy.supabase.co`).
- [x] **Verified RPC Execution:** Executed `get_wallet_summary`, `issue_points_lot`, `redeem_points_ordered`, and `expire_overdue_point_lots` in live test scripts (`scripts/verify-checkpoint2.ts`, `scripts/test-creator-isolation.ts`, `scripts/test-admin-issuance.ts`).
- [x] **RLS Policy Enforcement:**
  - Anonymous users are completely blocked from viewing or mutating points and profiles.
  - Creators can only SELECT their own point lots and transactions; querying other creators' rows returns 0 rows.
  - Direct INSERT/UPDATE/DELETE on `point_lots` and `point_transactions` by creators is blocked by PostgreSQL RLS.
- [x] **Expiration & Ordered Consumption:**
  - 6-month calendar calculation verified (`issued_at + interval '6 months'`).
  - Order-based redemption verified: earliest expiring lot consumed first; balance correctly updated.
- [x] **Idempotency Verification:** Replaying issuance with identical idempotency key correctly returned `already_processed` without double-granting points.

### B. Admin Point Issuance Security Audit
- [x] **Strict Reason Auditing:** Updated `/admin/points` to mandate a clear, auditable reason (minimum 10 characters) explaining why points are manually granted.
- [x] **Admin Verification Badges:** UI clearly marks manual grants with `Disetujui Admin` and records the acting administrator's identity.

---

## Phase 3 Deliverables Summary — Submit Content System & My Contents

### A. URL Normalization & Anti-Duplication Engine (`src/lib/video-url.ts`)
- [x] **TikTok Support:** Handles desktop (`/@user/video/ID`), direct `/video/ID`, mobile `/v/ID.html`, and short links (`vt.tiktok.com/CODE`, `vm.tiktok.com/CODE`).
- [x] **Instagram Reels Support:** Handles `/reel/CODE`, `/reels/CODE`, and `/p/CODE` (unified to identical canonical reel identifier).
- [x] **Tracking Param Stripping:** Strips query strings (`igsh`, `is_from_webapp`, `sender_device`, etc.) to produce clean canonical URLs.
- [x] **Canonical Anti-Duplication Identifier:** Generates `tiktok:<numeric_id>` or `instagram:reel:<shortcode>` to enforce unique constraint in `submissions.normalized_video_identifier`.
- [x] **Unsupported Platform Rejection:** Cleanly rejects YouTube, Facebook, Twitter, and malformed links with clear Indonesian guidance.

### B. Smart Submission Reminder (30-Day Window)
- [x] **Window Boundary Rules:**
  - Day 1 = Posting Date (WIB).
  - Deadline = Day 30 at 23:59:59 WIB.
  - Rejects future dates.
  - Rejects videos past Day 30 with message: *"Masa pengajuan konten ini sudah berakhir (melebihi batas 30 hari kalender)."*
- [x] **Visual Countdown & Urgency Indicators:**
  - 15–30 Hari: Hijau (*Masih banyak waktu kumpulin views sebelum submit*).
  - 4–14 Hari: Kuning (*Waktu submission aktif, siap diajukan atau simpan draft*).
  - 1–3 Hari: Merah (*Last Chance! Segera submit sebelum batas waktu berakhir*).
  - Expired: Merah (*Masa pengajuan berakhir*).

### C. Private Screenshot Insight Storage (`submission-evidence`)
- [x] **Private Supabase Bucket:** Direct uploads to private `submission-evidence` bucket under `{userId}/{uuid}.{ext}`.
- [x] **Strict Validation:** File type restricted to JPG, PNG, WEBP; max file size 5MB.
- [x] **Ephemeral Signed URLs:** Previews rendered via 1-hour time-limited signed URLs (`getEvidenceSignedUrl`).
- [x] **14-Day Retention Metadata:** Database tracks `retention_status = 'active'`, `scheduled_deletion_at`, and `deleted_at` for Phase 4 auto-cleanup.

### D. Submit Content Page (`/creator/submit`)
- [x] Platform selector (TikTok / Instagram Reels) with brand icons.
- [x] Video URL input with live validation and canonical preview.
- [x] Posting Date input with instant Smart Submission Reminder countdown.
- [x] Current Views input with instant real-time Estimasi Poin (`Math.floor(views / 100)`).
- [x] Drag-and-drop screenshot insight uploader with image preview, file replacement, and size validation.
- [x] Dual Action Bar:
  - **Simpan Draft:** Saves draft without locking submission snapshot; alerts that drafts do NOT extend the 30-day window.
  - **Kirim Pengajuan Video:** Modal confirmation explaining the snapshot is locked permanently and cannot be edited.

### E. My Contents Page (`/creator/my-contents`)
- [x] **Tab 1: Video Diajukan (Submissions):**
  - Displays submitted videos with status badge (Menunggu Review, Sedang Direview, Perlu Bukti Tambahan, Disetujui, Ditolak).
  - Shows claimed views, estimated/approved points, submission ID, and clean external video link.
  - Displays admin notes when revisions or rejections occur.
- [x] **Tab 2: Draft Tersimpan (Drafts):**
  - Lists saved drafts with last modified timestamp.
  - Includes warning banner that drafts do not extend the 30-day deadline.
  - One-click "Lanjutkan Pengajuan" (pre-fills form via `?draftId=...`) and "Hapus Draft".
- [x] **Creator Dashboard Integration (`/creator/dashboard`):**
  - Displays real submission counts in StatCard `Total Video Diajukan`.
  - Fallback to estimated pending points for `Poin Pending`.
  - Renders 3 most recent submissions or empty state with submit CTA.

---

## Phase 6 Deliverables Summary — Leaderboard & Top Performing Videos

### A. My Rewards UI Refinement (`/creator/my-rewards`)
- [x] **Compact Layout with Image on Left:** Small square thumbnail (80–88px, rounded corners) placed on the left side of every card.
- [x] **Clear Hierarchy & Alignment:**
  - Center: Reward name + Status badge beside it, submission date (*"Diajukan 15 Okt 2026, 09.56 WIB"*), and tracking / voucher reference.
  - Right: Deducted points right-aligned in monospace bold format (`−50 Poin`).
- [x] **Labeling Rules:**
  - Merchandise: Shows *"Nomor Resi: <resi>"* or *"Nomor Resi: Belum tersedia"*.
  - Digital Voucher / Class Program: Shows *"Kode Voucher: <code>"* or *"Kode Voucher: Menunggu admin"*.
  - Rejected: Shows badge *"Ditolak / Dibatalkan"* and note *"Poin yang memenuhi syarat telah dikembalikan ke saldo dompet"*, preserving original point deduction visibility for audit consistency.
- [x] **Removed from Main Cards:** Oversized product thumbnails, recipient names, full shipping addresses, and bulky fulfillment boxes.

### B. Dynamic Time Period & WIB Attribution
- [x] **Rolling 3-Calendar-Month Window:** Calculated in Asia/Jakarta (WIB) time (e.g. *"Periode: 15 Juli – 15 Oktober 2026"*).
- [x] **Dynamic Subheadings:**
  - Top 5 Creators: *"Apresiasi untuk kreator dengan performa terbaik selama 3 bulan terakhir."*
  - Top Trending Videos: *"Video di bawah ini bisa jadi referensimu untuk melihat gaya konten yang berpotensi mendapat views besar."*

### C. Top 5 Creators Leaderboard
- [x] **Primary Ranking Formula:** Total points earned from approved submissions within the rolling 3-month window.
- [x] **Secondary Tie-Breakers:** Total verified views -> Number of approved videos -> Deterministic Creator ID.
- [x] **Strict Inclusions/Exclusions:** Excludes bonus points, manual adjustments, reward refunds, drafts, pending, and rejected submissions.
- [x] **Creator Presentation:** Ranking medal/badge (#1–#5), avatar with initials fallback, display name, handle (@tiktok / @instagram), total verified views, and total points earned.

### D. Top Trending Videos
- [x] **Ranking Formula:** Highest verified views snapshot at time of admin approval -> Approved points -> Deterministic ID.
- [x] **Interactive & Safe Navigation:** Entire row is clickable, sanitized external link opening original TikTok/Instagram URL in a new tab without unnecessary icons.
- [x] **Authentic Metadata Only:** Displays genuine title or neutral label (`Konten {Platform} oleh {CreatorName}`). Zero fabricated influencer records.

### E. Creator Dashboard Leaderboard (`/creator/leaderboard`)
- [x] **Personal Standing Card:** Authenticated creator sees their rank (*"Peringkat Kamu Saat Ini: #1 dari X Kreator"*), verified views, and points.
- [x] **Non-Fabricated Rank:** Creators without approved submissions in the period receive an encouraging call-to-action to submit content rather than a fabricated rank.

### F. Landing Page Leaderboard Preview (`/`)
- [x] Replaced mock data with database-backed Supabase queries.
- [x] Integrated empty state (*"Belum ada konten yang masuk leaderboard periode ini. Yuk, mulai bikin konten dan kumpulkan poin!"*).

### G. Public API & Privacy-Safe Security Architecture
- [x] **API Endpoint:** `/api/leaderboard` strictly exposes public fields (`rank`, `name`, `handle`, `avatar`, `views`, `points`, `videoUrl`).
- [x] **Zero Privacy Leaks:** Private emails, WhatsApp numbers, addresses, and screenshot evidence are NEVER exposed to public or anonymous consumers.
- [x] **Database Migration:** `20261015000002_create_leaderboard_system.sql` with security definer functions and performance indexes.

### H. Phase 6 Revisions: Playable Video Gallery, Calendar Months & Public Consent
- [x] **Playable Video Gallery (9:16 Vertical Cards):**
  - Reusable component `src/components/leaderboard/video-gallery.tsx` integrated across Landing Page (`leaderboard-preview.tsx`), Creator Leaderboard (`/creator/leaderboard`), and Admin Leaderboard (`/admin/leaderboard`).
  - Responsive grid: 1 column on mobile, 2 columns on tablet, 2–3 columns on desktop without horizontal overflow.
  - Official embed players:
    - TikTok: Official player `https://www.tiktok.com/embed/v2/${videoId}` using canonical numeric video ID.
    - Instagram Reels: Official player `https://www.instagram.com/reel/${shortcode}/embed/`.
  - Click-to-load lazy loading: Clean poster card with prominent "Putar Video" button, avoiding heavy initial autoplay and sandboxing blocks.
  - Direct platform fallback buttons: "Tonton di TikTok" / "Tonton di Instagram" with `ExternalLink` opening the original platform URL.
  - Eliminated repetitive autogenerated titles (e.g. no more "Video Reels oleh [Creator Name]").
- [x] **Exact 3-Calendar-Month Window (Asia/Jakarta WIB):**
  - Replaced rolling day subtraction with calendar month boundaries in `getCalendarThreeMonthsPeriod()`.
  - Handles month boundaries, February, leap years (2028: 29 days vs 2027: 28 days), and year-crossings (e.g. Nov 2026 – Jan 2027).
  - Exact verified outputs:
    - Oct 2026: *"Periode: 1 Agustus – 31 Oktober 2026"*
    - Nov 2026: *"Periode: 1 September – 30 November 2026"*
    - Jan 2027: *"Periode: 1 November 2026 – 31 Januari 2027"*
    - Feb 2028 (leap): *"Periode: 1 Desember 2027 – 29 Februari 2028"*
- [x] **Public Leaderboard Visibility Consent:**
  - Added consent toggle in Creator Settings (`/creator/settings`): *"Tampilkan nama dan profil saya di Leaderboard Publik"*.
  - When opted out (`publicLeaderboardConsent: false`), creator identity is masked on public surfaces as *"Kreator Anonim"* with no handle and no avatar, while fair point scoring is preserved.
  - Admin leaderboard displays transparent indicators for administrative visibility.
- [x] **Concept Distinction for Phase 7:**
  - **Rolling/Calendar 3-Month Leaderboard (Phase 6):** Real-time, competitive gamification window representing the current active performance cycle (3 calendar months up to today). Updates immediately as new submissions are approved.
  - **Fixed Quarterly Analytics & Historical Reporting (Phase 7):** Static, immutable business quarters (Q1: Jan–Mar, Q2: Apr–Jun, Q3: Jul–Sep, Q4: Oct–Dec) used for historical comparisons, ROI analysis, exportable CSV reports, and executive audits.

### I. Phase 6 Native Video Player as Gallery Preview & Layout Refinement (Completed 2026-10-15)
- [x] **Refined 3-Section Card Layout (Zero Overlays on Video):**
  - **1. Top Header:** Ranking badge (#1, #2, #3) aligned left and Platform badge (Instagram Reels / TikTok) aligned right placed completely OUTSIDE the video player with compact padding and subtle bottom border. No absolute overlay over video content.
  - **2. Middle (Native Player):** Preserves 9:16 vertical video ratio with official Instagram Reels or TikTok embed. Zero custom badges, labels, or text over the video, preserving 100% of native playback controls.
  - **3. Bottom (Creator Info):** Creator avatar, name, and username; verified views on the left; earned points on the right; and direct platform watch link below. Separated from player with a subtle top border.
- [x] **Direct Native Player Preview:**
  - Video gallery cards in `src/components/leaderboard/video-gallery.tsx` load the official Instagram Reels (`https://www.instagram.com/reel/${shortcode}/embed/`) or TikTok embed (`https://www.tiktok.com/embed/v2/${displayId}`) directly as the visual content of each card.
  - Zero autoplay: Platform shows its native initial preview / paused player state with native play controls.
  - Visitors play the video directly through the official player without duplicate custom play buttons.
  - Does NOT attempt cross-origin iframe frame captures; does not falsely claim "frame 00:00".
- [x] **Removed Unnecessary Thumbnail UI:**
  - Removed custom image thumbnail overlays, duplicate custom Play buttons, and "Cover Resmi" badges from the ordinary gallery.
  - Cleaned up temporary test evidence screenshots from public storage; private submission evidence remains strictly private (`public: false`).
- [x] **Performance & Viewport Lazy Loading:**
  - `IntersectionObserver` with `rootMargin: "250px 0px"`: Only loads iframe when approaching the viewport.
  - Combined with native `loading="lazy"` on iframes to protect mobile data and bandwidth.
  - Preserves exact 9:16 card dimensions with subtle dark skeleton while loading, preventing layout shifts.
- [x] **Functional Fallback:**
  - If third-party platform blocks/refuses embedding or times out (> 9s), displays a clean neutral placeholder with platform badge and a clear "Tonton di Instagram" or "Tonton di TikTok" button.
  - Zero broken iframes or infinite loading spinners.
- [x] **Privacy & Public Consent:**
  - If a creator opts out of public leaderboard consent (`isAnonymous: true`), third-party identifying embeds and URLs are NOT rendered publicly. Renders a dignified anonymous privacy shield card preserving fair points and verified views.

---

## Phase 7 Deliverables Summary — Quarterly UGC Analytics & Reporting (Completed 2026-10-15)

### A. Core Architecture & Administrative Access
- [x] **Dedicated Admin Analytics Hub (`/admin/analytics`):**
  - Integrated into existing Admin Portal with navigation sidebar link **"UGC Analytics"** (`/admin/analytics`).
  - Strict server & client authorization: only accessible by verified admins in `admin_roles`.
  - Permanent dark-mode styling aligned with Mr.BOB design system: `#0B0D11` background, `#171A21` rounded cards, blue `#397BE8` accents, accessible typography, zero clutter.
- [x] **Database Schema & Migrations:**
  - `supabase/migrations/20261015000004_create_quarterly_analytics_system.sql` introducing:
    - `content_category` column on `submissions` with 7 standard formats (`daily_life`, `review_kelas`, `educational`, `pov`, `challenge`, `testimonial`, `other`).
    - `campaign_costs` table tracking IDR expenses across merchandise, vouchers, classes, and operations.
    - `quarterly_snapshots` table supporting immutable snapshot preservation (`draft`, `finalized`, `revised`).
    - Robust RLS policies restricting read and write access to verified admins.
  - Graceful fallback engine (`src/lib/supabase/analytics.ts`) guaranteeing zero downtime when remote PostgREST schema cache is pending reload.
- [x] **Reports & Data Export Center (`/admin/reports`):**
  - Updated reports portal with quick-links to UGC Analytics, direct quarter selector, instant CSV download trigger, and printable executive summaries.

### B. Accurate Quarter Calendar Boundaries (Asia/Jakarta WIB)
- [x] **Fixed Business Quarters:**
  - Q1: 1 Januari – 31 Maret
  - Q2: 1 April – 30 Juni
  - Q3: 1 Juli – 30 September
  - Q4: 1 Oktober – 31 Desember
- [x] **Timezone & Interval Integrity:**
  - Strictly evaluated in `Asia/Jakarta` (WIB, UTC+7).
  - Half-open interval `[quarterStart, quarterEnd)` preventing boundary overlap.
  - Crossing-year transition handling: Q1 of Year N seamlessly compares with Q4 of Year N-1.
- [x] **Ongoing Quarter Labeling:**
  - Active quarters clearly labeled with badge: **"Data Sementara"** to avoid premature executive conclusions.

### C. Six Core KPI Cards with QoQ Deltas
- [x] **1. Total Konten UGC:**
  - Counts unique finalized submissions created within the quarter using `submitted_at`.
  - Displays breakdown: Disetujui, Ditolak, Menunggu Review.
- [x] **2. Creator Berpartisipasi:**
  - Counts distinct creators (`COUNT(DISTINCT user_id)`) submitting content in the quarter cohort.
  - Multi-video creators counted exactly once.
- [x] **3. Total Verified Views:**
  - Sums approved `verified_views` attributed to content with `posting_date` within the quarter.
  - Strictly excludes pending or rejected views.
- [x] **4. Total Poin Diterbitkan:**
  - Sums points issued to creators for UGC approved submissions (`issued_at` within quarter).
  - Strictly prevents double counting between transaction types.
- [x] **5. Approval Rate:**
  - Formula: `Approved / (Approved + Rejected) * 100%`.
  - Pending submissions displayed separately to avoid skewing approval metrics.
  - Safely outputs `"N/A"` when no finalized decisions exist (preventing `NaN` / `Infinity`).
- [x] **6. Total Reward Diklaim:**
  - Counts reward redemptions created in the quarter, grouped by fulfillment status.
- [x] **Quarter-over-Quarter (QoQ) Trend Indicators:**
  - Compares current quarter metric with immediate prior quarter.
  - Displays absolute difference (`+` / `-`), percentage change, and visual trend pills.
  - Handles zero prior-quarter baselines with clear human label: *"Belum dapat dibandingkan"* instead of division-by-zero errors.

### D. Deep-Dive Analytical Visualizations
- [x] **Monthly Performance Breakdown:**
  - 3-month performance chart tracking Submissions, Views, Creators, and Points.
  - Interactive metric switcher tabs.
- [x] **Platform Performance Comparison (TikTok vs Instagram Reels):**
  - Side-by-side comparative table: Submissions, Approved Content, Total Views, Average Views per Video, Approval Rate, and Share of Views.
  - Visual share bar displaying platform distribution percentage.
- [x] **Top 10 Creators & Top 10 Videos Rankings:**
  - Top 10 Creators ranked descending by earned points within the quarter cohort.
  - Top 10 Videos ranked descending by verified views within the quarter.
  - Integrates native 9:16 vertical video player preview component (`video-gallery.tsx`).
- [x] **Content Format & Category Analysis:**
  - Categorization of approved videos into: Daily Life, Review Kelas, Educational, POV, Challenge, Testimonial, and Other.
  - Admin classification modal (`classify-modal.tsx`) allowing instant categorization without page reload.
  - Performance summary: Video Count, Total Views, Average Views/Video, and Best Performing Format.
- [x] **Campaign Cost & CPV (Cost per 1,000 Views):**
  - Expense ledger tracking actual IDR costs for Merchandise, Vouchers, Course Classes, and Operational Overhead.
  - Admin modal (`add-cost-modal.tsx`) to record or delete verified company expenses.
  - CPV Calculation: `(Total Cost / Total Verified Views) * 1,000`.
  - Empty cost state safely displays: *"Data biaya belum lengkap."* without assuming zero cost.

### E. Executive Snapshots & Management Export
- [x] **Quarterly Report Snapshots:**
  - Finalize control locking immutable historical snapshot data.
  - Auditable revision tracking with notes and timestamps.
- [x] **Management Executive Summary Modal (`executive-summary-modal.tsx`):**
  - Printable, clean modal answering all 8 executive management questions.
  - Browser print CSS (`@media print`) pre-configured for PDF generation.
- [x] **Tabular CSV Export (`/api/admin/analytics/export`):**
  - Generates comprehensive UTF-8 BOM CSV compatible with Microsoft Excel and Google Sheets.
  - Contains sections for Core KPIs, QoQ Comparisons, Monthly Data, Platform Breakdown, Top Creators, Top Videos, Content Formats, and Campaign Costs.

---

## Build & Test Verification (Phase 7 Final)
- Automated Unit & Integration Tests:
  - `scripts/test-phase7-analytics.ts` — **27/27 PASSED** (Calendar boundaries, timezone WIB, submission cohorts, creator uniqueness, view attribution, point issuance, approval rate formulas, zero-decision safeguards, QoQ deltas, platform comparison, top rankings, content formats, campaign costs, CPV formula, snapshot versioning, CSV export with BOM, database access control, sidebar navigation, TypeScript compilation, production build).
  - `scripts/test-phase6-leaderboard.ts` — **36/36 PASSED** (Rolling/calendar periods, leap years, official embeds, ranking formulas, public consent, privacy isolation, empty states).
  - `scripts/test-native-video-preview.ts` — **30/30 PASSED** (3-part card layout, dedicated top header, native players, fallback handling, live playability check on Supabase records).
  - `scripts/test-phase5-redemptions.ts` — **25/25 PASSED** (Point wallet, atomic redemption, refund idempotency, catalog).
- TypeScript Type Check: **0 ERRORS** (`npx tsc --noEmit`).
- ESLint: **0 ERRORS, 0 WARNINGS** (`npm run lint`).
- Next.js Production Build: **33/33 ROUTES GENERATED** cleanly in Next.js 16.4.0 Turbopack (`npm run build`).



