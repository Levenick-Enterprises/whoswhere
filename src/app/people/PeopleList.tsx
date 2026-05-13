"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PhoneIcon } from "@/components/icons";
import { telHref } from "@/lib/links";

type PersonWithJobsite = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  notes: string | null;
  current_jobsite: { id: string; name: string } | null;
};

export function PeopleList({ people }: { people: PersonWithJobsite[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => {
      if (p.name.toLowerCase().includes(q)) return true;
      if (p.position?.toLowerCase().includes(q)) return true;
      if (p.phone?.toLowerCase().includes(q)) return true;
      if (p.current_jobsite?.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [people, query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        inputMode="search"
        placeholder="Search names, positions, phones, or jobsites…"
        aria-label="Search people"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
      />

      {filtered.length === 0 ? (
        <EmptyState query={query} totalRows={people.length} />
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonRow({ person }: { person: PersonWithJobsite }) {
  // The Link covers the name/position area only — phone and jobsite chip are
  // siblings on the right, NOT nested inside the Link. That keeps tel: taps
  // from looking nested-anchor-ish to iOS Safari, which can flag rapid taps
  // as "automated calls" when the patterns overlap.
  return (
    <li className="flex items-stretch gap-2 rounded-lg border border-zinc-200 bg-white transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700">
      <Link
        href={`/people/${person.id}`}
        aria-label={`Open ${person.name}'s record`}
        className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-l-lg p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span className="truncate text-base font-medium">{person.name}</span>
        {person.position && (
          <span className="truncate text-xs text-zinc-500">{person.position}</span>
        )}
      </Link>

      <div className="flex shrink-0 items-center gap-2 pr-3">
        {person.phone && (
          <a
            href={telHref(person.phone)}
            aria-label={`Call ${person.name} at ${person.phone}`}
            className="flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <PhoneIcon width={14} height={14} />
            <span className="tabular-nums">{person.phone}</span>
          </a>
        )}
        {person.current_jobsite ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            {person.current_jobsite.name}
          </span>
        ) : (
          <span className="rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
            unassigned
          </span>
        )}
      </div>
    </li>
  );
}

function EmptyState({ query, totalRows }: { query: string; totalRows: number }) {
  if (totalRows === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        <p>No people yet.</p>
        <p className="mt-1 text-xs">Tap &ldquo;+ New&rdquo; above to create one.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
      No people match &ldquo;{query}&rdquo;.
    </div>
  );
}
