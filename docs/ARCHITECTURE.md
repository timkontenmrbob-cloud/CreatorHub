# ARCHITECTURE SPECIFICATION — MR.BOB CREATOR HUB
## Checkpoint 1.5 — Supabase Backend Foundation

## 1. System Overview

Mr.BOB Creator Hub is architected as a modern, high-performance web application utilizing **Next.js 16 with App Router**, **TypeScript**, and **Tailwind CSS v4**, backed by **Supabase** (PostgreSQL, Supabase Auth with `@supabase/ssr`, Supabase Storage, and Row Level Security).

```mermaid
graph TD
    Client["Client Browser (Permanent Dark Mode UI)"]
    NextMiddleware["Next.js Middleware (Session Refresh via @supabase/ssr)"]
    NextServer["Next.js App Router Server"]
    SupabaseAuth["Supabase Authentication (GoTrue / Cookie-Based)"]
    Postgres["Supabase PostgreSQL Database (RLS Enforced)"]
    SupabaseStorage["Supabase Storage (submission-evidence Private Bucket)"]
    AdminScript["Admin CLI Provisioning (Service Role Key)"]

    Client -->|User Auth & Forms| SupabaseAuth
    Client -->|Page Navigation & Requests| NextMiddleware
    NextMiddleware -->|Session Validation / Cookie Sync| SupabaseAuth
    NextMiddleware -->|Render Pipeline| NextServer
    Client -->|RLS-Governed Queries / Profiles| Postgres
    Client -->|Private Upload / Scoped Access| SupabaseStorage
    AdminScript -->|Trusted Role Provisioning (No HTTP Endpoint)| Postgres
```

---

## 2. PostgreSQL Relational Data Model

### `profiles` Table
Stores creator identity and contact information for reward delivery. Created automatically via trigger when an account registers in `auth.users`.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  tiktok_username text,
  instagram_username text,
  whatsapp_number text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `admin_roles` Table
Protected administrative role table. Regular users cannot insert, update, or delete records here.

```sql
create table public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);
```

### `point_lots` Table (Implemented in Phase 2)
Tracks discrete batches of points awarded with 6-month calendar expiration date.

```sql
create table public.point_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null default 'views' check (source_type in ('views', 'bonus', 'adjustment', 'challenge')),
  source_id text,
  original_points integer not null check (original_points > 0),
  remaining_points integer not null check (remaining_points >= 0 and remaining_points <= original_points),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 months'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `point_transactions` Table (Implemented in Phase 2)
Immutable financial ledger of all point movements in the system.

```sql
create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  transaction_type text not null check (transaction_type in ('earned', 'redeemed', 'expired', 'reversed', 'bonus', 'adjustment')),
  amount integer not null check (amount > 0),
  related_point_lot_id uuid references public.point_lots(id) on delete set null,
  reference_id text,
  idempotency_key text unique,
  description text not null,
  created_at timestamptz not null default now()
);
```

### Database Triggers & Helper Functions
- `public.handle_new_user()`: Automatically creates a `profiles` row using metadata provided at signup.
- `public.handle_updated_at()`: Automatically refreshes `updated_at` timestamps on row mutation.
- `public.is_admin(check_user_id uuid)`: `SECURITY DEFINER` function returning `boolean` indicating if a user has active administrative permissions.
- `public.get_wallet_summary(target_user_id uuid)`: High-performance aggregated wallet calculation.
- `public.issue_points_lot(...)`: `SECURITY DEFINER` function for admin/service point issuance with idempotency checks.
- `public.redeem_points_ordered(...)`: `SECURITY DEFINER` function consuming active lots ordered by earliest expiration date first (`FOR UPDATE` row locking).
- `public.expire_overdue_point_lots()`: Maintenance function expiring lots whose 6-month calendar period has elapsed.

---

## 3. Row Level Security (RLS) Policy Architecture

All exposed tables in `public` have Row Level Security enabled with least-privilege policies:

### `public.profiles`
- **SELECT:** `auth.uid() = id or public.is_admin(auth.uid())`
- **UPDATE:** `auth.uid() = id`
- **INSERT:** `auth.uid() = id`

### `public.admin_roles`
- **SELECT:** `auth.uid() = user_id or public.is_admin(auth.uid())`
- **INSERT / UPDATE / DELETE:** Zero public client access (Service Role only).

### `public.point_lots`
- **SELECT:** `auth.uid() = user_id or public.is_admin(auth.uid())`
- **INSERT / UPDATE / DELETE:** Admin only (creators mutate points strictly via security definer RPC functions).

### `public.point_transactions`
- **SELECT:** `auth.uid() = user_id or public.is_admin(auth.uid())`
- **INSERT / UPDATE / DELETE:** Admin only (creators insert transactions strictly via security definer RPC functions).

---

### `submission_drafts` Table (Implemented in Phase 3)
Stores creator drafts prior to final submission. Does NOT extend the 30-day submission window.

```sql
create table public.submission_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  video_url text,
  normalized_video_identifier text,
  posting_date date not null,
  current_views bigint,
  estimated_points integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `submissions` Table (Implemented in Phase 3)
