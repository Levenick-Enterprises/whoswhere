import { createAdminClient } from "@/lib/supabase/admin";

import { PeopleList } from "./PeopleList";

export const dynamic = "force-dynamic";

export default async function PeoplePage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("people")
    .select("id, name, phone, notes, current_jobsite:current_jobsite_id (id, name)")
    .is("archived_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">People</h1>
        <span className="text-xs tabular-nums text-zinc-500">{data?.length ?? 0} active</span>
      </header>
      <PeopleList people={data ?? []} />
    </section>
  );
}
