import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { ImportPeopleForm } from "./ImportPeopleForm";

export const dynamic = "force-dynamic";

export default async function ImportPeoplePage() {
  // Active jobsites are passed to the client form so it can resolve the
  // mapped "Jobsite" column name → ID for each row before submit, AND
  // show the resolved-or-not state in the preview table. Fail closed on
  // Supabase errors (transient network, RLS, session) — silently treating
  // an error as "no jobsites" would let the operator import a mapped
  // Jobsite column with every assignment dropped on the floor. Matches
  // the read-error posture in src/app/people/page.tsx and /more/page.tsx.
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("jobsites")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }
  const activeJobsites = data ?? [];

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Import people</h1>
        <Link href="/people" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <ImportPeopleForm activeJobsites={activeJobsites} />
    </section>
  );
}
