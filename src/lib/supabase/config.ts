/**
 * Supabase Environment Configuration & Validation Helper
 */
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";

  return {
    url,
    publishableKey,
    secretKey,
    isConfigured: Boolean(url && publishableKey && !url.includes("your-project")),
    isAdminConfigured: Boolean(url && secretKey && !url.includes("your-project")),
  };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv().isConfigured;
}
