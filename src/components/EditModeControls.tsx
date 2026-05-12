"use client";

import { useFormStatus } from "react-dom";

/**
 * View-mode input style: borderless, transparent, looks like text.
 * Pair with `inputClass` from FormField when the field is editable so
 * the DOM stays stable on toggle.
 */
export const readOnlyInputClass =
  "w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-base text-zinc-900 read-only:cursor-default dark:text-zinc-100";

const baseButton = "rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50";

const primaryButton = `${baseButton} bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200`;

const secondaryButton = `${baseButton} border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900`;

/**
 * The Edit / Save+Cancel button row for a view-mode-by-default record form.
 * Must be rendered inside the same `<form>` as the inputs so `useFormStatus`
 * reads the right submission state.
 */
export function EditModeControls({
  isEditing,
  onEdit,
  onCancel,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
}) {
  if (!isEditing) {
    return (
      <button type="button" onClick={onEdit} className={secondaryButton}>
        Edit
      </button>
    );
  }
  return <SaveCancelRow onCancel={onCancel} />;
}

function SaveCancelRow({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex gap-2">
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" onClick={onCancel} disabled={pending} className={secondaryButton}>
        Cancel
      </button>
    </div>
  );
}
