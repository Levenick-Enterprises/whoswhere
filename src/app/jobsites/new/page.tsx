import Link from "next/link";

import { NewJobsiteForm } from "./NewJobsiteForm";

export default function NewJobsitePage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New jobsite</h1>
        <Link href="/jobsites" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <NewJobsiteForm />
    </section>
  );
}
