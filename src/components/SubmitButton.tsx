"use client";

import { useFormStatus } from "react-dom";

/**
 * Submit button that disables itself while the parent form is in flight,
 * via React's `useFormStatus`. Two reasons it matters:
 *
 *   - Foreman on a slow mobile connection tapping Save twice in a row
 *     should not produce two database rows (#32, "idempotent creates").
 *   - Visual feedback: the label swaps to a pendingLabel so the user can
 *     tell the form is actually submitting.
 *
 * Must be rendered inside the same `<form>` whose status we're reading.
 */
export function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        className ??
        "rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      }
    >
      {pending ? (pendingLabel ?? `${label}…`) : label}
    </button>
  );
}
