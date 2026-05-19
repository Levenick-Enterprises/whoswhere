import { restoreProjectAction } from "@/app/projects/actions";
import { restorePersonAction } from "@/app/people/actions";
import { RestoreButton } from "@/components/RestoreButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createSupabaseServerClient();

  const [{ data: projects, error: projErr }, { data: people, error: pErr }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name, address, archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase
      .from("people")
      .select("id, name, phone, archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
  ]);

  if (projErr || pErr) {
    throw new Error(`fetch trash failed: ${JSON.stringify(projErr ?? pErr)}`);
  }

  const isEmpty = (projects?.length ?? 0) === 0 && (people?.length ?? 0) === 0;

  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Trash</h1>
        <span className="text-xs tabular-nums text-zinc-500">
          {(projects?.length ?? 0) + (people?.length ?? 0)} items
        </span>
      </header>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Trash is empty. Deleted projects and people will appear here.
        </div>
      ) : (
        <>
          {projects && projects.length > 0 && (
            <Section title="Projects" count={projects.length}>
              <ul className="flex flex-col gap-2">
                {projects.map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">{j.name}</span>
                      {j.address && (
                        <span className="truncate text-xs text-zinc-500">{j.address}</span>
                      )}
                    </div>
                    <RestoreButton action={restoreProjectAction.bind(null, j.id)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {people && people.length > 0 && (
            <Section title="People" count={people.length}>
              <ul className="flex flex-col gap-2">
                {people.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate font-medium">{p.name}</span>
                      {p.phone && <span className="truncate text-xs text-zinc-500">{p.phone}</span>}
                    </div>
                    <RestoreButton action={restorePersonAction.bind(null, p.id)} />
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
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
