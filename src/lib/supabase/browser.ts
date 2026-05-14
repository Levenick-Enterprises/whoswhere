"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./types";

let cachedClient: SupabaseClient<Database> | null = null;

/**
 * Cookie-backed Supabase client for use in client components — needed for
 * auth-side calls like `signOut()` and realtime subscriptions. Reads the
 * same `NEXT_PUBLIC_*` env vars as the server client; bundles into the
 * browser at build time.
 *
 * Returns a module-level singleton so callers across the app share one
 * SupabaseClient instance per browser tab. Repeated calls (e.g. effects
 * that re-run on route change) don't create duplicate auth listeners or
 * realtime channel managers — recommended by `@supabase/ssr`'s docs.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> {
  if (cachedClient) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  cachedClient = createBrowserClient<Database>(url, publishableKey);
  return cachedClient;
}
