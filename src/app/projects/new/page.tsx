import Link from "next/link";

import { NewProjectForm } from "./NewProjectForm";

export default function NewProjectPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
        <Link href="/projects" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <NewProjectForm />
    </section>
  );
}
