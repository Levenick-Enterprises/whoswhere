import Link from "next/link";

import { FormField, inputClass } from "@/components/FormField";

import { createJobsiteAction } from "../actions";

export default function NewJobsitePage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New jobsite</h1>
        <Link href="/jobsites" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <form action={createJobsiteAction} className="flex flex-col gap-4">
        <FormField label="Name" hint="What the crew calls it.">
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            autoFocus
            placeholder="Smith Residence"
            className={inputClass}
          />
        </FormField>

        <FormField label="Address" hint="Free-form. Maps integration lands later (#5).">
          <input
            type="text"
            name="address"
            maxLength={500}
            placeholder="1834 Maple St, Springfield"
            className={inputClass}
          />
        </FormField>

        <FormField label="Notes" hint="Access codes, gate hours, anything site-specific.">
          <textarea name="notes" rows={3} maxLength={2000} className={inputClass} />
        </FormField>

        <button
          type="submit"
          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Create
        </button>
      </form>
    </section>
  );
}
