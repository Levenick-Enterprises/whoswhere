"use client";

import { useActionState, useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { FileTextIcon, HashIcon, MapPinIcon } from "@/components/icons";
import { MapsLinkButton } from "@/components/MapsLinkButton";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";
import { useRegisterBusyOnce } from "@/lib/page-busy";

type Project = {
  id: string;
  name: string;
  project_number: string | null;
  address: string | null;
  project_executive: string | null;
  project_manager: string | null;
  project_engineer: string | null;
  superintendent: string | null;
  project_coordinator: string | null;
  notes: string | null;
};

type FormAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

// Display labels for the role rows in the ViewFields metadata block. Order
// matches the form so editing + viewing feel consistent.
const ROLE_FIELDS: ReadonlyArray<{ key: keyof Project; label: string }> = [
  { key: "project_executive", label: "Project Executive" },
  { key: "project_manager", label: "Project Manager" },
  { key: "project_engineer", label: "Project Engineer" },
  { key: "superintendent", label: "Superintendent" },
  { key: "project_coordinator", label: "Project Coordinator" },
];

export function ProjectEditForm({
  project,
  updateAction,
  deleteAction,
  canEdit = true,
}: {
  project: Project;
  updateAction: FormAction;
  deleteAction: FormAction;
  canEdit?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (!canEdit) {
    return <ViewFields project={project} onEdit={null} />;
  }

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

function ViewFields({ project, onEdit }: { project: Project; onEdit: (() => void) | null }) {
  const populatedRoles = ROLE_FIELDS.filter((r) => project[r.key]);
  const hasAny =
    project.project_number || project.address || project.notes || populatedRoles.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {project.project_number && (
            <DetailIconRow icon={HashIcon} label="Project number">
              <span className="font-mono">{project.project_number}</span>
            </DetailIconRow>
          )}
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
          {populatedRoles.length > 0 && (
            <dl className="flex flex-col gap-1 px-3 py-2 text-sm">
              {populatedRoles.map((r) => (
                <div key={r.key} className="flex flex-wrap gap-x-2">
                  <dt className="text-zinc-500 dark:text-zinc-400">{r.label}:</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">{project[r.key]}</dd>
                </div>
              ))}
            </dl>
          )}
          {project.notes && (
            <DetailIconRow icon={FileTextIcon} label="Notes">
              {project.notes}
            </DetailIconRow>
          )}
        </div>
      ) : (
        <p className="px-3 py-2 text-sm italic text-zinc-500">
          {onEdit
            ? "No metadata yet. Tap Edit to add a project number, address, roles, or notes."
            : "No metadata yet."}
        </p>
      )}

      {onEdit && <EditModeControls isEditing={false} onEdit={onEdit} onCancel={() => {}} />}
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

      <FormField label="Project number">
        <input
          type="text"
          name="project_number"
          inputMode="text"
          maxLength={50}
          defaultValue={project.project_number ?? ""}
          placeholder="PRJ-0042"
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

      <FormField label="Project executive">
        <input
          type="text"
          name="project_executive"
          maxLength={100}
          defaultValue={project.project_executive ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Project manager">
        <input
          type="text"
          name="project_manager"
          maxLength={100}
          defaultValue={project.project_manager ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Project engineer">
        <input
          type="text"
          name="project_engineer"
          maxLength={100}
          defaultValue={project.project_engineer ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Superintendent">
        <input
          type="text"
          name="superintendent"
          maxLength={100}
          defaultValue={project.superintendent ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Project coordinator">
        <input
          type="text"
          name="project_coordinator"
          maxLength={100}
          defaultValue={project.project_coordinator ?? ""}
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
