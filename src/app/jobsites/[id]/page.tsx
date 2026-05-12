import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/DeleteButton";
import { FormField, inputClass } from "@/components/FormField";
import { createAdminClient } from "@/lib/supabase/admin";

import { deleteJobsiteAction, updateJobsiteAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditJobsitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: jobsite, error } = await supabase
    .from("jobsites")
    .select("id, name, address, notes, archived_at, people(id, name, phone)")
    .eq("id", id)
    .is("archived_at", null)
    .is("people.archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(`fetch jobsite failed: ${JSON.stringify(error)}`);
  }
  if (!jobsite) notFound();

  const crew = jobsite.people.slice().sort((a, b) => a.name.localeCompare(b.name));

  const updateWithId = updateJobsiteAction.bind(null, jobsite.id);
  const deleteWithId = deleteJobsiteAction.bind(null, jobsite.id);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{jobsite.name}</h1>
        <Link href="/jobsites" className="text-sm text-zinc-500 hover:text-zinc-700">
          Back
        </Link>
      </header>

      <Link
        href={`/jobsites/${jobsite.id}/assign`}
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            Crew ({crew.length})
          </span>
          <span className="text-xs text-zinc-500">
            {crew.length === 0 ? "Add crew" : "Manage"} →
          </span>
        </div>
        {crew.length === 0 ? (
          <span className="text-sm text-zinc-500">No one assigned here yet.</span>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {crew.map((person) => (
              <li
                key={person.id}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
              >
                {person.name}
              </li>
            ))}
          </ul>
        )}
      </Link>

      <form action={updateWithId} className="flex flex-col gap-4">
        <FormField label="Name">
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            defaultValue={jobsite.name}
            className={inputClass}
          />
        </FormField>

        <FormField label="Address">
          <input
            type="text"
            name="address"
            maxLength={500}
            defaultValue={jobsite.address ?? ""}
            className={inputClass}
          />
        </FormField>

        <FormField label="Notes">
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            defaultValue={jobsite.notes ?? ""}
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
          confirmMessage={`Delete ${jobsite.name}? You can restore from Trash.`}
        />
      </div>
    </section>
  );
}
