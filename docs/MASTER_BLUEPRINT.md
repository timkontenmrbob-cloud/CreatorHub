# MASTER BLUEPRINT — MR.BOB CREATOR HUB

## 1. Executive Summary & Vision

**Mr.BOB Creator Hub** is a User Generated Content (UGC) rewards and analytics platform designed specifically for **Mr.BOB Kampung Inggris**, an English learning institution based in Pare, Kediri, Indonesia.

- **Official Tagline:** *"Post Your Video, Claim Your Reward!"*
- **Target Audience:** Alumni, active students, prospective learners, and general content creators across Indonesia.
- **Philosophy:** Open to everyone with **zero minimum follower requirements**. Any creator posting quality content about Mr.BOB on TikTok or Instagram Reels can submit their video, have their views verified by the administration team, earn official **Poin**, and redeem merchandise or free English learning scholarships.

---

## 2. Design System & Visual Identity

### Permanent Dark Mode Only
- Strict requirement: No light mode or theme-switching capability.
- Contrast: Designed to satisfy WCAG AA readability with clean, comfortable surfaces.

### Design Tokens
| Token | Hex Code | Purpose |
|---|---|---|
| Main Background | `#0B0D11` | Primary screen canvas |
| Secondary Background | `#101319` | Sidebars, footers, secondary zones |
| Card Surface | `#171A21` | Base cards, tables, panels |
| Elevated Surface | `#20242D` | Modals, inputs, dropdown menus |
| Subtle Borders | `#292E39` | Dividers, boundaries, hairline borders |
| Primary Brand Blue | `#397BE8` | Primary brand accent, primary CTA |
| Hover Blue | `#568EF0` | Active/hover state for primary actions |
| Secondary Brand Red | `#EF5964` | Admin badges, accents, urgency warnings |
| Primary Text | `#F5F7FB` | Main typography, high contrast |
| Secondary Text | `#AAB2C2` | Subtitles, labels, metadata |
| Success Status | `#42BA83` | Approved submissions, verified states |
| Warning Status | `#F0B35C` | Pending review, deadline reminders |
| Error Status | `#EF6874` | Rejected submissions, expired deadlines |

### Shape & Geometry Standards
- Main Cards: `20px` border-radius (`rounded-[20px]`)
- Secondary Cards: `16px` border-radius (`rounded-[16px]`)
- Buttons: `12–14px` border-radius (`rounded-xl` or `rounded-[14px]`)
- Inputs: `12px` border-radius (`rounded-xl`)
- Modals & Dialogs: `20px` border-radius (`rounded-[20px]`)
- Badges: Fully rounded pill shape (`rounded-full`)
- Spacing: 4px/8px modular scale.
- Strict rule: **Never use sharp-edged rectangular UI elements.**

---

## 3. Technology Stack

