"use client";

import { useRef, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { EditModeControls, readOnlyInputClass } from "@/components/EditModeControls";
import { FormField, inputClass } from "@/components/FormField";

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

  const fieldClass = isEditing ? inputClass : readOnlyInputClass;

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

        <EditModeControls
          isEditing={isEditing}
          onEdit={() => setIsEditing(true)}
          onCancel={cancelEdit}
        />
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
