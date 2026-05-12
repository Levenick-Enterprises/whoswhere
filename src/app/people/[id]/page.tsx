import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/DeleteButton";
import { FormField, inputClass } from "@/components/FormField";
import { createAdminClient } from "@/lib/supabase/admin";

import { deletePersonAction, updatePersonAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: person, error } = await supabase
    .from("people")
    .select(
      "id, name, phone, notes, archived_at, current_jobsite:current_jobsite_id (id, name, archived_at)",
    )
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`fetch person failed: ${JSON.stringify(error)}`);
  }
  if (!person) notFound();

  // Hide the assignment when the referenced jobsite is itself in Trash.
  const currentJobsite =
    person.current_jobsite && !person.current_jobsite.archived_at
      ? { id: person.current_jobsite.id, name: person.current_jobsite.name }
      : null;

  const updateWithId = updatePersonAction.bind(null, person.id);
  const deleteWithId = deletePersonAction.bind(null, person.id);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{person.name}</h1>
        <Link href="/people" className="text-sm text-zinc-500 hover:text-zinc-700">
          Back
        </Link>
      </header>

      <Link
        href={`/people/${person.id}/assign`}
        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-zinc-500">Current jobsite</span>
          <span className="truncate font-medium">{currentJobsite?.name ?? "Unassigned"}</span>
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {currentJobsite ? "Change" : "Assign"} →
        </span>
      </Link>

      <form action={updateWithId} className="flex flex-col gap-4">
        <FormField label="Name">
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            defaultValue={person.name}
            className={inputClass}
          />
        </FormField>

        <FormField label="Phone">
          <input
            type="tel"
            name="phone"
            maxLength={50}
            defaultValue={person.phone ?? ""}
            className={inputClass}
          />
        </FormField>

        <FormField label="Notes">
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={person.notes ?? ""}
            className={inputClass}
          />
        </FormField>

        <button
          type="submit"
          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Save
        </button>
      </form>

      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <DeleteButton
          action={deleteWithId}
          confirmMessage={`Delete ${person.name}? You can restore from Trash.`}
        />
      </div>
    </section>
  );
}