Authoritative locked snapshot of creator video submissions. Once submitted, records cannot be modified by creators. Contains unique constraint on `normalized_video_identifier` to prevent re-submissions.

```sql
create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('tiktok', 'instagram')),
  video_url text not null,
  normalized_video_identifier text not null unique,
  posting_date date not null,
  submitted_at timestamptz not null default now(),
  claimed_views bigint not null check (claimed_views >= 0),
  estimated_points integer not null default 0 check (estimated_points >= 0),
  verified_views bigint,
  approved_points integer,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'requires_revision', 'approved', 'rejected')),
  admin_notes text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### `submission_evidence` Table (Implemented in Phase 3)
Tracks private screenshot insight uploads in Supabase Storage and records metadata for retention/deletion.

```sql
create table public.submission_evidence (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  mime_type text not null,
  uploaded_at timestamptz not null default now(),
  retention_status text not null default 'active' check (retention_status in ('active', 'scheduled_for_deletion', 'deleted', 'held_for_dispute')),
  scheduled_deletion_at timestamptz,
  deleted_at timestamptz
);
```

---

## 3. URL Normalization & Anti-Duplication Engine

To protect against duplicate submissions (e.g. from mobile links, desktop links, tracking parameters, or shared links):
- **TikTok Engine:**
  - Extracts canonical numeric video ID from desktop (`/@user/video/12345`), mobile web (`/v/12345.html`), or short links (`vt.tiktok.com/ZS...`).
  - Strips tracking query parameters (`is_from_webapp`, `sender_device`, etc.).
  - Generates canonical identifier: `tiktok:<id>`.
- **Instagram Reels Engine:**
  - Extracts canonical media shortcode from `/reel/CODE`, `/reels/CODE`, or `/p/CODE`.
  - Normalizes both post and reel URLs to the same canonical identifier: `instagram:reel:<CODE>`.
- **Eligibility RPC (`check_video_submission_eligibility`):**
  - Evaluates uniqueness against `submissions.normalized_video_identifier`.
  - Verifies 30-day calendar submission window (Day 1 = posting date; Day 30 at 23:59:59 WIB = deadline).
  - Rejects future posting dates.

---

## 4. Planned Future Tables (Phases 5–7)

1. **`rewards`**: Official reward catalog with required points and available inventory stock.
2. **`redemptions`**: Redemption claims with shipping address and fulfillment status.
3. **`reward_inventory`**: Stock tracking, reservations, and physical receipt logs.
4. **`quarterly_reports`**: Aggregate quarterly performance and research metrics.
5. **`audit_logs`**: Tamper-evident admin review activity and system changes.
6. **`system_settings`**: Global platform configurations.

---

## 5. Temporary Screenshot Storage Architecture (`submission-evidence`)

### Bucket Specification
- **Bucket ID:** `submission-evidence`
- **Visibility:** Private (`public = false`)
- **Access Control:** Authenticated creators can only write/read inside their own user folder (`{userId}/*`). Admins can read all evidence folders for verification.
- **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`
- **Maximum File Size:** `5 MB` (5,242,880 bytes)

### Temporary Retention Policy
To prevent unbounded storage growth and stay comfortably within the Supabase Free Tier:
1. Creator uploads an insight screenshot when submitting content.
2. The file is reviewed by administrators during verification.
3. Upon approval or rejection, a 14-day grace period is initiated.
4. **14 days after decision**, the physical screenshot file is permanently deleted from Supabase Storage.
5. **Dispute Clause:** If a creator disputes a decision or an investigation is open, deletion is postponed until resolution.
6. **Permanent Audit Record:** Submission verification data, view counts, and admin review notes remain permanently preserved in PostgreSQL.

### Future Automated Cleanup Workflow (Phases 3–4)
- Scheduled via **Supabase Cron (`pg_cron`)** or a scheduled **Supabase Edge Function**.
- Runs daily: selects submissions decided $> 14$ days ago without active disputes.
- Deletes corresponding files from Storage via the Supabase Storage API.
- Logs deletion timestamp and status idempotently.

---

## 6. Administrative Authorization & Provisioning

- **No Self-Promotion Endpoints:** The obsolete `/api/auth/bootstrap-admin` HTTP endpoint has been removed. Administrative authority cannot be self-granted over HTTP.
- **Trusted CLI Provisioning Script:**
  ```bash
  npx tsx scripts/provision-admin.ts <authorized-email>
  ```
  This script utilizes the private `SUPABASE_SECRET_KEY` (service role) to explicitly promote a verified user in `admin_roles`.
- **Server Verification:** Server endpoints (such as `/api/auth/me`) verify identity through `@supabase/ssr` cookies and query `admin_roles` server-side before granting privileged responses.
