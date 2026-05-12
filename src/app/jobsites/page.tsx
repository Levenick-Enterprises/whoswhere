import { createAdminClient } from "@/lib/supabase/admin";

import { JobsitesList } from "./JobsitesList";

export const dynamic = "force-dynamic";

export default async function JobsitesPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("jobsites")
    .select("id, name, address, notes, people(id, name)")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }

  // The embedded people array can include archived people; the typegen doesn't
  // express that filter so we drop them client-side. Cheaper than a separate
  // round-trip per jobsite. When realtime / large datasets land, push this
  // filter into the query.
  const jobsites = (data ?? []).map((j) => ({
    ...j,
    people: j.people.slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Jobsites</h1>
        <span className="text-xs tabular-nums text-zinc-500">{jobsites.length} active</span>
      </header>
      <JobsitesList jobsites={jobsites} />
    </section>
  );
}
