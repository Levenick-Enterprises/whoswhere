import "server-only";

import type { ActionResult } from "@/lib/action-result";
import { normalizeEmail } from "@/lib/normalizeEmail";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "audit";

/**
 * Resolve the current request's user role. Returns `null` when the request
 * is unauthenticated (shouldn't happen on app routes — middleware redirects
 * to /sign-in first — but defensively still null-safe) or when the signed-in
 * user has no `app_users` row (e.g. an admin removed them while their session
 * was still valid).
 *
 * A null role gates *writes* — `assertAdmin()` throws ActionPermissionError,
 * and the admin-only RLS policies on projects/people reject INSERTs/UPDATEs.
 * Reads stay open: SELECT RLS on those tables is permissive for any
 * authenticated user, and middleware only checks that a Supabase session
 * exists (it doesn't consult app_users). So a removed user keeps their
 * read access until they sign out or the session expires. Explicit session
 * revocation on user removal is a Phase 2 follow-up.
 *
 * Cheap to call repeatedly within a request: middleware already loaded the
 * session, and `auth.getUser()` short-circuits to the cached value.
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  // Normalize to stay in lockstep with the app_users PK convention — Supabase
  // typically stores emails lowercased, but routing through normalizeEmail()
  // makes the lookup case + Unicode invariant regardless.
  const { data, error } = await supabase
    .from("app_users")
    .select("role")
    .eq("email", normalizeEmail(user.email))
    .maybeSingle();
  if (error) {
    // Don't fail open — return null so the caller treats the user as
    // role-less (which means "no admin write access" everywhere). Log so
    // a misconfigured GRANT / RLS surfaces in Vercel function logs instead
    // of silently turning every user into read-only.
    console.error("[auth] app_users lookup failed:", error);
    return null;
  }
  if (data?.role === "admin" || data?.role === "audit") return data.role;
  return null;
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
