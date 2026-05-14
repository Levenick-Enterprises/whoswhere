"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicOrigin, safeNext } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  SIGNIN_COOKIE_MAX_AGE,
  SIGNIN_EMAIL_COOKIE,
  SIGNIN_SENT_AT_COOKIE,
} from "./cookies";

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
 *
 * The form can either submit a fresh email or omit it (used by the Resend
 * button on the post-submit screen), in which case we fall back to the last
 * email stored in the `signin_email` cookie. Cookies are always written
 * regardless of allowlist match so the UI behaves identically and doesn't
 * leak which addresses are accepted.
 */
export async function requestMagicLinkAction(formData: FormData) {
  const cookieStore = await cookies();
  const formEmail = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const rawEmail = formEmail || (cookieStore.get(SIGNIN_EMAIL_COOKIE)?.value ?? "");
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

  if (rawEmail) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: SIGNIN_COOKIE_MAX_AGE,
      path: "/sign-in",
    };
    cookieStore.set(SIGNIN_EMAIL_COOKIE, rawEmail, cookieOptions);
    cookieStore.set(SIGNIN_SENT_AT_COOKIE, String(Date.now()), cookieOptions);
  }

  const search = new URLSearchParams({ sent: "1" });
  if (next !== "/jobsites") search.set("next", next);
  redirect(`/sign-in?${search.toString()}`);
}
