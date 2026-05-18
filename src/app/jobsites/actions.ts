"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { jobsiteInputSchema, type JobsiteInput } from "@/lib/schemas/jobsite";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function parseFormData(formData: FormData) {
  return jobsiteInputSchema.safeParse({
    name: formData.get("name") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createJobsiteAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("jobsites").insert(parsed.data).select("id").single();

  if (error) {
    console.error("[createJobsite] supabase:", error);
    return { ok: false, message: "Couldn't create jobsite. Please try again." };
  }

  revalidatePath("/jobsites");
  redirect(`/jobsites/${data.id}`);
}

export async function updateJobsiteAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("jobsites").update(parsed.data).eq("id", id);

  if (error) {
    console.error("[updateJobsite] supabase:", error);
    return { ok: false, message: "Couldn't save. Please try again." };
  }

  revalidatePath("/jobsites");
  revalidatePath(`/jobsites/${id}`);
  redirect(`/jobsites/${id}`);
}

export async function deleteJobsiteAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("jobsites")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("[deleteJobsite] supabase:", error);
    return { ok: false, message: "Couldn't delete. Please try again." };
  }

  revalidatePath("/jobsites");
  revalidatePath("/people");
  revalidatePath("/trash");
  redirect("/jobsites");
}

export async function restoreJobsiteAction(
  id: string,
  _prev: ActionResult,
  _formData: FormData,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("jobsites").update({ archived_at: null }).eq("id", id);

  if (error) {
    console.error("[restoreJobsite] supabase:", error);
    return { ok: false, message: "Couldn't restore. Please try again." };
  }

  revalidatePath("/jobsites");
  revalidatePath("/trash");
  return { ok: true, value: undefined };
}

// Safety cap on bulk-import row count. Beyond this, encourage the operator
// to split the file — single bulk inserts past a few hundred rows start
// straining the realtime broadcast and the validation-error UX.
const BULK_IMPORT_MAX_ROWS = 500;

/**
 * Inserts an array of jobsite rows from the CSV-import UI. Client posts a
 * JSON-stringified array via the hidden `rows` form field; we re-validate
 * each row server-side with the same `jobsiteInputSchema` the single-create
 * action uses (defense in depth — never trust the client did the right
 * normalization). All-or-nothing: any row failing validation rejects the
 * whole import with a row-keyed message, so the operator sees exactly
 * which row to fix in their CSV.
 *
 * Runs under the existing `authed_insert_jobsites` RLS policy (single
 * statement, multiple values) — no policy change required.
 */
export async function bulkCreateJobsitesAction(
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

  const parsedRows: JobsiteInput[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const result = jobsiteInputSchema.safeParse(rawRows[i]);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid value";
      return { ok: false, message: `Row ${i + 1}: ${message}` };
    }
    parsedRows.push(result.data);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("jobsites").insert(parsedRows).select("id");

  if (error) {
    console.error("[bulkCreateJobsites] supabase:", error);
    return { ok: false, message: "Couldn't import. Please try again." };
  }

  revalidatePath("/jobsites");
  redirect("/jobsites");
}
