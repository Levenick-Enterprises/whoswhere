import Link from "next/link";
import { notFound } from "next/navigation";

import { PersonEditForm } from "@/components/PersonEditForm";
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
        <span className="shrink-0 rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {currentJobsite ? "Change" : "Assign"} →
        </span>
      </Link>

      <PersonEditForm
        person={{
          id: person.id,
          name: person.name,
          phone: person.phone,
          notes: person.notes,
        }}
        updateAction={updateWithId}
        deleteAction={deleteWithId}
      />
    </section>
  );
}
