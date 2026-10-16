import { createClient } from "./client";
import { UserProfile, UserRole } from "../types/user";
import { Database } from "../types/database";

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

/** Only allow paths on this app after OAuth. */
export function isSafeLocalRedirect(path: string | null | undefined): path is string {
  return Boolean(path?.startsWith("/") && !path.startsWith("//") && !path.includes("\\"));
}

/** Sign in using Google OAuth via Supabase. */
export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  const supabase = createClient();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = new URL("/auth/callback", origin);
  if (isSafeLocalRedirect(redirectTo) && redirectTo !== "/complete-profile") {
    callbackUrl.searchParams.set("next", redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error(mapSupabaseError(error));
  }

  if (data?.url && typeof window !== "undefined") {
    window.location.href = data.url;
  }
}

/**
 * Validate Indonesian mobile / WhatsApp phone numbers
 * e.g., 08123456789, +628123456789, 628123456789 (10-14 digits)
 */
export function isValidIndonesianPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s-]/g, "");
  return /^(\+628|628|08)[0-9]{8,11}$/.test(cleaned);
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
 * Authoritative completeness check based on official business rules:
 * A profile is complete when:
 * 1. Explicitly marked profile_completed = true, OR
 * 2. Satisfies all 3 required completion rules:
 *    - Full name exists
 *    - WhatsApp number exists
 *    - At least one social media username exists (TikTok or Instagram)
 */
export function isProfileComplete(profile: {
  full_name?: string | null;
  whatsapp_number?: string | null;
  tiktok_username?: string | null;
  instagram_username?: string | null;
  profile_completed?: boolean | null;
  displayName?: string | null;
  phoneNumber?: string | null;
  tiktokUsername?: string | null;
  instagramUsername?: string | null;
  profileCompleted?: boolean | null;
} | null | undefined): boolean {
  if (!profile) return false;

  if (profile.profile_completed === true || profile.profileCompleted === true) {
    return true;
  }

  const name = (profile.full_name || profile.displayName || "").trim();
  const phone = (profile.whatsapp_number || profile.phoneNumber || "").trim();
  const tiktok = (profile.tiktok_username || profile.tiktokUsername || "").trim().replace(/^@+/, "");
  const ig = (profile.instagram_username || profile.instagramUsername || "").trim().replace(/^@+/, "");

  const hasName = name.length > 0;
  const hasPhone = phone.length > 0;
  const hasSocial = tiktok.length > 0 || ig.length > 0;

  return Boolean(hasName && hasPhone && hasSocial);
}

/**
 * Fetch creator profile & check admin authorization
 */
