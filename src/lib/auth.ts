import "server-only";

import type { ActionResult } from "@/lib/action-result";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "audit";

export type CurrentUser = {
  /** Normalized (trim + NFKC + lowercase) — matches the app_users PK form. */
  email: string;
  /** `null` when the user signed in but has no app_users row (e.g. removed mid-session). */
  role: UserRole | null;
};

/**
 * Resolve the current request's user — email + role together. `null` when
 * unauthenticated (shouldn't happen on app routes — middleware redirects to
 * /sign-in first — but defensively null-safe).
 *
 * A null role gates *writes*: `assertAdmin()` throws, admin-only RLS rejects.
 * Reads stay open — SELECT RLS on projects/people is permissive for any
 * authenticated user, and middleware only checks that a Supabase session
 * exists. With Phase 2 (/users UI), removing an app_users row also revokes
 * sessions globally via the admin API, so the read-window after removal is
 * one request cycle, not the full refresh-token TTL.
 *
 * Cheap to call repeatedly within a request: middleware already loaded the
 * session, and `auth.getUser()` short-circuits to the cached value.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  // Normalize to stay in lockstep with the app_users PK convention — Supabase
  // typically stores emails lowercased, but routing through normalizeEmail()
  // makes the lookup case + Unicode invariant regardless.
  const normalized = normalizeEmail(user.email);
  const { data, error } = await supabase
    .from("app_users")
    .select("role")
    .eq("email", normalized)
    .maybeSingle();
  if (error) {
    // Don't fail open — return a role-less user so callers treat them as
    // "no admin write access" everywhere. Log so a misconfigured GRANT / RLS
    // surfaces in Vercel function logs instead of silently turning every
    // user into read-only.
    console.error("[auth] app_users lookup failed:", error);
    return { email: normalized, role: null };
  }
  const role = data?.role === "admin" || data?.role === "audit" ? data.role : null;
  return { email: normalized, role };
}

/** Convenience wrapper for the common "just the role" case. */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  return (await getCurrentUser())?.role ?? null;
}

/**
 * Thrown by `assertAdmin()` when the caller isn't an admin. Server actions
 * catch this specifically and surface `err.message` in their `{ ok: false }`
 * response shape — RLS would deny the mutation anyway, but the friendly
 * error path lets the UI render a real message instead of a generic 500.
 */
export class ActionPermissionError extends Error {
  readonly code = "PERMISSION_DENIED";

  constructor(message = "Read-only account — this action requires admin access.") {
    super(message);
    this.name = "ActionPermissionError";
  }
}

/**
 * Throw `ActionPermissionError` unless the current user is an admin. Call at
 * the top of every mutating server action. RLS is the authoritative gate;
 * this is the UX layer that turns "RLS denied" into a friendly message.
 */
export async function assertAdmin(): Promise<void> {
  const role = await getCurrentUserRole();
  if (role !== "admin") throw new ActionPermissionError();
}

/**
 * Drop-in guard for `ActionResult`-returning server actions:
 *
 *   const denied = await adminGuard();
 *   if (denied) return denied;
 *
 * Cheaper than wrapping every action body in try/catch when the only error
 * we want to flatten into an ActionResult is the permission denial. Other
 * errors (Supabase failures, RLS denials surfacing as Postgrest errors, etc)
 * keep their existing per-action handling.
 */
export async function adminGuard(): Promise<ActionResult | null> {
  try {
    await assertAdmin();
    return null;
  } catch (err) {
    if (err instanceof ActionPermissionError) return { ok: false, message: err.message };
    throw err;
  }
}
