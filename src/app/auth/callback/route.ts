import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/config";
import { isProfileComplete, isSafeLocalRedirect } from "@/lib/supabase/auth";
import { Database } from "@/lib/types/database";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams, origin } = requestUrl;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const effectiveOrigin = forwardedHost && !isLocalEnv
    ? `https://${forwardedHost}`
    : origin;

  const code = searchParams.get("code");
  const authError = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const rawNext = searchParams.get("next");

  // Handle provider or user cancellation errors
  if (authError || errorDescription) {
    console.warn("Supabase OAuth callback returned error:", authError, errorDescription);
    const friendlyError =
      authError === "access_denied"
        ? "Proses masuk dengan Google dibatalkan."
        : errorDescription || "Terjadi kendala saat autentikasi dengan Google.";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(friendlyError)}`, effectiveOrigin)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Kode+autentikasi+tidak+ditemukan.", effectiveOrigin)
    );
  }

  const { url, publishableKey, isConfigured } = getSupabaseEnv();
  if (!isConfigured) {
    return NextResponse.redirect(
      new URL("/login?error=Layanan+autentikasi+sedang+dalam+pemeliharaan.", effectiveOrigin)
    );
  }

  const cookieStore = await cookies();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Can be safely ignored in Server Route Handler
        }
      },
    },
  });

  // Exchange auth code for session
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("Supabase code exchange failed:", exchangeError.message);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          "Gagal memverifikasi sesi Google. Silakan coba masuk kembali."
        )}`,
        effectiveOrigin
      )
    );
  }

  const user = sessionData?.user;
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?error=Pengguna+tidak+ditemukan.", effectiveOrigin)
    );
  }

  // 1. Check if user is an authorized admin
  const { data: adminRole } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRole && ["admin", "superadmin", "super_admin"].includes(adminRole.role as string)) {
    return NextResponse.redirect(new URL("/admin/dashboard", effectiveOrigin));
  }

  // 2. Check if user's profile exists & is completed
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp_number, tiktok_username, instagram_username, profile_completed, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  // If profile record is not yet created by database trigger, initialize it safely
  if (!profile) {
    const rawMeta = user.user_metadata || {};
    const fullName =
      rawMeta.full_name ||
      rawMeta.name ||
      rawMeta.display_name ||
      user.email?.split("@")[0] ||
      "Creator";
    const avatarUrl = (rawMeta.avatar_url as string) || (rawMeta.picture as string) || null;

    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      avatar_url: avatarUrl,
      profile_completed: false,
    });

    return NextResponse.redirect(new URL("/complete-profile", effectiveOrigin));
  }

  // Ensure latest Google avatar metadata is synced to existing profile
  const rawMeta = user.user_metadata || {};
  const googleAvatar = (rawMeta.avatar_url as string) || (rawMeta.picture as string) || null;
  if (googleAvatar && (!profile.avatar_url || profile.avatar_url !== googleAvatar)) {
    await supabase
      .from("profiles")
      .update({ avatar_url: googleAvatar })
      .eq("id", user.id);
  }

  // Authoritative completeness evaluation: satisfies rules OR flag
  if (!isProfileComplete(profile)) {
    return NextResponse.redirect(new URL("/complete-profile", effectiveOrigin));
  }

  // Sanitized redirect destination for completed creator profile
  let destination = rawNext || "/creator/dashboard";
  if (
    !isSafeLocalRedirect(destination) ||
    destination === "/complete-profile" ||
    destination.startsWith("/login") ||
    destination.startsWith("/register")
  ) {
    destination = "/creator/dashboard";
  }

  return NextResponse.redirect(new URL(destination, effectiveOrigin));
}
