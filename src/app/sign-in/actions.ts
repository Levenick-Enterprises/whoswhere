"use server";

import { redirect } from "next/navigation";

import { publicOrigin, safeNext } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseAllowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Sends a magic-link OTP to the submitted email, but only if it appears in
 * the per-tenant ALLOWED_EMAILS allowlist. We always redirect to the same
 * neutral "check your email" state regardless of allowlist outcome so an
 * attacker can't enumerate authorized addresses. `next` carries through from
 * the middleware redirect so the user lands on the originally-requested page.
 */
export async function requestMagicLinkAction(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (rawEmail && parseAllowlist().includes(rawEmail)) {
    const supabase = await createSupabaseServerClient();
    const callbackUrl = new URL(`${await publicOrigin()}/auth/callback`);
    if (next !== "/jobsites") callbackUrl.searchParams.set("next", next);
    const { error } = await supabase.auth.signInWithOtp({
      email: rawEmail,
      options: { emailRedirectTo: callbackUrl.toString(), shouldCreateUser: true },
    });
    if (error) console.error("[sign-in] supabase rejected:", error);
  }

  redirect("/sign-in?sent=1");
}
