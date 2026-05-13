"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./types";

/**
 * Cookie-backed Supabase client for use in client components — needed for
 * auth-side calls like `signOut()` and (later) realtime subscriptions. Reads
 * the same `NEXT_PUBLIC_*` env vars as the server client; bundles into the
 * browser at build time.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.",
    );
  }

  return createBrowserClient<Database>(url, publishableKey);
}
