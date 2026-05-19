"use client";

import { useActionState } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { ACTION_OK } from "@/lib/action-result";
import { useRegisterBusyOnce } from "@/lib/page-busy";

import { createPersonAction } from "../actions";

export function NewPersonForm() {
  const [state, formAction] = useActionState(createPersonAction, ACTION_OK);
  // Synchronous busy registration on first onChange so a realtime event
  // can't slip in between the keystroke and the gate (#31).
  const markBusy = useRegisterBusyOnce();

  return (
    <form action={formAction} onChange={markBusy} className="flex flex-col gap-4">
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

      <FormField label="Employee number" hint="Your internal identifier (e.g. E-1734). Optional.">
        <input
          type="text"
          name="employee_number"
          inputMode="text"
          maxLength={50}
          placeholder="E-1734"
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

      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <input
          type="checkbox"
          name="show_magnet"
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Show on magnet board
          </span>
          <span className="text-xs text-zinc-500">
            Uncheck to hide this person&apos;s pill from the Projects board. They still appear on
            the People tab and in project crew lists.
          </span>
        </span>
      </label>

      <SubmitButton label="Create" pendingLabel="Creating…" />
    </form>
  );
}
