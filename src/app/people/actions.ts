"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { personInputSchema, type PersonInput } from "@/lib/schemas/person";
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

// Safety cap on bulk-import row count. Mirrors BULK_IMPORT_MAX_ROWS in
// src/app/jobsites/actions.ts. If we ever extract to a shared constants
// module, do it for both at once.
const BULK_IMPORT_MAX_ROWS = 500;

/**
 * Inserts an array of people rows from the CSV-import UI. Client posts a
 * JSON-stringified array via the hidden `rows` form field; each row is
 * `{ name, position, phone, notes, current_jobsite_id? }` where the optional
 * `current_jobsite_id` has already been resolved client-side from the
 * mapped `Jobsite` column (name → ID lookup against active jobsites).
 *
 * Defense in depth on assignment: we re-fetch the set of active jobsite
 * IDs server-side and reject any row whose `current_jobsite_id` doesn't
 * appear in that set. This stops a crafted POST from landing a person on
 * an archived or non-existent jobsite (RLS via FK would catch it too,
 * but a clean per-row error beats a Postgres FK violation).
 *
 * All-or-nothing: any row failing schema OR ID validation rejects the
 * whole import. Runs under `authed_insert_people` RLS (no policy change).
 */
export async function bulkCreatePeopleAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const raw = String(formData.get("rows") ?? "");
  let rawRows: unknown;
  try {
    rawRows = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Couldn't read the import data. Please try again." };
  }
  if (!Array.isArray(rawRows)) {
    return { ok: false, message: "Couldn't read the import data. Please try again." };
  }
  if (rawRows.length === 0) {
    return { ok: false, message: "No rows to import." };
  }
  if (rawRows.length > BULK_IMPORT_MAX_ROWS) {
    return {
      ok: false,
      message: `Too many rows (${rawRows.length}). Limit is ${BULK_IMPORT_MAX_ROWS} per import — split the file and try again.`,
    };
  }

  const supabase = await createSupabaseServerClient();

  // Build the active-jobsite-ID set once for ID validation. If the fetch
  // fails, fail closed: reject any row that tried to assign a jobsite,
  // since we can't verify the target is active.
  const { data: activeJobsites, error: jobsitesError } = await supabase
    .from("jobsites")
    .select("id")
    .is("archived_at", null);
  if (jobsitesError) {
    console.error("[bulkCreatePeople] jobsite fetch:", jobsitesError);
    return { ok: false, message: "Couldn't verify jobsites. Please try again." };
  }
  const activeJobsiteIds = new Set(activeJobsites.map((j) => j.id));

  type InsertRow = PersonInput & { current_jobsite_id?: string };
  const insertRows: InsertRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] as { current_jobsite_id?: unknown } | null;
    const parsed = personInputSchema.safeParse(raw);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid value";
      return { ok: false, message: `Row ${i + 1}: ${message}` };
    }

    const row: InsertRow = parsed.data;
    const candidateId =
      raw && typeof raw.current_jobsite_id === "string" ? raw.current_jobsite_id : undefined;
    if (candidateId) {
      if (!activeJobsiteIds.has(candidateId)) {
        return {
          ok: false,
          message: `Row ${i + 1}: jobsite no longer exists or has been archived.`,
        };
      }
      row.current_jobsite_id = candidateId;
    }
    insertRows.push(row);
  }

  const { error } = await supabase.from("people").insert(insertRows).select("id");
  if (error) {
    console.error("[bulkCreatePeople] supabase:", error);
    return { ok: false, message: "Couldn't import. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/jobsites");
  redirect("/people");
}
