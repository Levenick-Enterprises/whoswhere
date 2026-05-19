import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { reassignPersonAction } from "@/app/people/actions";
import { AssignButton } from "@/components/AssignButton";
import { getCurrentUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AssignPersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: personId } = await params;
  if ((await getCurrentUserRole()) !== "admin") redirect(`/people/${personId}`);

  const supabase = await createSupabaseServerClient();

  const [{ data: person, error: pErr }, { data: projects, error: projErr }] = await Promise.all([
    supabase
      .from("people")
      .select("id, name, current_project_id, current_project:current_project_id (archived_at)")
      .eq("id", personId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("projects")
      .select("id, name, address")
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (pErr || projErr) {
    throw new Error(`fetch failed: ${JSON.stringify(pErr ?? projErr)}`);
  }
  if (!person) notFound();

  // A current_project_id pointing at an archived project is treated the same
  // as unassigned everywhere else in the app — match that here so the picker
  // doesn't show an "Unassign" affordance for a non-existent assignment.
  const isAssignedToActiveProject =
    person.current_project_id !== null &&
    person.current_project !== null &&
    !person.current_project.archived_at;

  const backTo = `/people/${person.id}`;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">Assign {person.name}</h1>
        <Link href={backTo} className="text-sm text-zinc-500 hover:text-zinc-700">
          Done
        </Link>
      </header>

      {isAssignedToActiveProject && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <span className="text-sm text-zinc-500">Pull them off this project entirely</span>
          <AssignButton
            action={reassignPersonAction}
            personId={person.id}
            projectId={null}
            label="Unassign"
            variant="secondary"
          />
        </div>
      )}

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No active projects to assign to. Create one first.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {projects.map((project) => {
            const isCurrent = isAssignedToActiveProject && person.current_project_id === project.id;
            return (
              <li
                key={project.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{project.name}</span>
                  {project.address && (
                    <span className="truncate text-xs text-zinc-500">{project.address}</span>
                  )}
                </div>
                {isCurrent ? (
                  <Link
                    href={`/projects/${project.id}`}
                    className="rounded-md bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Currently here →
                  </Link>
                ) : (
                  <AssignButton
                    action={reassignPersonAction}
                    personId={person.id}
                    projectId={project.id}
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
