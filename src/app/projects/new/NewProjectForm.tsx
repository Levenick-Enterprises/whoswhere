"use client";

import { useActionState } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { ACTION_OK } from "@/lib/action-result";
import { useRegisterBusyOnce } from "@/lib/page-busy";

import { createProjectAction } from "../actions";

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProjectAction, ACTION_OK);
  // Synchronous busy registration on first onChange so a realtime event
  // can't slip in between the keystroke and the gate (#31).
  const markBusy = useRegisterBusyOnce();

  return (
    <form action={formAction} onChange={markBusy} className="flex flex-col gap-4">
      <FormErrorBanner state={state} />

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

      <FormField label="Address" hint="Free-form. Tap the address on a project to open it in Maps.">
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

      <SubmitButton label="Create" pendingLabel="Creating…" />
    </form>
  );
}
