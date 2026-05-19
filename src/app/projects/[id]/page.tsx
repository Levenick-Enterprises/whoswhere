import Link from "next/link";
import { notFound } from "next/navigation";

import { ProjectEditForm } from "@/components/ProjectEditForm";
import { getCurrentUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { deleteProjectAction, updateProjectAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  // Project + crew in two separate queries rather than an embedded
  // `people(id, name)` join with `.is("people.archived_at", null)`. Two
  // simple queries are easier to reason about and surface RLS / cache
  // issues with a clear error.
  const [projectResult, peopleResult] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, name, project_number, address, project_executive, project_manager, project_engineer, superintendent, project_coordinator, notes",
      )
      .eq("id", id)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("people")
      .select("id, name")
      .eq("current_project_id", id)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (projectResult.error) {
    throw new Error(`fetch project failed: ${JSON.stringify(projectResult.error)}`);
  }
  if (!projectResult.data) notFound();
  if (peopleResult.error) {
    throw new Error(`fetch project crew failed: ${JSON.stringify(peopleResult.error)}`);
  }

  const project = projectResult.data;
  const crew = peopleResult.data ?? [];
  const canEdit = (await getCurrentUserRole()) === "admin";

  const updateWithId = updateProjectAction.bind(null, project.id);
  const deleteWithId = deleteProjectAction.bind(null, project.id);

  const crewCard = (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Who&apos;s here? ({crew.length})
      </span>
      {canEdit && (
        <span className="rounded-md bg-zinc-100 px-3 py-1 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {crew.length === 0 ? "Add crew" : "Manage"} →
        </span>
      )}
    </div>
  );

  const crewBody =
    crew.length === 0 ? (
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
    );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">{project.name}</h1>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">
          Back
        </Link>
      </header>

      {canEdit ? (
        <Link
          href={`/projects/${project.id}/assign`}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {crewCard}
          {crewBody}
        </Link>
      ) : (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
          {crewCard}
          {crewBody}
        </div>
      )}

      <ProjectEditForm
        project={{
          id: project.id,
          name: project.name,
          project_number: project.project_number,
          address: project.address,
          project_executive: project.project_executive,
          project_manager: project.project_manager,
          project_engineer: project.project_engineer,
          superintendent: project.superintendent,
          project_coordinator: project.project_coordinator,
          notes: project.notes,
        }}
        updateAction={updateWithId}
        deleteAction={deleteWithId}
        canEdit={canEdit}
      />
    </section>
  );
}
