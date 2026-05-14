"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { type ActionResult } from "@/lib/action-result";
import { jobsiteInputSchema } from "@/lib/schemas/jobsite";
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
