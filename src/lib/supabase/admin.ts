import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Server-only Supabase client that uses the secret key and bypasses RLS.
 *
 * Not used by app routes — every page and server action goes through
 * `createSupabaseServerClient()` (cookie-backed, auth-aware) instead. This
 * client stays in the codebase as an escape hatch for future server-only
 * utilities that legitimately need to bypass RLS: bulk imports, scripts,
 * webhook handlers, anything without a user session. Never import from a
 * client component.
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
