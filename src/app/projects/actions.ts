"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { projectInputSchema, type ProjectInput } from "@/lib/schemas/project";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return projectInputSchema.safeParse({
    name: formData.get("name") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createProjectAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("projects").insert(parsed.data).select("id").single();

  if (error) {
    console.error("[createProject] supabase:", error);
    return { ok: false, message: "Couldn't create project. Please try again." };
  }

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update(parsed.data).eq("id", id);

  if (error) {
    console.error("[updateProject] supabase:", error);
    return { ok: false, message: "Couldn't save. Please try again." };
  }

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
  redirect(`/projects/${id}`);
}

export async function deleteProjectAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("projects")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteProject] supabase:", error);
    return { ok: false, message: "Couldn't delete. Please try again." };
  }

  revalidatePath("/projects");
  revalidatePath("/people");
  revalidatePath("/trash");
  redirect("/projects");
}

export async function restoreProjectAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").update({ archived_at: null }).eq("id", id);

  if (error) {
    console.error("[restoreProject] supabase:", error);
    return { ok: false, message: "Couldn't restore. Please try again." };
  }

  revalidatePath("/projects");
  revalidatePath("/trash");
  return { ok: true, value: undefined };
}

// Safety cap on bulk-import row count. Beyond this, encourage the operator
// to split the file — single bulk inserts past a few hundred rows start
// straining the realtime broadcast and the validation-error UX.
const BULK_IMPORT_MAX_ROWS = 500;

/**
 * Inserts an array of project rows from the CSV-import UI. Client posts a
 * JSON-stringified array via the hidden `rows` form field; we re-validate
 * each row server-side with the same `projectInputSchema` the single-create
 * action uses (defense in depth — never trust the client did the right
 * normalization). All-or-nothing: any row failing validation rejects the
 * whole import with a row-keyed message, so the operator sees exactly
 * which row to fix in their CSV.
 *
 * Runs under the existing `authed_insert_projects` RLS policy (single
 * statement, multiple values) — no policy change required.
 */
export async function bulkCreateProjectsAction(
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

  const parsedRows: ProjectInput[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const result = projectInputSchema.safeParse(rawRows[i]);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid value";
      return { ok: false, message: `Row ${i + 1}: ${message}` };
    }
    parsedRows.push(result.data);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("projects").insert(parsedRows).select("id");

  if (error) {
    console.error("[bulkCreateProjects] supabase:", error);
    return { ok: false, message: "Couldn't import. Please try again." };
  }

  revalidatePath("/projects");
  redirect("/projects");
}
