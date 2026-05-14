import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { JobsitesList } from "./JobsitesList";

export const dynamic = "force-dynamic";

export default async function JobsitesPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: jobsites, error: jErr }, { data: people, error: pErr }] = await Promise.all([
    supabase
      .from("jobsites")
      .select("id, name, address")
      .is("archived_at", null)
      .order("name", { ascending: true }),
    supabase
      .from("people")
      .select(
        "id, name, phone, current_jobsite_id, current_jobsite:current_jobsite_id (archived_at)",
      )
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (jErr || pErr) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(jErr ?? pErr)}`);
  }

  // Normalize people whose current_jobsite points at an archived jobsite to
  // "unassigned" — same rule the rest of the app applies.
  const normalizedPeople = (people ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    phone: p.phone,
    current_jobsite_id:
      p.current_jobsite && !p.current_jobsite.archived_at ? p.current_jobsite_id : null,
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Jobsites</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-xs tabular-nums text-zinc-500">
            {(jobsites ?? []).length} active
          </span>
          <Link
            href="/jobsites/new"
            className="rounded-md bg-zinc-950 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + New
          </Link>
        </div>
      </header>
      <JobsitesList jobsites={jobsites ?? []} people={normalizedPeople} />
    </section>
  );
}
