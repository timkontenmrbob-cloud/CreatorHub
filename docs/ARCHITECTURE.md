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

### Database Triggers & Helper Functions
- `public.handle_new_user()`: Automatically creates a `profiles` row using metadata provided at signup.
- `public.handle_updated_at()`: Automatically refreshes `updated_at` timestamps on row mutation.
- `public.is_admin(check_user_id uuid)`: `SECURITY DEFINER` function returning `boolean` indicating if a user has active administrative permissions.

---

## 3. Row Level Security (RLS) Policy Architecture

All exposed tables in `public` have Row Level Security enabled with least-privilege policies:

### `public.profiles`
- **SELECT:** `auth.uid() = id or public.is_admin(auth.uid())`
  - Creators can only view their own profile.
  - Authorized administrators can view all creator profiles.
- **UPDATE:** `auth.uid() = id`
  - Creators can only modify their own profile information.
  - Updating sensitive administrative credentials via this table is impossible (held in separate `admin_roles`).
- **INSERT:** `auth.uid() = id`
  - Primarily executed via secure database trigger; self-insert fallback allowed for authenticated user only.

### `public.admin_roles`
- **SELECT:** `auth.uid() = user_id or public.is_admin(auth.uid())`
  - Users can verify their own administrative status.
- **INSERT / UPDATE / DELETE:** **Zero public client access.**
  - No client policies are provided. Direct API modifications from browser clients are denied by RLS.
  - Only database superusers and the Supabase `service_role` can grant or revoke administrative authority.

---

## 4. Planned Future Tables (Phases 2–7)

1. **`submissions`**: Final approved or rejected video submissions with verified views and review notes.
2. **`submission_drafts`**: Incomplete drafts saved by creators (does not extend 30-day window).
3. **`submission_evidence`**: Evidence reference linking to screenshot paths in private storage with review timestamps.
4. **`point_lots`**: Batches of points awarded, tracking the 6-month calendar expiration date for First-Expired, First-Out (FEFO) consumption.
5. **`point_transactions`**: Immutable financial ledger recording every earned, redeemed, or expired point mutation.
6. **`rewards`**: Official reward catalog with required points and available inventory stock.
7. **`redemptions`**: Redemption claims with shipping address and fulfillment status.
8. **`reward_inventory`**: Stock tracking, reservations, and physical receipt logs.
9. **`quarterly_reports`**: Aggregate quarterly performance and research metrics.
10. **`audit_logs`**: Tamper-evident admin review activity and system changes.
11. **`system_settings`**: Global platform configurations.

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
