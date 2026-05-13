"use client";

import { useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormField, inputClass } from "@/components/FormField";
import { BriefcaseIcon, FileTextIcon, PhoneIcon } from "@/components/icons";
import { telHref } from "@/lib/links";

type Person = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  notes: string | null;
};

export function PersonEditForm({
  person,
  updateAction,
  deleteAction,
}: {
  person: Person;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      {isEditing ? (
        <EditFields
          person={person}
          updateAction={updateAction}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ViewFields person={person} onEdit={() => setIsEditing(true)} />
      )}

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

function ViewFields({ person, onEdit }: { person: Person; onEdit: () => void }) {
  const hasAny = person.position || person.phone || person.notes;
  const phoneHref = person.phone ? telHref(person.phone) : null;

  return (
    <div className="flex flex-col gap-4">
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {person.position && (
            <DetailIconRow icon={BriefcaseIcon} label="Position">
              {person.position}
            </DetailIconRow>
          )}
          {person.phone &&
            (phoneHref ? (
              <DetailIconRow
                icon={PhoneIcon}
                href={phoneHref}
                label={`Call ${person.name} at ${person.phone}`}
              >
                {person.phone}
              </DetailIconRow>
            ) : (
              <DetailIconRow icon={PhoneIcon} label="Phone">
                {person.phone}
              </DetailIconRow>
            ))}
          {person.notes && (
            <DetailIconRow icon={FileTextIcon} label="Notes">
              {person.notes}
            </DetailIconRow>
          )}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm italic text-zinc-500">
          No position, phone, or notes yet. Tap Edit to add.
        </p>
      )}

      <EditModeControls isEditing={false} onEdit={onEdit} onCancel={() => {}} />
    </div>
  );
}

function EditFields({
  person,
  updateAction,
  onCancel,
}: {
  person: Person;
  updateAction: (formData: FormData) => Promise<void>;
  onCancel: () => void;
}) {
  return (
    <form action={updateAction} className="flex flex-col gap-4">
      <FormField label="Name">
        <input
          type="text"
          name="name"
          required
          maxLength={200}
          defaultValue={person.name}
          className={inputClass}
        />
      </FormField>

      <FormField label="Position">
        <input
          type="text"
          name="position"
          maxLength={100}
          defaultValue={person.position ?? ""}
          placeholder="e.g. Foreman, Carpenter, Laborer"
          className={inputClass}
        />
      </FormField>

      <FormField label="Phone">
        <input
          type="tel"
          name="phone"
          maxLength={50}
          defaultValue={person.phone ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Notes">
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={person.notes ?? ""}
          className={inputClass}
        />
      </FormField>

      <EditModeControls isEditing={true} onEdit={() => {}} onCancel={onCancel} />
    </form>
  );
}
