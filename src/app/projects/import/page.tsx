import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserRole } from "@/lib/auth";

import { ImportProjectsForm } from "./ImportProjectsForm";

export const dynamic = "force-dynamic";

export default async function ImportProjectsPage() {
  if ((await getCurrentUserRole()) !== "admin") redirect("/projects");

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Import projects</h1>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <ImportProjectsForm />
    </section>
  );
}
