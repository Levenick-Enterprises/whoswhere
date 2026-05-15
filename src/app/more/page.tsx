import Link from "next/link";

import { DragSpeedSetting } from "@/components/DragSpeedSetting";
import { ThemeSetting } from "@/components/ThemeSetting";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cardClass =
  "flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950";

export default async function MorePage() {
  const supabase = await createSupabaseServerClient();

  const [
    { count: trashedJobsites, error: jErr },
    { count: trashedPeople, error: pErr },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("jobsites")
      .select("*", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase
      .from("people")
      .select("*", { count: "exact", head: true })
      .not("archived_at", "is", null),
    supabase.auth.getUser(),
  ]);

  if (jErr || pErr) {
    throw new Error(
      `Supabase fetch failed — jobsites: ${JSON.stringify(jErr)} / people: ${JSON.stringify(pErr)}`,
    );
  }

  const trashTotal = (trashedJobsites ?? 0) + (trashedPeople ?? 0);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">More</h1>
        <p className="text-sm text-zinc-500">Less-frequent actions and admin views.</p>
      </header>

      <section className={cardClass}>
        <h2 className="text-base font-semibold tracking-tight">Drag-and-drop speed</h2>
        <DragSpeedSetting />
      </section>

      <section className={cardClass}>
        <h2 className="text-base font-semibold tracking-tight">Appearance</h2>
        <ThemeSetting />
      </section>

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

      <form action="/sign-out" method="post" className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">Signed in</span>
            <span className="truncate text-xs text-zinc-500">{user?.email ?? "Unknown"}</span>
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </div>
      </form>

      <p className="pt-2 text-center text-xs tabular-nums text-zinc-400 dark:text-zinc-600">
        {buildLabel()}
      </p>
    </section>
  );
}

/** Short build identifier rendered in the More menu footer. Used to verify a
 * specific deploy is live on a given hostname. The NEXT_PUBLIC_BUILD_* values
 * are mapped from Vercel's VERCEL_GIT_* env vars in next.config.ts; Next.js
 * inlines them at compile time so they survive force-dynamic rendering. */
function buildLabel(): string {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA?.slice(0, 7) || null;
  const prNumber = process.env.NEXT_PUBLIC_BUILD_PR_NUM || null;

  if (prNumber && sha) return `Build: ${prNumber} (${sha})`;
  if (sha) return `Build: ${sha}`;
  return "Build: local";
}
