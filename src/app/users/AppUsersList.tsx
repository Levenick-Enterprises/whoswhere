"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { ACTION_OK, type ActionResult } from "@/lib/action-result";
import type { UserRole } from "@/lib/auth";

import { deleteAppUserAction, updateAppUserRoleAction } from "./actions";

type Row = {
  email: string;
  role: string;
  created_at: string;
};

export function AppUsersList({
  rows,
  currentUserEmail,
}: {
  rows: Row[];
  currentUserEmail: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No users yet.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((row) => (
        <li key={row.email}>
          <UserRow row={row} isSelf={row.email === currentUserEmail} />
        </li>
      ))}
    </ul>
  );
}

function UserRow({ row, isSelf }: { row: Row; isSelf: boolean }) {
  const role = (row.role === "admin" || row.role === "audit" ? row.role : "audit") as UserRole;
  const updateWithEmail = updateAppUserRoleAction.bind(null, row.email);
  const deleteWithEmail = deleteAppUserAction.bind(null, row.email);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">
          {row.email}
          {isSelf && (
            <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              you
            </span>
          )}
        </span>
        <RoleSelect action={updateWithEmail} currentRole={role} disabled={isSelf} />
        {!isSelf && <RemoveButton action={deleteWithEmail} email={row.email} />}
      </div>
      <span className="text-xs text-zinc-500">
        Added{" "}
        {new Date(row.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    </div>
  );
}

function RoleSelect({
  action,
  currentRole,
  disabled,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  currentRole: UserRole;
  disabled: boolean;
}) {
  // The previous form-action approach used `defaultValue` on an uncontrolled
  // <select>, which React 19's <form action> resets on submit — causing a
  // visible flip back to the old role for the ~700ms the action took. Mirror
  // the optimistic-DnD pattern in ProjectsList: call the server action inside
  // a startTransition, drive the select's value with useOptimistic, then
  // router.refresh() to re-pull the new server state. On failure, the
  // optimistic value snaps back to currentRole automatically.
  const [optimisticRole, setOptimisticRole] = useOptimistic(currentRole);
  const [state, setState] = useState<ActionResult>(ACTION_OK);
  const [isPending, startPendingTransition] = useTransition();

  const handleChange = (newRole: UserRole) => {
    startPendingTransition(async () => {
      setOptimisticRole(newRole);
      const formData = new FormData();
      formData.set("role", newRole);
      const result = await action(state, formData);
      setState(result);
      // No router.refresh needed — the server action calls revalidatePath
      // and Next.js automatically refreshes the route inside the transition.
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <select
        name="role"
        value={optimisticRole}
        disabled={disabled || isPending}
        onChange={(e) => handleChange(e.target.value as UserRole)}
        aria-label={isPending ? "Saving…" : "Role"}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
      >
        <option value="audit">Audit</option>
        <option value="admin">Admin</option>
      </select>
      <FormErrorBanner state={state} />
    </div>
  );
}

function RemoveButton({
  action,
  email,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  email: string;
}) {
  const [state, formAction] = useActionState(action, ACTION_OK);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Remove ${email}? They'll be signed out immediately and won't be able to sign back in until re-added.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-1"
    >
      <RemoveSubmit />
      <FormErrorBanner state={state} />
    </form>
  );
}

function RemoveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-zinc-950 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
