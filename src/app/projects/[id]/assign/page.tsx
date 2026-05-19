import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import { CrewPicker } from "./CrewPicker";

export const dynamic = "force-dynamic";

export default async function AssignCrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: project, error: projErr }, { data: people, error: pErr }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("id", projectId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("people")
      .select(
        "id, name, position, phone, current_project_id, current_project:current_project_id (id, name, archived_at)",
      )
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);

  if (projErr || pErr) {
    throw new Error(
      `fetch failed — project: ${JSON.stringify(projErr)} / people: ${JSON.stringify(pErr)}`,
    );
  }
  if (!project) notFound();

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">Crew for {project.name}</h1>
        <Link
          href={`/projects/${project.id}`}
          className="text-sm text-zinc-500 hover:text-zinc-700"
        >
          Done
        </Link>
      </header>
      <CrewPicker projectId={project.id} people={people ?? []} />
    </section>
  );
}
