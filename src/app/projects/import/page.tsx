import Link from "next/link";

import { ImportProjectsForm } from "./ImportProjectsForm";

export const dynamic = "force-dynamic";

export default function ImportProjectsPage() {
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
