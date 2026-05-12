"use client";

import { useFormStatus } from "react-dom";

type Variant = "primary" | "secondary" | "danger";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
  danger:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950",
};

export function AssignButton({
  action,
  label,
  pendingLabel,
  variant = "primary",
}: {
  action: () => Promise<void>;
  label: string;
  pendingLabel?: string;
  variant?: Variant;
}) {
  return (
    <form action={action}>
      <AssignSubmit label={label} pendingLabel={pendingLabel ?? `${label}…`} variant={variant} />
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
