"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseAllowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function originFromHeaders(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) throw new Error("Cannot determine request origin (no host header).");
  return `${proto}://${host}`;
}

/**
 * Sends a magic-link OTP to the submitted email, but only if it appears in
 * the per-tenant ALLOWED_EMAILS allowlist. We always redirect to the same
 * neutral "check your email" state regardless of allowlist outcome so an
 * attacker can't enumerate authorized addresses.
 */
export async function requestMagicLinkAction(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (rawEmail && parseAllowlist().includes(rawEmail)) {
    const supabase = await createSupabaseServerClient();
    const origin = await originFromHeaders();
    await supabase.auth.signInWithOtp({
      email: rawEmail,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
  }

  redirect("/sign-in?sent=1");
}
