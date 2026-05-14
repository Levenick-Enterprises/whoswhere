import { cookies } from "next/headers";
import Link from "next/link";

import { FormField, inputClass } from "@/components/FormField";
import { safeNext } from "@/lib/origin";

import { requestMagicLinkAction } from "./actions";
import { SIGNIN_EMAIL_COOKIE, SIGNIN_SENT_AT_COOKIE } from "./cookies";
import { ResendButton } from "./ResendButton";

export const dynamic = "force-dynamic";

const cardClass =
  "flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const callbackError = params.error === "callback";
  const next = safeNext(params.next);

  const cookieStore = await cookies();
  const lastEmail = cookieStore.get(SIGNIN_EMAIL_COOKIE)?.value ?? null;
  const sentAtRaw = cookieStore.get(SIGNIN_SENT_AT_COOKIE)?.value ?? null;
  const sentAt = sentAtRaw ? Number(sentAtRaw) : null;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-500">Magic-link sign-in for the foreman of this tenant.</p>
      </header>

      {sent ? (
        <div className={cardClass} role="status" aria-live="polite">
          <p className="text-sm">
            If that email is on the allowlist for this tenant, a magic link is on its way. Open it
            on this device to finish signing in.
          </p>
          {lastEmail && (
            <p className="text-xs text-zinc-500">
              Sent to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{lastEmail}</span>.
              Links expire after about an hour.
            </p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {lastEmail && sentAt !== null && Number.isFinite(sentAt) ? (
              <ResendButton next={next} sentAt={sentAt} />
            ) : (
              <span />
            )}
            <Link
              href={`/sign-in${next !== "/jobsites" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Use a different email
            </Link>
          </div>
        </div>
      ) : (
        <form action={requestMagicLinkAction} className={cardClass}>
          <input type="hidden" name="next" value={next} />
          <FormField label="Email" hint="The address an admin allowlisted for this tenant.">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="you@example.com"
              defaultValue={lastEmail ?? ""}
              className={inputClass}
            />
          </FormField>
          {callbackError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              That link didn&apos;t work — it may have expired. Request a new one.
            </p>
          )}
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Send magic link
          </button>
        </form>
      )}
    </section>
  );
}
