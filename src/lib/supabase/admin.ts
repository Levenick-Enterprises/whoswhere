import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Server-only Supabase client that uses the secret key.
 *
 * Bypasses RLS. Never import this from a client component. For v1 the
 * secret-key client is the *only* path to the database — RLS is enabled
 * with no policies, so the publishable key can read nothing. When auth
 * lands, we'll add a separate cookie-backed user client for auth-scoped
 * queries.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
