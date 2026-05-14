import type { ActionResult } from "@/lib/action-result";

/**
 * Inline error banner rendered above a form's fields (or below a mini-form
 * button) when an ActionResult from a server action came back `ok: false`.
 *
 * Accepts either a raw message string or the full ActionResult — handy
 * because useActionState's state value is the whole result, so callers can
 * pass it without destructuring.
 */
export function FormErrorBanner({
  state,
}: {
  state: ActionResult<unknown> | string | null | undefined;
}) {
  const message =
    typeof state === "string" ? state : state && "ok" in state && !state.ok ? state.message : null;

  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </div>
  );
}
