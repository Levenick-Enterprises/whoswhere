"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { personInputSchema } from "@/lib/schemas/person";
import { createAdminClient } from "@/lib/supabase/admin";

function parseFormData(formData: FormData) {
  return personInputSchema.parse({
    name: formData.get("name") ?? "",
    phone: formData.get("phone") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createPersonAction(formData: FormData) {
  const input = parseFormData(formData);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("people").insert(input).select("id").single();

  if (error) {
    throw new Error(`createPerson failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/people");
  redirect(`/people/${data.id}`);
}

export async function updatePersonAction(id: string, formData: FormData) {
  const input = parseFormData(formData);
  const supabase = createAdminClient();
  const { error } = await supabase.from("people").update(input).eq("id", id);

  if (error) {
    throw new Error(`updatePerson failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  redirect("/people");
}

export async function deletePersonAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("people")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`deletePerson failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/people");
  revalidatePath("/jobsites");
  revalidatePath("/trash");
  redirect("/people");
}

export async function restorePersonAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("people").update({ archived_at: null }).eq("id", id);

  if (error) {
    throw new Error(`restorePerson failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/people");
  revalidatePath("/trash");
}

/**
 * Sets a person's current_jobsite_id. Passing null unassigns them.
 * Used from both pickers: /people/[id]/assign and /jobsites/[id]/assign.
 * `redirectTo` is the path to return to after the write completes.
 */
export async function assignPersonAction(
  personId: string,
  jobsiteId: string | null,
  redirectTo: string,
) {
  const supabase = createAdminClient();
  const { data: previous, error: fetchError } = await supabase
    .from("people")
    .select("current_jobsite_id")
    .eq("id", personId)
    .is("archived_at", null)
    .maybeSingle();

  if (fetchError) {
    throw new Error(`assignPerson lookup failed: ${JSON.stringify(fetchError)}`);
  }
  if (!previous) {
    // The person was deleted (or never existed) between the picker render
    // and the form submit. Don't silently no-op the write.
    notFound();
  }

  const { error } = await supabase
    .from("people")
    .update({ current_jobsite_id: jobsiteId })
    .eq("id", personId);

  if (error) {
    throw new Error(`assignPerson failed: ${JSON.stringify(error)}`);
  }

  // Refresh anything that may render this assignment.
  revalidatePath("/people");
  revalidatePath("/jobsites");
  revalidatePath(`/people/${personId}`);
  if (jobsiteId) revalidatePath(`/jobsites/${jobsiteId}`);
  if (previous.current_jobsite_id && previous.current_jobsite_id !== jobsiteId) {
    revalidatePath(`/jobsites/${previous.current_jobsite_id}`);
  }

  redirect(redirectTo);
}
