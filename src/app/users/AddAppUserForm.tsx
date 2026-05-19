"use client";

import { useActionState } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { ACTION_OK } from "@/lib/action-result";

import { addAppUserAction } from "./actions";

export function AddAppUserForm() {
  const [state, formAction] = useActionState(addAppUserAction, ACTION_OK);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h2 className="text-base font-semibold tracking-tight">Add a user</h2>

      <FormErrorBanner state={state} />

      <FormField label="Email">
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          autoComplete="email"
          placeholder="person@example.com"
          className={inputClass}
        />
      </FormField>

      <FormField label="Role" hint="Admin can edit. Audit is read-only.">
        <select name="role" defaultValue="audit" className={inputClass}>
          <option value="audit">Audit — read-only</option>
          <option value="admin">Admin — full access</option>
        </select>
      </FormField>

      <SubmitButton label="Add user" pendingLabel="Adding…" />
    </form>
  );
}
