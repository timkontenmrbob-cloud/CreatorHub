import { createClient } from "./client";
import { UserRole } from "../types/user";

export interface ManagedUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
  isSuperAdmin: boolean;
  createdAt: string;
}

export interface AdminRoleAuditLog {
  id: string;
  targetUserId: string;
  targetEmail: string;
  action: "assign_admin" | "revoke_admin";
  performedBy: string;
  performedByEmail: string;
  notes?: string;
  createdAt: string;
}

// In-memory fallback for audit logs if remote table is pending schema cache
const inMemoryAuditLogs: AdminRoleAuditLog[] = [];

/**
 * Fetch all registered users with their current authoritative administrative role
 */
export async function fetchManagedUsers(
  customClient?: ReturnType<typeof createClient>
): Promise<ManagedUser[]> {
  const supabase = customClient || createClient();

  // 1. Fetch all profiles
  const { data: profiles, error: pError } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, created_at")
    .order("created_at", { ascending: false });

  if (pError) {
    console.error("fetchManagedUsers profiles error:", pError);
  }

  // 2. Fetch admin roles
  const { data: adminRoles, error: aError } = await supabase
    .from("admin_roles")
    .select("user_id, role");

  if (aError) {
    console.error("fetchManagedUsers adminRoles error:", aError);
  }

  const roleMap = new Map<string, string>();
  for (const r of adminRoles || []) {
    roleMap.set(r.user_id, r.role);
  }

  const userList: ManagedUser[] = [];
  for (const p of profiles || []) {
    const rawRole = roleMap.get(p.id);
    let role: UserRole = "creator";
    let isSuper = false;

    if (rawRole === "superadmin" || rawRole === "super_admin" || p.email === "leadersosmed@gmail.com") {
      role = "super_admin";
      isSuper = true;
    } else if (rawRole === "admin") {
      role = "admin";
    }

    userList.push({
      id: p.id,
      email: p.email,
      fullName: p.full_name || p.email.split("@")[0] || "User",
      avatarUrl: p.avatar_url || undefined,
      role,
      isSuperAdmin: isSuper,
      createdAt: p.created_at,
    });
  }

  return userList;
}

/**
 * Fetch administrative role audit history
 */
export async function fetchRoleAuditLogs(
  customClient?: ReturnType<typeof createClient>
): Promise<AdminRoleAuditLog[]> {
  const supabase = customClient || createClient();

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from as any)("admin_role_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.map((d: any) => ({
        id: d.id,
        targetUserId: d.target_user_id,
        targetEmail: d.target_email,
        action: d.action,
        performedBy: d.performed_by,
        performedByEmail: d.performed_by_email,
        notes: d.notes,
        createdAt: d.created_at,
      }));
    }
  } catch {
    // Fallback
  }

  return [...inMemoryAuditLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
