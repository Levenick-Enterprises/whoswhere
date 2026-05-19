"use server";

import { revalidatePath } from "next/cache";

import { type ActionResult } from "@/lib/action-result";
import { adminGuard, getCurrentUser } from "@/lib/auth";
import { appUserInputSchema, appUserRoleSchema } from "@/lib/schemas/appUser";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uniqueViolationMessage } from "@/lib/uniqueViolation";

export async function addAppUserAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;

  const parsed = appUserInputSchema.safeParse({
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("app_users").insert(parsed.data);
  if (error) {
    console.error("[addAppUser] supabase:", error);
    const friendly = uniqueViolationMessage(error);
    return { ok: false, message: friendly ?? "Couldn't add user. Please try again." };
  }
  revalidatePath("/users");
  revalidatePath("/more");
  return { ok: true, value: undefined };
}

export async function updateAppUserRoleAction(
  email: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  // Combine the admin gate + self-protection into a single getCurrentUser
  // call. The free-standing adminGuard() would do its own lookup, and we'd
  // immediately re-query for the caller's email — wasted round-trip.
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return { ok: false, message: "Read-only account — this action requires admin access." };
  }
  if (me.email === email) {
    // Server-side mirror of the UI disable. Defense in depth — a devtools
    // re-enable + submit lands here, not the DB.
    return { ok: false, message: "You can't change your own role." };
  }

  const parsedRole = appUserRoleSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { ok: false, message: "Invalid role." };

  // `.select()` chained on the update returns the affected rows. With no
  // returning data we can't distinguish "row updated" from "filter matched
  // nothing" (Supabase returns no error on a 0-row update). Catching the
  // 0-row case matters when an admin races a remove against another tab's
  // role change — both end up with no-op'd updates instead of silent OKs.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .update({ role: parsedRole.data })
    .eq("email", email)
    .select("email");
  if (error) {
    console.error("[updateAppUserRole] supabase:", error);
    return { ok: false, message: "Couldn't update role. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "User not found — they may have been removed already." };
  }
  revalidatePath("/users");
  return { ok: true, value: undefined };
}

export async function deleteAppUserAction(
  email: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  // See updateAppUserRoleAction — single getCurrentUser call gates admin
  // access AND backs the self-protection check.
  const me = await getCurrentUser();
  if (me?.role !== "admin") {
    return { ok: false, message: "Read-only account — this action requires admin access." };
  }
  if (me.email === email) {
    return { ok: false, message: "You can't remove yourself." };
  }

  // Delete the auth.users row before the allowlist row. deleteUser cascades
  // to refresh_tokens + sessions, so the removed user is effectively signed
  // out globally on their next request (vs waiting up to 30 days for the
  // refresh token to expire). Also cleans up the auth.users row — re-adding
  // the email later creates a fresh row via signInWithOtp + shouldCreateUser.
  //
  // deleteUser needs a userId; look it up by email via listUsers. perPage:1000
  // is the API max — comfortably above realistic per-tenant counts; swap to
  // direct SQL (`select id from auth.users where email = ? limit 1`) if a
  // tenant ever crosses that. Failures here (listUsers errors, target user
  // not on the first 1000 rows, deleteUser errors) are log + continue: RLS
  // still blocks future writes once the app_users row is gone, and the
  // operator can manually clean up the auth user via the Supabase dashboard.
  const admin = createAdminClient();
  const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (listError) {
    console.error("[deleteAppUser] listUsers:", listError);
  } else {
    const authUser = list.users.find((u) => u.email === email);
    if (authUser) {
      const { error: deleteAuthError } = await admin.auth.admin.deleteUser(authUser.id);
      if (deleteAuthError) console.error("[deleteAppUser] deleteUser:", deleteAuthError);
    }
  }

  // Same 0-row guard as updateAppUserRoleAction — a concurrent remove from
  // another tab would otherwise look successful here.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .delete()
    .eq("email", email)
    .select("email");
  if (error) {
    console.error("[deleteAppUser] supabase:", error);
    return { ok: false, message: "Couldn't remove user. Please try again." };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "User not found — they may have been removed already." };
  }
  revalidatePath("/users");
  revalidatePath("/more");
  return { ok: true, value: undefined };
}
