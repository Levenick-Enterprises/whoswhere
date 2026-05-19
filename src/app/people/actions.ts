"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import {
  buildProjectLookup,
  normalizeProjectName,
  type ProjectHit,
} from "@/lib/csv-import-mappings";
import { importPersonRowSchema, personInputSchema, type PersonInput } from "@/lib/schemas/person";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { uniqueViolationMessage } from "@/lib/uniqueViolation";

function parseFormData(formData: FormData) {
  return personInputSchema.safeParse({
    name: formData.get("name") ?? "",
    employee_number: formData.get("employee_number") ?? "",
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
    const friendly = uniqueViolationMessage(error);
    return { ok: false, message: friendly ?? "Couldn't create. Please try again." };
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
    const friendly = uniqueViolationMessage(error);
    return { ok: false, message: friendly ?? "Couldn't save. Please try again." };
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
  revalidatePath("/projects");
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
 * Direct-call shape used by the DnD board in `ProjectsList`. Sets a person's
 * current_project_id (or null to unassign). Validates that the person exists
 * and is active, AND that the target project (if any) is also active —
 * otherwise the assignment would silently land them on an archived row that
 * the UI filters out.
 */
export async function reassignPerson(
  personId: string,
  projectId: string | null,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();

  const { data: person, error: fetchError } = await supabase
    .from("people")
    .select("current_project_id")
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

  if (projectId !== null) {
    const { data: project, error: projectFetchError } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .is("archived_at", null)
      .maybeSingle();

    if (projectFetchError) {
      console.error("[reassignPerson] project lookup:", projectFetchError);
      return { ok: false, message: "Couldn't verify the target project. Please try again." };
    }
    if (!project) {
      return { ok: false, message: "That project is archived or no longer exists." };
    }
  }

  const { error } = await supabase
    .from("people")
    .update({ current_project_id: projectId })
    .eq("id", personId);

  if (error) {
    console.error("[reassignPerson] update:", error);
    return { ok: false, message: "Couldn't reassign. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/projects");
  revalidatePath(`/people/${personId}`);
  if (projectId) revalidatePath(`/projects/${projectId}`);
  if (person.current_project_id && person.current_project_id !== projectId) {
    revalidatePath(`/projects/${person.current_project_id}`);
  }

  return { ok: true, value: undefined };
}

/**
 * Form-shape entry used by AssignButton's submit form. Pulls personId and
 * projectId out of the formData hidden inputs and delegates to reassignPerson.
 */
export async function reassignPersonAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const personId = String(formData.get("personId") ?? "");
  const raw = formData.get("projectId");
  const projectId = raw === "" || raw == null ? null : String(raw);
  return reassignPerson(personId, projectId);
}

// Safety cap on bulk-import row count. Mirrors BULK_IMPORT_MAX_ROWS in
// src/app/projects/actions.ts. If we ever extract to a shared constants
// module, do it for both at once.
const BULK_IMPORT_MAX_ROWS = 500;

/**
 * Inserts an array of people rows from the CSV-import UI. Client posts a
 * JSON-stringified array via the hidden `rows` form field; each row is
 * `{ name, position, phone, notes, project_name? }` where the optional
 * `project_name` is the raw value the operator typed/mapped from the CSV
 * `Project` column. The server is the canonical resolver — it builds a
 * fresh name→ID lookup from active projects and matches at insert time —
 * so a project rename mid-session can't desync a stale snapshot. Same
 * normalization (NFKC + lowercase + trim) on both client preview and
 * server resolution via the shared csv-import-mappings helpers.
 *
 * Resolution outcomes (matching the client preview's semantics):
 *   - single match  → row gets current_project_id assigned
 *   - ambiguous     → leave unassigned (don't pick one of N collisions)
 *   - no match      → leave unassigned (typo, archived, blank, etc.)
 *
 * Ambiguous + no-match are silent skips at this layer because the client
 * preview already showed the operator each row's outcome. Schema-failing
 * rows DO error and reject the whole import (all-or-nothing on bad shape).
 * Runs under `authed_insert_people` RLS (no policy change).
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

  // Client posts the raw `project_name` (typed CSV value) rather than a
  // pre-resolved ID — that way the server is the canonical resolver and a
  // project rename mid-session can't desync a stale snapshot. Only fetch
  // the active-projects table if at least one row is actually trying to
  // assign one (saves a query, and an all-unassigned import shouldn't
  // depend on whether projects is readable right now).
  const anyAssignment = rawRows.some(
    (r): r is { project_name: string } =>
      r !== null &&
      typeof r === "object" &&
      "project_name" in r &&
      typeof (r as { project_name: unknown }).project_name === "string",
  );

  let projectLookup: Map<string, ProjectHit> | null = null;
  if (anyAssignment) {
    const { data: activeProjects, error: projectsError } = await supabase
      .from("projects")
      .select("id, name")
      .is("archived_at", null);
    if (projectsError) {
      console.error("[bulkCreatePeople] project fetch:", projectsError);
      return { ok: false, message: "Couldn't verify projects. Please try again." };
    }
    projectLookup = buildProjectLookup(activeProjects);
  }

  type InsertRow = PersonInput & { current_project_id?: string };
  const insertRows: InsertRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    // Validate the WHOLE row, including the optional project_name. Using
    // importPersonRowSchema (not personInputSchema) means project_name is
    // trimmed + length-capped before we touch it for lookup — defends
    // against a crafted payload pushing a multi-megabyte string through
    // the normalize + Map.get path.
    const parsed = importPersonRowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid value";
      return { ok: false, message: `Row ${i + 1}: ${message}` };
    }

    const { project_name, ...personFields } = parsed.data;
    const row: InsertRow = personFields;
    if (project_name) {
      // Non-null assertion is safe: anyAssignment was true (since we found
      // project_name on at least this row), so the lookup was built.
      const hit = projectLookup!.get(normalizeProjectName(project_name));
      if (hit?.kind === "single") {
        row.current_project_id = hit.id;
      }
      // Ambiguous OR no-match → leave unassigned. The client preview
      // already warned the operator; no need to error here. Silent skip
      // matches the documented "best effort" assignment semantics.
    }
    insertRows.push(row);
  }

  const { error } = await supabase.from("people").insert(insertRows).select("id");
  if (error) {
    console.error("[bulkCreatePeople] supabase:", error);
    const friendly = uniqueViolationMessage(error);
    if (friendly) {
      return {
        ok: false,
        message: `${friendly} Check your CSV for duplicate values and try again.`,
      };
    }
    return { ok: false, message: "Couldn't import. Please try again." };
  }

  revalidatePath("/people");
  revalidatePath("/projects");
  // Each project that received imported crew also needs its detail page
  // revalidated — that route renders crew from `people` directly. Mirror
  // what reassignPerson does for single-row reassignments.
  const touchedProjectIds = new Set(
    insertRows.map((r) => r.current_project_id).filter((id): id is string => Boolean(id)),
  );
  for (const id of touchedProjectIds) {
    revalidatePath(`/projects/${id}`);
  }
  redirect("/people");
}
