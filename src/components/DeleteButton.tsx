"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";

export function DeleteButton({
  action,
  confirmMessage,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  confirmMessage: string;
}) {
  const [state, formAction] = useActionState(action, ACTION_OK);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-2"
    >
      <DeleteSubmit />
      <FormErrorBanner state={state} />
    </form>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