- **Framework:** Next.js (App Router, Turbopack, React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 with bespoke `@theme` design tokens
- **Icons:** Lucide React
- **Backend & Database:**
  - Database: Supabase PostgreSQL with Row Level Security (RLS)
  - Authentication: Supabase Auth with `@supabase/ssr` (secure HTTP-only cookie sessions)
  - Storage: Supabase Storage (`submission-evidence` private bucket with 14-day temporary retention)
  - Server SDK: `@supabase/supabase-js` for trusted CLI administrative provisioning
- **State Management:** React Context (`AuthProvider` with real session state)

---

## 4. User Roles & Access Control

### A. Creator
- Public registration & login.
- Profile management (TikTok/IG handles, WhatsApp for merchandise fulfillment).
- Content submission within 30 days of publishing.
- Submission drafts with smart deadline countdown.
- Point wallet tracking (Available, Pending, Redeemed, Expired).
- Reward catalog browsing and redemption (FEFO point deduction).
- Real-time leaderboard view.

### B. Admin
- Dedicated administrative portal with separate navigation and red brand accents.
- Administrative accounts **must not** be registered publicly; they are assigned strictly through the trusted CLI provisioning script (`scripts/provision-admin.ts`) targeting an authorized account in the protected `admin_roles` table.
- Content verification queue: inspect video URL, evaluate screenshot evidence, verify publishing date, approve/adjust views, reject with notes.
- Secure atomic point lot issuance.
- Reward catalog and physical inventory stock management.
- Fulfillment processing with parcel tracking number inputs.
- Quarterly analytics, research dashboards, and report exports.

---

## 5. Core Business Rules

1. **Submission Window:**
   - 30 calendar days from publication date.
   - Day of publication = Day 1. Final eligible day = Day 30 at 23:59:59 Asia/Jakarta time.
   - Automatic deadline calculation and smart reminders:
     - 15–30 days remaining: *"Masih banyak waktu buat kumpulin views!"*
     - 4–14 days remaining: *"Kontenmu masih punya X hari. Mau submit sekarang atau simpan dulu?"*
     - 1–3 days remaining: *"Last Chance! Segera submit sebelum deadline."*
     - Expired: *"Masa submit konten ini sudah berakhir."*
2. **One-Time Submission:**
   - Each video may only be submitted once.
   - No continuous daily scraping or automatic view updates; views are locked at submission snapshot.
3. **Evidence-Based Submission:**
   - Video URL, Platform (TikTok/IG Reels), Posting Date, Current Views, Screenshot Insight (JPG/PNG/WEBP max 5 MB).
4. **Poin Calculation:**
   - Official name: **Poin** (never "BOB Points").
   - Conversion: **1.000 verified views = 10 Poin** (`floor(verifiedViews / 100)`).
   - Points are credited only upon administrative verification.
5. **Point Expiration & FEFO:**
   - Points expire **6 calendar months** after issuance.
   - Redemptions consume points using **FEFO (First Expired, First Out)** to protect creators from premature point loss.
   - Multi-stage expiration warnings: 30 days, 7 days, 1 day before expiry.

---

## 6. Official Reward Catalog

| Required Poin | Item Name | Category | Stock |
|---|---|---|---|
| 10 | Keychain Mr.BOB | Merchandise | 500 |
| 50 | Notebook Merchandise | Merchandise | 250 |
| 75 | T-Shirt Mr.BOB Kampung Inggris | Merchandise | 150 |
| 100 | Free Program Kelas Satuan 2 Minggu | Program Kelas | 80 |
| 200 | Voucher Belajar Rp250.000 | Voucher | 100 |
| 500 | Free Program Kelas Satuan 1 Bulan | Program Kelas | 50 |
| 1,000 | Free Super Private Class Speaking Akselerasi | Program Kelas | 25 |
| 2,500 | Free Program Kelas 2 Minggu Non Camp | Program Kelas | 30 |
| 5,000 | Free Program Kelas 1 Bulan Non Camp | Program Kelas | 20 |
| 7,500 | Free Program Kelas 1 Bulan 5-up | Program Kelas | 15 |
| 10,000 | Free Program Kelas 2 Bulan 5-up | Program Kelas | 10 |
| 20,000 | Free Program Kelas 3 Bulan 5-up | Program Kelas | 8 |
| 50,000 | Free Program Kelas 3 Bulan 7-up | Program Kelas | 5 |

---

## 7. Implementation Roadmap

- **Phase 0:** Architecture & Project Setup *(Completed)*
- **Phase 1:** UI Foundation & Authentication *(Completed)*
- **Phase 2:** Creator Dashboard & Point Wallet *(Next)*
- **Phase 3:** Submit Content Module & Smart Reminder
- **Phase 4:** Admin Verification Queue & Point Issuance
- **Phase 5:** Reward Shop & FEFO Redemption
- **Phase 6:** Quarterly Leaderboards
- **Phase 7:** Analytics & Research Reports
- **Phase 8:** Hardening, Security Audits, and Production Deployment
