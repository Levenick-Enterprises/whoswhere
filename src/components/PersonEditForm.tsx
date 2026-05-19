"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { BriefcaseIcon, EyeOffIcon, FileTextIcon, HashIcon, PhoneIcon } from "@/components/icons";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";
import { telHref } from "@/lib/links";
import { useRegisterBusyOnce } from "@/lib/page-busy";

type Person = {
  id: string;
  name: string;
  employee_number: string | null;
  position: string | null;
  phone: string | null;
  notes: string | null;
  show_magnet: boolean;
};

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function PersonEditForm({
  person,
  updateAction,
  deleteAction,
  canEdit = true,
}: {
  person: Person;
  updateAction: FormAction;
  deleteAction: FormAction;
  canEdit?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!canEdit) {
    return <ViewFields person={person} onEdit={null} />;
  }

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

function ViewFields({ person, onEdit }: { person: Person; onEdit: (() => void) | null }) {
  const hasAny = person.employee_number || person.position || person.phone || person.notes;
  const phoneHref = person.phone ? telHref(person.phone) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden-from-board status sits at the top of the read-only view, in
          parallel with the checkbox at the top of EditFields. Only render when
          it's actually off — the default (true) is the common case. No label
          prop here: this row is a status statement (not a field+value pair),
          so the visible text alone is the right screen-reader announcement.
          Other DetailIconRows in this file pair `label="Phone"` with a value
          like "555-0142" — that pattern doesn't apply for a boolean flag. */}
      {!person.show_magnet && (
        <DetailIconRow icon={EyeOffIcon}>Hidden from magnet board</DetailIconRow>
      )}

      {hasAny ? (
        <div className="flex flex-col gap-1">
          {person.employee_number && (
            <DetailIconRow icon={HashIcon} label="Employee number">
              <span className="font-mono">{person.employee_number}</span>
            </DetailIconRow>
          )}
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
          {onEdit
            ? "No employee number, position, phone, or notes yet. Tap Edit to add."
            : "No employee number, position, phone, or notes yet."}
        </p>
      )}

      {onEdit && <EditModeControls isEditing={false} onEdit={onEdit} onCancel={() => {}} />}
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
  // Marks the page busy as soon as the user touches any field. Registration
  // is synchronous (not via useEffect), so an already-due realtime debounce
  // timer can't slip in between the keystroke and the registration and wipe
  // the input on its way through. Release fires on unmount (save redirect
  // or Cancel) (#31).
  const markBusy = useRegisterBusyOnce();

  return (
    <form action={formAction} onChange={markBusy} className="flex flex-col gap-4">
      <FormErrorBanner state={state} />

      {/* Show-magnet sits at the top of the form (right under the Current
          project card on the page) so the visibility controls group together —
          "where this person is" + "do we show their magnet at all."
          The hidden "off" input lets parseFormData distinguish "intentionally
          unchecked" from "form didn't include the field" (stale/cached page).
          See src/app/people/actions.ts for the getAll() handling. */}
      <label className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
        <input type="hidden" name="show_magnet" value="off" />
        <input
          type="checkbox"
          name="show_magnet"
          value="on"
          defaultChecked={person.show_magnet}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Show on magnet board
          </span>
          <span className="text-xs text-zinc-500">
            Uncheck to hide this person&apos;s pill from the Projects board. They still appear on
            the People tab and in project crew lists.
          </span>
        </span>
      </label>

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

      <FormField label="Employee number">
        <input
          type="text"
          name="employee_number"
          inputMode="text"
          maxLength={50}
          defaultValue={person.employee_number ?? ""}
          placeholder="E-1734"
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
