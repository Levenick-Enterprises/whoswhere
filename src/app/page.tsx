import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createAdminClient();

  const [
    { count: jobsitesCount, error: jobsitesError },
    { count: peopleCount, error: peopleError },
  ] = await Promise.all([
    supabase.from("jobsites").select("*", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("people").select("*", { count: "exact", head: true }).is("archived_at", null),
  ]);

  if (jobsitesError || peopleError) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(jobsitesError ?? peopleError)}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">whoswhere</h1>
        <p className="text-sm text-zinc-500">
          A digital magnet board for tracking who&apos;s at which jobsite.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Active jobsites" value={jobsitesCount ?? 0} />
        <Stat label="Active people" value={peopleCount ?? 0} />
      </section>

      <p className="text-xs text-zinc-400">
        Smoke render — confirms the Supabase round-trip is wired. Real list and DnD views land in
        follow-up branches.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-3xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}
