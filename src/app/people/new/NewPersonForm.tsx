"use client";

import { useActionState, useState } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { ACTION_OK } from "@/lib/action-result";
import { useMarkPageBusy } from "@/lib/page-busy";

import { createPersonAction } from "../actions";

export function NewPersonForm() {
  const [state, formAction] = useActionState(createPersonAction, ACTION_OK);
  // Mark the page busy after the first onChange so a realtime event doesn't
  // re-render the page and throw away typed input (#31).
  const [isDirty, setIsDirty] = useState(false);
  useMarkPageBusy(isDirty);

  return (
    <form
      action={formAction}
      onChange={() => {
        if (!isDirty) setIsDirty(true);
      }}
      className="flex flex-col gap-4"
    >
      <FormErrorBanner state={state} />

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

      <FormField label="Position">
        <input
          type="text"
          name="position"
          maxLength={100}
          placeholder="e.g. Foreman, Carpenter, Laborer"
          className={inputClass}
        />
      </FormField>

      <FormField label="Phone" hint="Tap-to-call from the detail view + people list.">
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
  );
}
