import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";

export const isSupabaseConfigured = Boolean(
  config.SUPABASE_URL &&
  (config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY) &&
  !config.SUPABASE_URL.includes("your-project") &&
  config.SUPABASE_URL.startsWith("http")
);

/**
 * Privileged server-side Supabase client.
 * Uses the service-role key for backend operations, storage bucket handling, and admin user checks.
 */
export const supabaseAdmin: SupabaseClient | null = isSupabaseConfigured
  ? createClient(
      config.SUPABASE_URL!,
      config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    )
  : null;

if (isSupabaseConfigured) {
  console.log(`🔌 Supabase Client initialized with endpoint: ${config.SUPABASE_URL}`);
}
