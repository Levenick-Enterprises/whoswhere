"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { personInputSchema } from "@/lib/schemas/person";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return personInputSchema.safeParse({
    name: formData.get("name") ?? "",
    position: formData.get("position") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createPersonAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("people").insert(parsed.data).select("id").single();

  if (error) {
    console.error("[createPerson] supabase:", error);
    return { ok: false, message: "Couldn't create. Please try again." };
  }

  revalidatePath("/people");
  redirect(`/people/${data.id}`);
}

export async function updatePersonAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people").update(parsed.data).eq("id", id);

  if (error) {
    console.error("[updatePerson] supabase:", error);
    return { ok: false, message: "Couldn't save. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  redirect(`/people/${id}`);
}

export async function deletePersonAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deletePerson] supabase:", error);
    return { ok: false, message: "Couldn't delete. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/jobsites");
  revalidatePath("/trash");
  redirect("/people");
}

export async function restorePersonAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("people").update({ archived_at: null }).eq("id", id);

  if (error) {
    console.error("[restorePerson] supabase:", error);
    return { ok: false, message: "Couldn't restore. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/trash");
  return { ok: true, value: undefined };
}

/**
 * Direct-call shape used by the DnD board in `JobsitesList`. Sets a person's
 * current_jobsite_id (or null to unassign). Validates that the person exists
 * and is active, AND that the target jobsite (if any) is also active —
 * otherwise the assignment would silently land them on an archived row that
 * the UI filters out.
 */
export async function reassignPerson(
  personId: string,
  jobsiteId: string | null,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: person, error: fetchError } = await supabase
    .from("people")
    .select("current_jobsite_id")
    .eq("id", personId)
    .is("archived_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("[reassignPerson] person lookup:", fetchError);
    return { ok: false, message: "Couldn't look up that person. Please try again." };
  }
  if (!person) {
    return { ok: false, message: "Person not found." };
  }

  if (jobsiteId !== null) {
    const { data: jobsite, error: jobsiteFetchError } = await supabase
      .from("jobsites")
      .select("id")
      .eq("id", jobsiteId)
      .is("archived_at", null)
      .maybeSingle();

    if (jobsiteFetchError) {
      console.error("[reassignPerson] jobsite lookup:", jobsiteFetchError);
      return { ok: false, message: "Couldn't verify the target jobsite. Please try again." };
    }
    if (!jobsite) {
      return { ok: false, message: "That jobsite is archived or no longer exists." };
    }
  }

  const { error } = await supabase
    .from("people")
    .update({ current_jobsite_id: jobsiteId })
    .eq("id", personId);

  if (error) {
    console.error("[reassignPerson] update:", error);
    return { ok: false, message: "Couldn't reassign. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/jobsites");
  revalidatePath(`/people/${personId}`);
  if (jobsiteId) revalidatePath(`/jobsites/${jobsiteId}`);
  if (person.current_jobsite_id && person.current_jobsite_id !== jobsiteId) {
    revalidatePath(`/jobsites/${person.current_jobsite_id}`);
  }

  return { ok: true, value: undefined };
}

/**
 * Form-shape entry used by AssignButton's submit form. Pulls personId and
 * jobsiteId out of the formData hidden inputs and delegates to reassignPerson.
 */
export async function reassignPersonAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const personId = String(formData.get("personId") ?? "");
  const raw = formData.get("jobsiteId");
  const jobsiteId = raw === "" || raw == null ? null : String(raw);
  return reassignPerson(personId, jobsiteId);
}
