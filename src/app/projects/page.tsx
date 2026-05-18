import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ProjectsList } from "./ProjectsList";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: projects, error: jErr }, { data: people, error: pErr }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("people")
      .select(
        "id, name, phone, current_project_id, current_project:current_project_id (archived_at)",
      )
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (jErr || pErr) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(jErr ?? pErr)}`);
  }

  // Normalize people whose current_project points at an archived project to
  // "unassigned" — same rule the rest of the app applies.
  const normalizedPeople = (people ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    current_project_id:
      p.current_project && !p.current_project.archived_at ? p.current_project_id : null,
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-xs tabular-nums text-zinc-500">
            {(projects ?? []).length} active
          </span>
          <Link
            href="/projects/new"
            className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + New
          </Link>
        </div>
      </header>
      <ProjectsList projects={projects ?? []} people={normalizedPeople} />
    </section>
  );
}
