"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";

export function RestoreButton({
  action,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
}) {
  const [state, formAction] = useActionState(action, ACTION_OK);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <RestoreSubmit />
      <FormErrorBanner state={state} />
    </form>
  );
}

function RestoreSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? "Restoring…" : "Restore"}
    </button>
  );
}
