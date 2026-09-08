import { createClient } from "@supabase/supabase-js";
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let client;
export function getSupabaseClient() {
  if (!isSupabaseConfigured)
    throw new Error(
      "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local before signing in.",
    );
  return (client ??= createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }));
}
