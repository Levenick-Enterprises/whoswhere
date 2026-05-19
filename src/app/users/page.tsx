import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AddAppUserForm } from "./AddAppUserForm";
import { AppUsersList } from "./AppUsersList";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (me?.role !== "admin") redirect("/");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("app_users")
    .select("email, role, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Supabase fetch failed: ${JSON.stringify(error)}`);
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <Link href="/more" className="text-sm text-zinc-500 hover:text-zinc-700">
          Back
        </Link>
      </header>

      <p className="text-sm text-zinc-500">
        Admins have full access. Audit users can browse the magnet board and detail views but
        can&apos;t change anything.
      </p>

      <AddAppUserForm />

      <AppUsersList rows={data ?? []} currentUserEmail={me.email} />
    </section>
  );
}
