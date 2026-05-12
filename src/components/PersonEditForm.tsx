"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { DeleteButton } from "@/components/DeleteButton";
import { FormField, inputClass } from "@/components/FormField";

// View-mode input style: borderless, transparent, looks like text.
// Toggling between this and `inputClass` keeps the DOM stable so the
// fields don't reflow when the foreman taps Edit.
const viewClass =
  "w-full rounded-lg border border-transparent bg-transparent px-3 py-2 text-base text-zinc-900 read-only:cursor-default dark:text-zinc-100";

export function PersonEditForm({
  person,
  updateAction,
  deleteAction,
}: {
  person: { id: string; name: string; phone: string | null; notes: string | null };
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const fieldClass = isEditing ? inputClass : viewClass;

  function cancelEdit() {
    formRef.current?.reset();
    setIsEditing(false);
  }

  return (
    <>
      <form ref={formRef} action={updateAction} className="flex flex-col gap-4">
        <FormField label="Name">
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            readOnly={!isEditing}
            defaultValue={person.name}
            className={fieldClass}
          />
        </FormField>

        <FormField label="Phone">
          <input
            type="tel"
            name="phone"
            maxLength={50}
            readOnly={!isEditing}
            defaultValue={person.phone ?? ""}
            placeholder={!isEditing && !person.phone ? "—" : undefined}
            className={fieldClass}
          />
        </FormField>

        <FormField label="Notes">
          <textarea
            name="notes"
            rows={3}
            maxLength={2000}
            readOnly={!isEditing}
            defaultValue={person.notes ?? ""}
            placeholder={!isEditing && !person.notes ? "—" : undefined}
            className={fieldClass}
          />
        </FormField>

        {isEditing ? (
          <div className="flex gap-2">
            <SaveButton />
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Edit
          </button>
        )}
      </form>

      {isEditing && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <DeleteButton
            action={deleteAction}
            confirmMessage={`Delete ${person.name}? You can restore from Trash.`}
          />
        </div>
      )}
    </>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? "Saving…" : "Save"}
    </button>
  );
}
