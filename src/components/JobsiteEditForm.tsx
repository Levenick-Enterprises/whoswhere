"use client";

import { useState } from "react";

import { DeleteButton } from "@/components/DeleteButton";
import { DetailIconRow } from "@/components/DetailIconRow";
import { EditModeControls } from "@/components/EditModeControls";
import { FormField, inputClass } from "@/components/FormField";
import { FileTextIcon, MapPinIcon } from "@/components/icons";
import { mapsHref } from "@/lib/links";

type Jobsite = {
  id: string;
  name: string;
  address: string | null;
  notes: string | null;
};

export function JobsiteEditForm({
  jobsite,
  updateAction,
  deleteAction,
}: {
  jobsite: Jobsite;
  updateAction: (formData: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      {isEditing ? (
        <EditFields
          jobsite={jobsite}
          updateAction={updateAction}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ViewFields jobsite={jobsite} onEdit={() => setIsEditing(true)} />
      )}

      {isEditing && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <DeleteButton
            action={deleteAction}
            confirmMessage={`Delete ${jobsite.name}? You can restore from Trash.`}
          />
        </div>
      )}
    </>
  );
}

function ViewFields({ jobsite, onEdit }: { jobsite: Jobsite; onEdit: () => void }) {
  const hasAny = jobsite.address || jobsite.notes;

  return (
    <div className="flex flex-col gap-4">
      {hasAny ? (
        <div className="flex flex-col gap-1">
          {jobsite.address && (
            <DetailIconRow
              icon={MapPinIcon}
              href={mapsHref(jobsite.address)}
              label={`Open ${jobsite.address} in Maps`}
            >
              {jobsite.address}
            </DetailIconRow>
          )}
          {jobsite.notes && (
            <DetailIconRow icon={FileTextIcon} label="Notes">
              {jobsite.notes}
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
  jobsite,
  updateAction,
  onCancel,
}: {
  jobsite: Jobsite;
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
          defaultValue={jobsite.name}
          className={inputClass}
        />
      </FormField>

      <FormField label="Address">
        <input
          type="text"
          name="address"
          maxLength={500}
          defaultValue={jobsite.address ?? ""}
          className={inputClass}
        />
      </FormField>

      <FormField label="Notes">
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={jobsite.notes ?? ""}
          className={inputClass}
        />
      </FormField>

      <EditModeControls isEditing={true} onEdit={() => {}} onCancel={onCancel} />
    </form>
  );
}
