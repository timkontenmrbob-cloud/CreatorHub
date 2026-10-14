import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database";
import { getSupabaseEnv } from "./config";

let adminClient: ReturnType<typeof createClient<Database>> | null = null;

/**
 * Returns a Supabase client with the service role key.
 * This client bypasses Row Level Security and must only be used in trusted server-side code.
 * NEVER expose this client or the service role key to the browser.
 */
export function createAdminClient() {
  const { url, secretKey, isAdminConfigured } = getSupabaseEnv();

  if (!isAdminConfigured) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient<Database>(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
