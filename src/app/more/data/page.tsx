import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DataManagementPage() {
  if ((await getCurrentUserRole()) !== "admin") redirect("/more");

  const supabase = await createSupabaseServerClient();
  const [{ count: trashedProjects, error: projErr }, { count: trashedPeople, error: pErr }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .not("archived_at", "is", null),
      supabase
        .from("people")
        .select("*", { count: "exact", head: true })
        .not("archived_at", "is", null),
    ]);

  if (projErr || pErr) {
    throw new Error(
      `Supabase fetch failed — projects: ${JSON.stringify(projErr)} / people: ${JSON.stringify(pErr)}`,
    );
  }

  const trashTotal = (trashedProjects ?? 0) + (trashedPeople ?? 0);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Data management</h1>
        <Link href="/more" className="text-sm text-zinc-500 hover:text-zinc-700">
          Back
        </Link>
      </header>

      <Link
        href="/projects/import"
        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">Import projects from CSV</span>
          <span className="text-xs text-zinc-500">Bulk-add projects from a spreadsheet.</span>
        </div>
      </Link>

      <Link
        href="/people/import"
        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">Import people from CSV</span>
          <span className="text-xs text-zinc-500">
            Bulk-add people from a spreadsheet. Map a Project column to auto-assign them.
          </span>
        </div>
      </Link>

      <Link
        href="/trash"
        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium">Trash</span>
          <span className="text-xs text-zinc-500">
            Deleted projects and people; restore from here.
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs tabular-nums text-zinc-500 dark:bg-zinc-900">
          {trashTotal}
        </span>
      </Link>
    </section>
  );
}
