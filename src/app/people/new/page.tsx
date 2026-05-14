import Link from "next/link";

import { NewPersonForm } from "./NewPersonForm";

export default function NewPersonPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New person</h1>
        <Link href="/people" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <NewPersonForm />
    </section>
  );
}
