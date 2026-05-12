import Link from "next/link";
import { notFound } from "next/navigation";

import { reassignPersonAction } from "@/app/people/actions";
import { AssignButton } from "@/components/AssignButton";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AssignPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = await params;
  const supabase = createAdminClient();

  const [{ data: person, error: pErr }, { data: jobsites, error: jErr }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, current_jobsite_id, current_jobsite:current_jobsite_id (archived_at)")
      .eq("id", personId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("jobsites")
      .select("id, name, address")
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (pErr || jErr) {
    throw new Error(`fetch failed: ${JSON.stringify(pErr ?? jErr)}`);
  }
  if (!person) notFound();

  // A current_jobsite_id pointing at an archived jobsite is treated the same
  // as unassigned everywhere else in the app — match that here so the picker
  // doesn't show an "Unassign" affordance for a non-existent assignment.
  const isAssignedToActiveJobsite =
    person.current_jobsite_id !== null &&
    person.current_jobsite !== null &&
    !person.current_jobsite.archived_at;

  const backTo = `/people/${person.id}`;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">Assign {person.name}</h1>
        <Link href={backTo} className="text-sm text-zinc-500 hover:text-zinc-700">
          Done
        </Link>
      </header>

      {isAssignedToActiveJobsite && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <span className="text-sm text-zinc-500">Pull them off this jobsite entirely</span>
          <AssignButton
            action={reassignPersonAction.bind(null, person.id, null)}
            label="Unassign"
            variant="secondary"
          />
        </div>
      )}

      {jobsites.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No active jobsites to assign to. Create one first.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {jobsites.map((jobsite) => {
            const isCurrent = isAssignedToActiveJobsite && person.current_jobsite_id === jobsite.id;
            return (
              <li
                key={jobsite.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{jobsite.name}</span>
                  {jobsite.address && (
                    <span className="truncate text-xs text-zinc-500">{jobsite.address}</span>
                  )}
                </div>
                {isCurrent ? (
                  <Link
                    href={`/jobsites/${jobsite.id}`}
                    className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Currently here →
                  </Link>
                ) : (
                  <AssignButton
                    action={reassignPersonAction.bind(null, person.id, jobsite.id)}
                    label="Move here"
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
