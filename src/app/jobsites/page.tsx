import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";

import { JobsitesList } from "./JobsitesList";

export const dynamic = "force-dynamic";

export default async function JobsitesPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("jobsites")
    .select("id, name, address, notes, people(id, name)")
    .is("archived_at", null)
    .is("people.archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }

  // PostgREST returns embedded rows in insertion order; sort by name client-side
  // so the crew pills under each jobsite read alphabetically.
  const jobsites = (data ?? []).map((j) => ({
    ...j,
    people: j.people.slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Jobsites</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-xs tabular-nums text-zinc-500">{jobsites.length} active</span>
          <Link
            href="/jobsites/new"
            className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + New
          </Link>
        </div>
      </header>
      <JobsitesList jobsites={jobsites} />
    </section>
  );
}
