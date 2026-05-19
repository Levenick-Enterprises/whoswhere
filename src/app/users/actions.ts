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
  const denied = await adminGuard();
  if (denied) return denied;

  const me = await getCurrentUser();
  if (me?.email === email) {
    // Server-side mirror of the UI disable. Defense in depth — a devtools
    // re-enable + submit lands here, not the DB.
    return { ok: false, message: "You can't change your own role." };
  }

  const parsedRole = appUserRoleSchema.safeParse(formData.get("role"));
  if (!parsedRole.success) return { ok: false, message: "Invalid role." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("app_users")
    .update({ role: parsedRole.data })
    .eq("email", email);
  if (error) {
    console.error("[updateAppUserRole] supabase:", error);
    return { ok: false, message: "Couldn't update role. Please try again." };
  }
  revalidatePath("/users");
  return { ok: true, value: undefined };
}

export async function deleteAppUserAction(
  email: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const denied = await adminGuard();
  if (denied) return denied;

  const me = await getCurrentUser();
  if (me?.email === email) {
    return { ok: false, message: "You can't remove yourself." };
  }

  // Delete the auth.users row before the allowlist row. deleteUser cascades
  // to refresh_tokens + sessions, so the removed user is effectively signed
  // out globally on their next request (vs waiting up to 30 days for the
  // refresh token to expire). Also cleans up the auth.users row — re-adding
  // the email later creates a fresh row via signInWithOtp + shouldCreateUser.
  //
  // deleteUser needs a userId; look it up by email via listUsers (paginates
  // 50/page — fine at <100 users/tenant; swap to a direct
  // `select id from auth.users where email = ?` if a tenant ever passes ~1000).
  // If listUsers or deleteUser fails, log + continue: RLS still blocks future
  // writes once the app_users row is gone, and the operator can manually
  // delete the auth user via the Supabase dashboard.
  const admin = createAdminClient();
  const {
    data: { users },
    error: listError,
  } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("[deleteAppUser] listUsers:", listError);
    return { ok: false, message: "Couldn't look up sessions. Try again." };
  }
  const authUser = users.find((u) => u.email === email);
  if (authUser) {
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(authUser.id);
    if (deleteAuthError) console.error("[deleteAppUser] deleteUser:", deleteAuthError);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("app_users").delete().eq("email", email);
  if (error) {
    console.error("[deleteAppUser] supabase:", error);
    return { ok: false, message: "Couldn't remove user. Please try again." };
  }
  revalidatePath("/users");
  revalidatePath("/more");
  return { ok: true, value: undefined };
}
