import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/database";
import { getSupabaseEnv } from "./config";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  const { url, publishableKey, secretKey, isConfigured } = getSupabaseEnv();

  // If in Node.js server/test environment with secretKey available, use service client
  if (typeof window === "undefined" && secretKey) {
    return createSupabaseClient<Database>(url, secretKey, {
      auth: { persistSession: false },
    }) as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }

  if (!isConfigured) {
    return createBrowserClient<Database>(
      url || "https://placeholder.supabase.co",
      publishableKey || "placeholder-key"
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, publishableKey);
  }
  return browserClient;
}
