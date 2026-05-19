"use client";

import { useMemo, useState, type ReactNode } from "react";

import { reassignPersonAction } from "@/app/people/actions";
import { AssignButton } from "@/components/AssignButton";

type Person = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  current_project_id: string | null;
  current_project: { id: string; name: string; archived_at: string | null } | null;
};

export function CrewPicker({ projectId, people }: { projectId: string; people: Person[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.position?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.current_project?.name.toLowerCase().includes(q),
    );
  }, [people, query]);

  const here: Person[] = [];
  const elsewhere: Person[] = [];
  const unassigned: Person[] = [];
  for (const person of filtered) {
    if (person.current_project_id === projectId) here.push(person);
    else if (person.current_project && !person.current_project.archived_at) elsewhere.push(person);
    else unassigned.push(person);
  }

  const nothingVisible = here.length === 0 && elsewhere.length === 0 && unassigned.length === 0;
  const trimmedQuery = query.trim();

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        inputMode="search"
        placeholder="Search names, positions, phones, or projects…"
        aria-label="Search crew"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
      />

      {nothingVisible && trimmedQuery && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No one matches &ldquo;{trimmedQuery}&rdquo;.
        </div>
      )}

      {nothingVisible && !trimmedQuery && (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No active people yet. Create one on the People tab.
        </div>
      )}

      {here.length > 0 && (
        <Section title="Currently here" count={here.length}>
          <ul className="flex flex-col gap-2">
            {here.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={
                  <AssignButton
                    action={reassignPersonAction}
                    personId={person.id}
                    projectId={null}
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
                    action={reassignPersonAction}
                    personId={person.id}
                    projectId={projectId}
                    label="Add to crew"
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}

      {elsewhere.length > 0 && (
        <Section title="At another project" count={elsewhere.length}>
          <ul className="flex flex-col gap-2">
            {elsewhere.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                badge={person.current_project?.name}
                action={
                  <AssignButton
                    action={reassignPersonAction}
                    personId={person.id}
                    projectId={projectId}
                    label="Move here"
                    variant="secondary"
                  />
                }
              />
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
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
  person: { id: string; name: string; position: string | null; phone: string | null };
  badge?: string;
  action: ReactNode;
}) {
  const hasSubtitle = !!(person.position || person.phone);
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium">{person.name}</span>
        {hasSubtitle && (
          <span className="truncate text-xs text-zinc-500">
            {[person.position, person.phone].filter(Boolean).join(" · ")}
          </span>
        )}
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
