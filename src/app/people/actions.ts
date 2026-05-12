"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
