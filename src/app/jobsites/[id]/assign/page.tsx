import Link from "next/link";
import { notFound } from "next/navigation";

import { assignPersonAction } from "@/app/people/actions";
import { AssignButton } from "@/components/AssignButton";
import { createAdminClient } from "@/lib/supabase/admin";

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
    throw new Error(`fetch failed: ${JSON.stringify(jErr ?? pErr)}`);
  }
  if (!jobsite) notFound();

  const backTo = `/jobsites/${jobsite.id}`;

  const here: typeof people = [];
  const elsewhere: typeof people = [];
  const unassigned: typeof people = [];

  for (const person of people ?? []) {
    if (person.current_jobsite_id === jobsite.id) here.push(person);
    else if (person.current_jobsite && !person.current_jobsite.archived_at) elsewhere.push(person);
    else unassigned.push(person);
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="truncate text-2xl font-semibold tracking-tight">Crew for {jobsite.name}</h1>
        <Link href={backTo} className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      {here.length > 0 && (
        <Section title="Currently here" count={here.length}>
          <ul className="flex flex-col gap-2">
            {here.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={
                  <AssignButton
                    action={assignPersonAction.bind(null, person.id, null, backTo)}
                    label="Remove"
                    variant="danger"
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {unassigned.length > 0 && (
        <Section title="Unassigned" count={unassigned.length}>
          <ul className="flex flex-col gap-2">
            {unassigned.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={
                  <AssignButton
                    action={assignPersonAction.bind(null, person.id, jobsite.id, backTo)}
                    label="Add to crew"
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {elsewhere.length > 0 && (
        <Section title="At another jobsite" count={elsewhere.length}>
          <ul className="flex flex-col gap-2">
            {elsewhere.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                badge={person.current_jobsite?.name}
                action={
                  <AssignButton
                    action={assignPersonAction.bind(null, person.id, jobsite.id, backTo)}
                    label="Move here"
                    variant="secondary"
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {here.length === 0 && elsewhere.length === 0 && unassigned.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No active people yet. Create one on the People tab.
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
        <span className="text-xs tabular-nums text-zinc-400">{count}</span>
      </div>
      {children}
    </div>
  );
}

function PersonRow({
  person,
  badge,
  action,
}: {
  person: { id: string; name: string; phone: string | null };
  badge?: string;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{person.name}</span>
        {person.phone && <span className="truncate text-xs text-zinc-500">{person.phone}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge && (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-900">
            {badge}
          </span>
        )}
        {action}
      </div>
    </li>
  );
}
