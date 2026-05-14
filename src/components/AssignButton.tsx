"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
  danger:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950",
};

/**
 * Mini-form button that calls a server action via useActionState.
 * Pass personId + jobsiteId (or null to unassign); they're emitted as
 * hidden inputs so the action can read them from FormData.
 */
export function AssignButton({
  action,
  personId,
  jobsiteId,
  label,
  pendingLabel,
  variant = "primary",
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  personId: string;
  jobsiteId: string | null;
  label: string;
  pendingLabel?: string;
  variant?: Variant;
}) {
  const [state, formAction] = useActionState(action, ACTION_OK);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="personId" value={personId} />
      <input type="hidden" name="jobsiteId" value={jobsiteId ?? ""} />
      <AssignSubmit label={label} pendingLabel={pendingLabel ?? `${label}…`} variant={variant} />
      <FormErrorBanner state={state} />
    </form>
  );
}

function AssignSubmit({
  label,
  pendingLabel,
  variant,
}: {
  label: string;
  pendingLabel: string;
  variant: Variant;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
