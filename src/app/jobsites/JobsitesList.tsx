"use client";

import { useMemo, useState } from "react";

type JobsiteWithPeople = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
  people: { id: string; name: string }[];
};

export function JobsitesList({ jobsites }: { jobsites: JobsiteWithPeople[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobsites;
    return jobsites.filter((j) => {
      if (j.name.toLowerCase().includes(q)) return true;
      if (j.address?.toLowerCase().includes(q)) return true;
      if (j.people.some((p) => p.name.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [jobsites, query]);

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        inputMode="search"
        placeholder="Search jobsites, addresses, or crew names…"
        aria-label="Search jobsites"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
      />

      {filtered.length === 0 ? (
        <EmptyState query={query} totalRows={jobsites.length} />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((jobsite) => (
            <li
              key={jobsite.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-semibold tracking-tight">{jobsite.name}</h2>
                <span className="text-xs tabular-nums text-zinc-500">
                  {jobsite.people.length} {jobsite.people.length === 1 ? "person" : "people"}
                </span>
              </div>
              {jobsite.address && <p className="text-sm text-zinc-500">{jobsite.address}</p>}
              {jobsite.people.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {jobsite.people.map((person) => (
                    <li
                      key={person.id}
                      className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    >
                      {person.name}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyState({ query, totalRows }: { query: string; totalRows: number }) {
  if (totalRows === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        <p>No jobsites yet.</p>
        <p className="mt-1 text-xs">Create one via the upcoming CRUD flow (separate PR).</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
      No jobsites match &ldquo;{query}&rdquo;.
    </div>
  );
}
