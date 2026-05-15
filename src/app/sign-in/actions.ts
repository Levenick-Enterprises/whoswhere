"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicOrigin, safeNext } from "@/lib/origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import {
  RESEND_COOLDOWN_SECONDS,
  SIGNIN_COOKIE_MAX_AGE,
  SIGNIN_EMAIL_COOKIE,
  SIGNIN_SENT_AT_COOKIE,
} from "./cookies";

function parseAllowlist(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().normalize("NFKC").toLowerCase())
    .filter(Boolean);
}

function isWithinCooldown(sentAtRaw: string | undefined): boolean {
  if (!sentAtRaw) return false;
  const sentAt = Number(sentAtRaw);
  if (!Number.isFinite(sentAt)) return false;
  return Date.now() - sentAt < RESEND_COOLDOWN_SECONDS * 1000;
}

function buildSentUrl(next: string, opts: { invalid?: boolean } = {}): string {
  const search = new URLSearchParams({ sent: "1" });
  if (opts.invalid) search.set("invalid", "1");
  if (next !== "/jobsites") search.set("next", next);
  return `/sign-in?${search.toString()}`;
}

/**
 * Sends an email with a numeric one-time sign-in code (and no clickable
 * link — see CLAUDE.md "Why no magic link in the email body"), but only if
 * the submitted address appears in the per-tenant ALLOWED_EMAILS allowlist.
 * Always redirects to the same neutral "check your email" state regardless
 * of allowlist outcome so an attacker can't enumerate authorized addresses.
 * `next` carries through from the middleware redirect so the user lands on
 * the originally-requested page after they verify.
 *
 * Wraps Supabase's `signInWithOtp`, which still generates a magic-link URL
 * server-side — we just don't surface it in the email body. The `/sign-in`
 * UI completes auth via the typed-code path (`verifyOtpAction`), and the
 * `/auth/callback` route stays alive defensively for any in-flight emails
 * that pre-date the template change or for a future re-enable.
 *
 * The form can either submit a fresh email or omit it (used by the Resend
 * button on the post-submit screen), in which case we fall back to the last
 * email stored in the `signin_email` cookie. Cookies are always written
 * regardless of allowlist match so the UI behaves identically and doesn't
 * leak which addresses are accepted.
 */
export async function requestSignInCodeAction(formData: FormData) {
  const cookieStore = await cookies();
  const formEmail = String(formData.get("email") ?? "")
    .trim()
    .normalize("NFKC")
    .toLowerCase();
  const rawEmail = formEmail || (cookieStore.get(SIGNIN_EMAIL_COOKIE)?.value ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  // Server-side cooldown. The UI countdown is client-only and bypassable;
  // this gate enforces the 30s window even for curl/fetch/devtools attempts.
  // We still write the cookies + redirect below regardless of whether the
  // send happened, so the response shape doesn't reveal whether an email
  // is allowlisted OR whether the request was throttled.
  const cooldown = isWithinCooldown(cookieStore.get(SIGNIN_SENT_AT_COOKIE)?.value);

  if (!cooldown && rawEmail && parseAllowlist().includes(rawEmail)) {
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

  redirect(buildSentUrl(next));
}

/**
 * Verifies a numeric one-time code typed into the /sign-in?sent=1 form.
 * Mirrors the magic-link click semantically: same email, same Supabase
 * token under the hood, different delivery mechanism. Lets the operator
 * finish sign-in in the same browser tab they typed their email into —
 * no mail-app round-trip, and immune to URL prefetchers that consume
 * single-use magic-link tokens before the human can click.
 *
 * Email is read from the `signin_email` cookie set by requestSignInCodeAction.
 * If the cookie is missing, the code shape is wrong, or the email is no
 * longer on the allowlist, redirect back with the generic invalid state —
 * no differentiation (same UX, same non-enumeration posture). Supabase
 * enforces its own attempt rate-limit on verifyOtp so we don't need an
 * additional cooldown here.
 */
export async function verifyOtpAction(formData: FormData) {
  const cookieStore = await cookies();
  const email = cookieStore.get(SIGNIN_EMAIL_COOKIE)?.value ?? "";
  const code = String(formData.get("code") ?? "").trim();
  const next = safeNext(String(formData.get("next") ?? ""));

  // Supabase OTPs are configurable per-project (6–10 digits). Accept the
  // whole range here and let supabase.auth.verifyOtp reject anything wrong;
  // we only gate on shape ("looks like a numeric OTP") before the API call.
  if (!email || !/^\d{6,10}$/.test(code)) {
    redirect(buildSentUrl(next, { invalid: true }));
  }

  // Re-check the allowlist at verify time. requestSignInCodeAction writes
  // the cookie regardless of allowlist match (the no-enumeration property),
  // so without this gate someone holding an unexpired OTP for an address
  // that was previously allowlisted but has since been removed could still
  // authenticate. Same generic redirect as other failure paths so attempts
  // remain indistinguishable from invalid codes.
  if (!parseAllowlist().includes(email)) {
    redirect(buildSentUrl(next, { invalid: true }));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });

  if (error) {
    console.error("[sign-in] verifyOtp rejected:", error);
    redirect(buildSentUrl(next, { invalid: true }));
  }

  redirect(next);
}
