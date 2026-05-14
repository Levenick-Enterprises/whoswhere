/**
 * Shared result type for server actions.
 *
 * Actions return ActionResult instead of throwing on Supabase / validation
 * errors, so forms can surface failures inline via useActionState without
 * losing the user's typed input to the Next error boundary.
 *
 * Success path: the action either redirects (in which case useActionState
 * never sees the ok result; the page navigates) or returns { ok: true }.
 * Failure path: { ok: false, message } — the caller renders the message in
 * a FormErrorBanner above the form fields.
 */
export type ActionResult<T = void> = { ok: true; value: T } | { ok: false; message: string };

/**
 * Conventional initial state for useActionState calls. Use as the second
 * argument: `useActionState(action, ACTION_OK)`. Treating success as the
 * initial state means the banner stays hidden until a real failure lands.
 */
export const ACTION_OK: ActionResult<void> = { ok: true, value: undefined };
