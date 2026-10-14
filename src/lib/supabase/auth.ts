import { createClient } from "./client";
import { UserProfile, UserRole } from "../types/user";

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  tiktokUsername?: string;
  instagramUsername?: string;
  phoneNumber?: string;
}

/**
 * Maps Supabase error messages to friendly Indonesian text
 */
export function mapSupabaseError(error: Error | { message?: string; status?: number }): string {
  const msg = error.message || "";

  if (msg.includes("Invalid login credentials")) {
    return "Email atau kata sandi salah. Silakan coba lagi.";
  }
  if (msg.includes("User already registered") || msg.includes("already registered")) {
    return "Email ini sudah terdaftar. Silakan login ke akun Anda.";
  }
  if (msg.includes("Password should be at least") || msg.includes("weak_password")) {
    return "Kata sandi terlalu lemah. Minimal 6 karakter.";
  }
  if (msg.includes("rate limit") || msg.includes("Email rate limit exceeded")) {
    return "Terlalu banyak percobaan. Harap tunggu beberapa saat lagi.";
  }
  if (msg.includes("invalid format") || msg.includes("Unable to validate email address")) {
    return "Format email tidak valid.";
  }
  if (msg.includes("network") || msg.includes("Failed to fetch")) {
    return "Koneksi internet bermasalah. Periksa jaringan Anda.";
  }

  return msg || "Terjadi kesalahan saat memproses permintaan.";
}

/**
 * Register a new Creator account with Supabase Auth & create profile
 */
export async function registerCreator(input: RegisterInput): Promise<{
  user: UserProfile;
  needsEmailConfirmation: boolean;
}> {
  const supabase = createClient();

  const cleanTiktok = input.tiktokUsername ? input.tiktokUsername.trim().replace(/^@/, "") : "";
  const cleanInstagram = input.instagramUsername ? input.instagramUsername.trim().replace(/^@/, "") : "";
  const cleanPhone = input.phoneNumber ? input.phoneNumber.trim() : "";
  const cleanDisplayName = input.displayName.trim();

  // 1. Register with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: {
        full_name: cleanDisplayName,
        display_name: cleanDisplayName,
        tiktok_username: cleanTiktok,
        instagram_username: cleanInstagram,
        whatsapp_number: cleanPhone,
      },
    },
  });

  if (authError || !authData.user) {
    throw new Error(mapSupabaseError(authError || new Error("Pendaftaran gagal.")));
  }

  const userId = authData.user.id;
  const userEmail = authData.user.email || input.email.trim();
  const needsEmailConfirmation = !authData.session;

  // 2. Ensure profile exists in profiles table (database trigger will usually create this,
  // but we perform an upsert here for maximum reliability and immediate UI availability)
  try {
    await supabase.from("profiles").upsert({
      id: userId,
      full_name: cleanDisplayName,
      email: userEmail,
      tiktok_username: cleanTiktok || null,
      instagram_username: cleanInstagram || null,
      whatsapp_number: cleanPhone || null,
    });
  } catch (err) {
    // Non-blocking if the trigger already inserted it
    console.warn("Direct profile upsert skipped (managed by trigger):", err);
  }

  const profile: UserProfile = {
    uid: userId,
    email: userEmail,
    displayName: cleanDisplayName,
    role: "creator", // Public registration ALWAYS assigns creator role
    tiktokUsername: cleanTiktok || undefined,
    instagramUsername: cleanInstagram || undefined,
    phoneNumber: cleanPhone || undefined,
    createdAt: authData.user.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return { user: profile, needsEmailConfirmation };
}

/**
 * Sign in with email and password
 */
export async function loginUser(email: string, pass: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password: pass,
  });

  if (error || !data.user) {
    throw new Error(mapSupabaseError(error || new Error("Gagal masuk.")));
  }

  return data.user.id;
}

/**
 * Sign out from current session
 */
export async function logoutUser(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Supabase signOut error:", error);
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/login?reset=success`,
  });

  if (error) {
    throw new Error(mapSupabaseError(error));
  }
}

/**
 * Fetch creator profile & check admin authorization
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();

  // 1. Fetch profile record
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("Error fetching user profile:", profileError);
    return null;
  }

  // 2. Determine administrative authorization server-side from admin_roles table
  let role: UserRole = "creator";
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (adminRole && (adminRole.role === "admin" || adminRole.role === "superadmin")) {
    role = "admin";
  }

  if (!profile) {
    return null;
  }

  return {
    uid: profile.id,
    email: profile.email,
    displayName: profile.full_name,
    role,
    tiktokUsername: profile.tiktok_username || undefined,
    instagramUsername: profile.instagram_username || undefined,
    phoneNumber: profile.whatsapp_number || undefined,
    photoURL: profile.avatar_url || undefined,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

/**
 * Update creator profile (only allowed profile columns)
 */
export async function updateUserProfile(
  userId: string,
  data: {
    displayName?: string;
    tiktokUsername?: string;
    instagramUsername?: string;
    phoneNumber?: string;
  }
): Promise<void> {
  const supabase = createClient();

  const updatePayload: {
    full_name?: string;
    tiktok_username?: string | null;
    instagram_username?: string | null;
    whatsapp_number?: string | null;
  } = {};

  if (data.displayName !== undefined) {
    updatePayload.full_name = data.displayName.trim();
  }
  if (data.tiktokUsername !== undefined) {
    updatePayload.tiktok_username = data.tiktokUsername.trim().replace(/^@/, "") || null;
  }
  if (data.instagramUsername !== undefined) {
    updatePayload.instagram_username = data.instagramUsername.trim().replace(/^@/, "") || null;
  }
  if (data.phoneNumber !== undefined) {
    updatePayload.whatsapp_number = data.phoneNumber.trim() || null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  if (error) {
    throw new Error(mapSupabaseError(error));
  }
}
