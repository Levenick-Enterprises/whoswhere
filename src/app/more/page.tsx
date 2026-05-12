import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function MorePage() {
  const supabase = createAdminClient();

  const [{ count: trashedJobsites, error: jErr }, { count: trashedPeople, error: pErr }] =
    await Promise.all([
      supabase
        .from("jobsites")
        .select("*", { count: "exact", head: true })
        .not("archived_at", "is", null),
      supabase
        .from("people")
        .select("*", { count: "exact", head: true })
        .not("archived_at", "is", null),
    ]);

  if (jErr || pErr) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(jErr ?? pErr)}`);
  }

  const trashTotal = (trashedJobsites ?? 0) + (trashedPeople ?? 0);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-zinc-500">Less-frequent actions and admin views.</p>
      </header>

      <ul className="flex flex-col gap-2">
        <li>
          <Link
            href="/trash"
            className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Trash</span>
              <span className="text-xs text-zinc-500">
                Deleted jobsites and people; restore from here.
              </span>
            </div>
            <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-500 dark:bg-zinc-900">
              {trashTotal}
            </span>
          </Link>
        </li>

        <li>
          <div
            aria-disabled="true"
            className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-4 opacity-60 dark:border-zinc-800 dark:bg-zinc-950/50"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="font-medium">Import from spreadsheet</span>
              <span className="text-xs text-zinc-500">
                Bulk-add jobsites or people from CSV / XLSX (#6, #7).
              </span>
            </div>
            <span className="shrink-0 text-xs italic text-zinc-400">coming soon</span>
          </div>
        </li>
      </ul>
    </section>
  );
}
