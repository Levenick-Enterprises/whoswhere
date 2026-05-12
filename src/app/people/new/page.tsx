import Link from "next/link";

import { FormField, inputClass } from "@/components/FormField";

import { createPersonAction } from "../actions";

export default function NewPersonPage() {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">New person</h1>
        <Link href="/people" className="text-sm text-zinc-500 hover:text-zinc-700">
          Cancel
        </Link>
      </header>

      <form action={createPersonAction} className="flex flex-col gap-4">
        <FormField label="Name">
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            autoFocus
            placeholder="Alice Chen"
            className={inputClass}
          />
        </FormField>

        <FormField label="Phone" hint="Free-form. Click-to-call lands later (#4).">
          <input
            type="tel"
            name="phone"
            maxLength={50}
            placeholder="555-0142"
            className={inputClass}
          />
        </FormField>

        <FormField label="Notes" hint="Skills, schedule constraints, anything crew-specific.">
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
