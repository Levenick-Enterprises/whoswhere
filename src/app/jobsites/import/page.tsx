import Link from "next/link";

import { ImportJobsitesForm } from "./ImportJobsitesForm";

export const dynamic = "force-dynamic";

export default function ImportJobsitesPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Import jobsites</h1>
        <Link href="/jobsites" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <ImportJobsitesForm />
    </section>
  );
}
