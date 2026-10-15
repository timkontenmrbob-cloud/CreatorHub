# Mr.BOB Creator Hub

> **"Post Your Video, Claim Your Reward!"**  
> Official UGC Rewards Platform for **Mr.BOB Kampung Inggris**, Pare, Kediri, Indonesia.

---

## 🌟 Overview

**Mr.BOB Creator Hub** allows anyone—alumni, active students, prospective learners, and content creators—to submit TikTok and Instagram Reels videos about Mr.BOB, earn verified **Poin** from views, and redeem exclusive merchandise and English course scholarships.

### Core Conversion Rate
$$\text{1.000 verified views} = \text{10 Poin} \quad \left(\text{points} = \lfloor \text{views} / 100 \rfloor\right)$$

- **Zero Follower Barrier:** Open to all creators without minimum follower requirements.
- **Permanent Dark Mode:** High-contrast, sleek SaaS-grade design system (`#0B0D11` background, `#397BE8` primary blue).
- **30-Day Submission Window:** Videos must be submitted within 30 calendar days of publication.
- **6-Month Point Expiration:** Points remain valid for 6 calendar months; lots closest to expiration are prioritized first upon redemption.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js `v18+` or `v20+` (tested on Node.js `v24.15.0`)
- npm or pnpm

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials (obtained from **Supabase Dashboard > Settings > API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_publishable_key
SUPABASE_SECRET_KEY=your_service_role_secret_key
```

> **Note:** If `.env.local` is not configured, the application runs gracefully and displays a non-intrusive setup banner on authentication screens with direct instructions.

### 4. Database Setup
Apply the initial PostgreSQL migration located in `supabase/migrations/20261014000000_init_auth_and_profiles.sql` via your Supabase SQL Editor.

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production
```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
├── docs/
│   ├── MASTER_BLUEPRINT.md    # Master architecture & business rules
│   ├── PHASE_PROGRESS.md      # Phase completion tracker
│   └── ARCHITECTURE.md        # Technical data model & security design
├── scripts/
│   └── provision-admin.ts     # Trusted CLI administrative provisioning
├── supabase/
│   └── migrations/            # Version-controlled PostgreSQL SQL migrations
├── src/
│   ├── app/
│   │   ├── (auth)/            # Auth routes (/login, /register)
│   │   ├── (dashboard)/
│   │   │   ├── creator/       # Creator portal (/creator/dashboard, etc.)
│   │   │   └── admin/         # Admin portal (/admin/dashboard, etc.)
│   │   ├── api/               # API routes (/api/auth/me, health)
│   │   ├── globals.css        # Permanent dark theme & Tailwind v4 design tokens
│   │   ├── layout.tsx         # Root layout with Plus Jakarta Sans & AuthProvider
│   │   └── page.tsx           # Full 9-section landing page
│   ├── components/
│   │   ├── auth/              # Auth cards, protected routes, Supabase status banner
│   │   ├── dashboard/         # Sidebars, headers, stat cards, coming soon modules
│   │   ├── landing/           # Navbar, hero, calculator, rewards, FAQ, footer
│   │   └── ui/                # Buttons, cards, inputs, dialogs, badges, avatars
│   ├── lib/
│   │   ├── context/           # React AuthContext
│   │   ├── supabase/          # Client, server, admin, auth, and proxy utilities
│   │   ├── types/             # User, Database, Reward, Submission types
│   │   └── utils.ts           # Poin formula, formatters, deadline calculations
│   └── middleware.ts          # Next.js session refresh middleware
├── .env.example               # Supabase environment variable specification
├── package.json
└── tsconfig.json
```

---

## 🛡️ Administrative Role Provisioning

For strict security, no public HTTP endpoint exists for self-promotion to administrator.

To provision the initial administrator account:
1. Register the target account at `/register`.
2. Run the trusted server-side CLI provisioning script with your service role key in `.env.local`:
```bash
npx tsx scripts/provision-admin.ts admin@mrbobkampunginggris.com
```
Once executed, the user is assigned the `admin` role in the protected `admin_roles` PostgreSQL table, granting access to the Admin Portal (`/admin/dashboard`).

---

## 📌 Phase Status

- **Phase 1: UI Foundation & Landing Polish** — **COMPLETED**
- **Checkpoint 1.5: Firebase to Supabase Migration & Google OAuth** — **COMPLETED**
- **Phase 2: Creator Dashboard & Point Wallet** — **COMPLETED**
  - Discrete Point Lots with 6-month calendar expiration (`point_lots`)
  - Immutable Financial Ledger with idempotency keys (`point_transactions`)
  - Earliest-expiring point consumption via secure database functions
  - Dynamic Creator Dashboard with real wallet data, nearest target reward, and expiration alert card
  - Comprehensive My Points wallet page (`/creator/my-points`)
  - Admin Points Management & Ledger dashboard (`/admin/points`)
  - Complete elimination of "FEFO" jargon in favor of natural language
- **Checkpoint 2: Database Verification & Admin Issuance Security Audit** — **COMPLETED**
  - Remote Supabase tables & RPC functions verified against live authenticated sessions
  - RLS policies verified: cross-creator reading blocked, unauthorized mutation blocked
  - Mandatory 10-char auditable reason and admin verification badges on manual issuance
- **Phase 3: Submit Content System & My Contents** — **COMPLETED**
  - Multi-platform URL normalization (TikTok desktop/mobile/shortlinks, IG Reels & Posts)
  - Canonical identifier generation (`tiktok:<id>`, `instagram:reel:<code>`) to block duplicate submissions
  - 30-Day Smart Submission Reminder with color-coded urgency countdown (15–30d, 4–14d, 1–3d, expired)
  - Real-time instant points estimator (`Math.floor(views / 100)`)
  - Private screenshot insight upload to Supabase Storage (`submission-evidence`) with 1-hour signed URLs
  - Draft management system (`/creator/submit` & `/creator/my-contents`) without extending deadline
  - Real-time submission integration in Creator Dashboard
- **Next: Phase 4 (Admin Verification & Review System)**

---

&copy; 2026 Mr.BOB Kampung Inggris. All rights reserved.
# CreatorHub
# CreatorHub
