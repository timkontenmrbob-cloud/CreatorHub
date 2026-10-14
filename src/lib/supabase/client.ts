import { createBrowserClient } from "@supabase/ssr";
import { Database } from "../types/database";
import { getSupabaseEnv } from "./config";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  const { url, publishableKey, isConfigured } = getSupabaseEnv();

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