export async function getUserProfile(
  userId: string,
  fallbackAvatarUrl?: string
): Promise<UserProfile | null> {
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

  if (adminRole) {
    const roleStr = adminRole.role as string;
    if (roleStr === "superadmin" || roleStr === "super_admin") {
      role = "super_admin";
    } else if (roleStr === "admin") {
      role = "admin";
    }
  }

  if (!profile) {
    return null;
  }

  let effectiveAvatar = profile.avatar_url || fallbackAvatarUrl || undefined;

  let publicLeaderboardConsent = true;
  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user && authData.user.id === userId) {
      if ("public_leaderboard_consent" in profile && profile.public_leaderboard_consent !== null) {
        publicLeaderboardConsent = Boolean(profile.public_leaderboard_consent);
      } else if (authData.user.user_metadata?.public_leaderboard_consent === false) {
        publicLeaderboardConsent = false;
      }
      if (!effectiveAvatar) {
        const rawMeta = authData.user.user_metadata || {};
        effectiveAvatar = (rawMeta.avatar_url as string) || (rawMeta.picture as string) || undefined;
      }
    } else if ("public_leaderboard_consent" in profile && profile.public_leaderboard_consent !== null) {
      publicLeaderboardConsent = Boolean(profile.public_leaderboard_consent);
    }
  } catch {
    if ("public_leaderboard_consent" in profile && profile.public_leaderboard_consent !== null) {
      publicLeaderboardConsent = Boolean(profile.public_leaderboard_consent);
    }
  }

  // Asynchronously sync avatar to DB if missing in record but provided via Google OAuth
  if (!profile.avatar_url && effectiveAvatar) {
    supabase
      .from("profiles")
      .update({ avatar_url: effectiveAvatar })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) console.warn("Failed to sync avatar to profile:", error);
      });
  }

  return {
    uid: profile.id,
    email: profile.email,
    displayName: profile.full_name,
    role,
    tiktokUsername: profile.tiktok_username || undefined,
    instagramUsername: profile.instagram_username || undefined,
    phoneNumber: profile.whatsapp_number || undefined,
    photoURL: effectiveAvatar,
    profileCompleted: isProfileComplete(profile),
    publicLeaderboardConsent,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

export interface CompleteProfileInput {
  fullName: string;
  whatsappNumber: string;
  tiktokUsername?: string;
  instagramUsername?: string;
}

/**
 * Complete creator profile for first-time login
 * Validates fullName, Indonesian WhatsApp phone, and at least one social media handle
 * Returns the fresh server-verified profile record
 */
export async function completeCreatorProfile(
  userId: string,
  input: CompleteProfileInput
): Promise<UserProfile> {
  const supabase = createClient();

  const cleanFullName = input.fullName.trim();
  const cleanPhone = input.whatsappNumber.trim().replace(/[\s-]/g, "");
  const cleanTiktok = (input.tiktokUsername || "").trim().replace(/^@+/, "");
  const cleanInstagram = (input.instagramUsername || "").trim().replace(/^@+/, "");

  if (!cleanFullName) {
    throw new Error("Nama Lengkap wajib diisi.");
  }

  if (!cleanPhone) {
    throw new Error("Nomor WhatsApp wajib diisi.");
  }

  if (!isValidIndonesianPhone(cleanPhone)) {
    throw new Error(
      "Format nomor WhatsApp tidak valid. Gunakan format nomor Indonesia (contoh: 08123456789 atau +628123456789)."
    );
  }

  if (!cleanTiktok && !cleanInstagram) {
    throw new Error("Harap isi minimal satu akun media sosial (TikTok atau Instagram).");
  }

  // Check if profile exists, if not fallback insert
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle();

  type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
  type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];

  const updatePayload: ProfileUpdate = {
    full_name: cleanFullName,
    whatsapp_number: cleanPhone,
    tiktok_username: cleanTiktok || null,
    instagram_username: cleanInstagram || null,
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };

  if (!existingProfile) {
    const { data: authData } = await supabase.auth.getUser();
    const insertPayload: ProfileInsert = {
      id: userId,
      email: authData.user?.email || "",
      full_name: cleanFullName,
      whatsapp_number: cleanPhone,
      tiktok_username: cleanTiktok || null,
      instagram_username: cleanInstagram || null,
      profile_completed: true,
      updated_at: new Date().toISOString(),
    };

    let { error: insertError } = await supabase.from("profiles").insert(insertPayload);

    // Fallback if remote schema doesn't yet have profile_completed column
    if (insertError && insertError.message?.includes("profile_completed")) {
      delete insertPayload.profile_completed;
      const retry = await supabase.from("profiles").insert(insertPayload);
      insertError = retry.error;
    }

    if (insertError) {
      throw new Error(mapSupabaseError(insertError));
    }
  } else {
    let { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);

    // Fallback if remote schema doesn't yet have profile_completed column
    if (updateError && updateError.message?.includes("profile_completed")) {
      delete updatePayload.profile_completed;
      const retry = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", userId);
      updateError = retry.error;
    }

    if (updateError) {
      throw new Error(mapSupabaseError(updateError));
    }
  }

  // Fetch and return the fresh, server-verified profile
  const freshProfile = await getUserProfile(userId);
  if (!freshProfile) {
    throw new Error("Gagal memverifikasi profil setelah disimpan. Silakan coba kembali.");
  }

  return freshProfile;
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
    publicLeaderboardConsent?: boolean;
  }
): Promise<void> {
  const supabase = createClient();

  const updatePayload: {
    full_name?: string;
    tiktok_username?: string | null;
    instagram_username?: string | null;
    whatsapp_number?: string | null;
    public_leaderboard_consent?: boolean;
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
  if (data.publicLeaderboardConsent !== undefined) {
    updatePayload.public_leaderboard_consent = data.publicLeaderboardConsent;
  }

  // Also sync consent to auth user_metadata for robust persistence
  if (data.publicLeaderboardConsent !== undefined) {
    try {
      await supabase.auth.updateUser({
        data: {
          public_leaderboard_consent: data.publicLeaderboardConsent,
        },
      });
    } catch (authMetaErr) {
      console.warn("Could not sync user_metadata consent:", authMetaErr);
    }
  }

  let { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId);

  // Fallback if public_leaderboard_consent column does not exist in profiles table
  if (error && error.message?.includes("public_leaderboard_consent")) {
    delete updatePayload.public_leaderboard_consent;
    const retry = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId);
    error = retry.error;
  }

  if (error) {
    throw new Error(mapSupabaseError(error));
  }
}
