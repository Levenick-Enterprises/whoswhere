"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { BriefcaseIcon, FileTextIcon, PhoneIcon } from "@/components/icons";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";
import { telHref } from "@/lib/links";
import { useMarkPageBusy } from "@/lib/page-busy";

type Person = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  notes: string | null;
};

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function PersonEditForm({
  person,
  updateAction,
  deleteAction,
}: {
  person: Person;
  updateAction: FormAction;
  deleteAction: FormAction;
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
  updateAction: FormAction;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(updateAction, ACTION_OK);
  // Marks the page busy as soon as the user touches any field, which makes
  // RealtimeSync skip its router.refresh() until the form unmounts (save or
  // cancel). Prevents typed-but-unsubmitted input from being lost to a
  // remote-event-triggered refresh (#31).
  const [isDirty, setIsDirty] = useState(false);
  useMarkPageBusy(isDirty);

  return (
    <form
      action={formAction}
      onChange={() => {
        if (!isDirty) setIsDirty(true);
      }}
      className="flex flex-col gap-4"
    >
      <FormErrorBanner state={state} />

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
