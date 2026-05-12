"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { jobsiteInputSchema } from "@/lib/schemas/jobsite";
import { createAdminClient } from "@/lib/supabase/admin";

function parseFormData(formData: FormData) {
  return jobsiteInputSchema.parse({
    name: formData.get("name") ?? "",
    address: formData.get("address") ?? "",
    notes: formData.get("notes") ?? "",
  });
}

export async function createJobsiteAction(formData: FormData) {
  const input = parseFormData(formData);
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("jobsites").insert(input).select("id").single();

  if (error) {
    throw new Error(`createJobsite failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/jobsites");
  redirect(`/jobsites/${data.id}`);
}

export async function updateJobsiteAction(id: string, formData: FormData) {
  const input = parseFormData(formData);
  const supabase = createAdminClient();
  const { error } = await supabase.from("jobsites").update(input).eq("id", id);

  if (error) {
    throw new Error(`updateJobsite failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/jobsites");
  revalidatePath(`/jobsites/${id}`);
  redirect("/jobsites");
}

export async function deleteJobsiteAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("jobsites")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`deleteJobsite failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/jobsites");
  revalidatePath("/people");
  revalidatePath("/trash");
  redirect("/jobsites");
}

export async function restoreJobsiteAction(id: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("jobsites").update({ archived_at: null }).eq("id", id);

  if (error) {
    throw new Error(`restoreJobsite failed: ${JSON.stringify(error)}`);
  }

  revalidatePath("/jobsites");
  revalidatePath("/trash");
}
