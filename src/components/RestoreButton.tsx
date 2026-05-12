"use client";

import { useFormStatus } from "react-dom";

export function RestoreButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <RestoreSubmit />
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
