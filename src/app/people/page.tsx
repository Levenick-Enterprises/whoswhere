import Link from "next/link";

import { getCurrentUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { PeopleList } from "./PeopleList";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = await createSupabaseServerClient();
  const canEdit = (await getCurrentUserRole()) === "admin";

  const { data, error } = await supabase
    .from("people")
    .select(
      "id, name, position, phone, notes, current_project:current_project_id (id, name, archived_at)",
    )
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }

  // A person's current_project_id can still reference a project that has been
  // archived. Treat those as unassigned in the UI — the foreman doesn't want
  // to see crew labelled with a project that's sitting in Trash.
  const people = (data ?? []).map((p) => ({
    ...p,
    current_project:
      p.current_project && !p.current_project.archived_at
        ? { id: p.current_project.id, name: p.current_project.name }
        : null,
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-xs tabular-nums text-zinc-500">{people.length} active</span>
          {canEdit && (
            <Link
              href="/people/new"
              className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              + New
            </Link>
          )}
        </div>
      </header>
      <PeopleList people={people} />
    </section>
  );
}
