import Link from "next/link";
import { notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";

import { CrewPicker } from "./CrewPicker";

export const dynamic = "force-dynamic";

export default async function AssignCrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobsiteId } = await params;
  const supabase = createAdminClient();

  const [{ data: jobsite, error: jErr }, { data: people, error: pErr }] = await Promise.all([
    supabase
      .from("jobsites")
      .select("id, name")
      .eq("id", jobsiteId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("people")
      .select(
        "id, name, phone, current_jobsite_id, current_jobsite:current_jobsite_id (id, name, archived_at)",
      )
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (jErr || pErr) {
    throw new Error(
      `fetch failed — jobsite: ${JSON.stringify(jErr)} / people: ${JSON.stringify(pErr)}`,
    );
  }
  if (!jobsite) notFound();

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">Crew for {jobsite.name}</h1>
        <Link
          href={`/jobsites/${jobsite.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Done
        </Link>
      </header>
      <CrewPicker jobsiteId={jobsite.id} people={people ?? []} />
    </section>
  );
}
