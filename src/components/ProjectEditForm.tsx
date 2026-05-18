"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { FileTextIcon, MapPinIcon } from "@/components/icons";
import { MapsLinkButton } from "@/components/MapsLinkButton";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";
import { useRegisterBusyOnce } from "@/lib/page-busy";

type Project = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
};

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

export function ProjectEditForm({
  project,
  updateAction,
  deleteAction,
}: {
  project: Project;
  updateAction: FormAction;
  deleteAction: FormAction;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      {isEditing ? (
        <EditFields
          project={project}
          updateAction={updateAction}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ViewFields project={project} onEdit={() => setIsEditing(true)} />
      )}

      {isEditing && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <DeleteButton
            action={deleteAction}
            confirmMessage={`Delete ${project.name}? You can restore from Trash.`}
          />
        </div>
      )}
    </>
  );
}

function ViewFields({ project, onEdit }: { project: Project; onEdit: () => void }) {
  const hasAny = project.address || project.notes;

  return (
    <div className="flex flex-col gap-4">
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {project.address && (
            <MapsLinkButton
              address={project.address}
              ariaLabel={`Open ${project.address} in maps — choose Apple Maps or Google Maps`}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-base transition-colors hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-900 dark:active:bg-zinc-800"
            >
              <MapPinIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400"
                width={20}
                height={20}
              />
              <span className="min-w-0 break-words text-zinc-900 dark:text-zinc-100">
                {project.address}
              </span>
            </MapsLinkButton>
          )}
          {project.notes && (
            <DetailIconRow icon={FileTextIcon} label="Notes">
              {project.notes}
            </DetailIconRow>
          )}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm italic text-zinc-500">
          No address or notes yet. Tap Edit to add.
        </p>
      )}

      <EditModeControls isEditing={false} onEdit={onEdit} onCancel={() => {}} />
    </div>
  );
}

function EditFields({
  project,
  updateAction,
  onCancel,
}: {
  project: Project;
  updateAction: FormAction;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(updateAction, ACTION_OK);
  // Synchronous busy registration on first onChange — see PersonEditForm
  // for the same rationale (#31).
  const markBusy = useRegisterBusyOnce();

  return (
    <form action={formAction} onChange={markBusy} className="flex flex-col gap-4">
      <FormErrorBanner state={state} />

      <FormField label="Name">
        <input
          type="text"
          name="name"
          required
          maxLength={200}
          defaultValue={project.name}
          className={inputClass}
        />
      </FormField>

      <FormField label="Address">
        <input
          type="text"
          name="address"
          maxLength={500}
          defaultValue={project.address ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Notes">
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={project.notes ?? ""}
          className={inputClass}
        />
      </FormField>

      <EditModeControls isEditing={true} onEdit={() => {}} onCancel={onCancel} />
    </form>
  );
}
