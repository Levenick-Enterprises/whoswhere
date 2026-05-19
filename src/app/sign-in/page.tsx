import { cookies } from "next/headers";
import Link from "next/link";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { safeNext } from "@/lib/origin";

import { requestSignInCodeAction, verifyOtpAction } from "./actions";
import { RESEND_COOLDOWN_SECONDS, SIGNIN_EMAIL_COOKIE, SIGNIN_SENT_AT_COOKIE } from "./cookies";
import { ResendButton } from "./ResendButton";

export const dynamic = "force-dynamic";

const cardClass =
  "flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";

// Server-side compute so the client doesn't have to compare a server timestamp
// to a possibly-skewed browser clock — pulled out of the component body to
// satisfy react-hooks/purity (Date.now is impure).
function computeResendSecondsLeft(sentAt: number | null): number {
  if (sentAt === null || !Number.isFinite(sentAt)) return 0;
  return Math.max(0, RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt) / 1000));
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; invalid?: string; next?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";
  const callbackError = params.error === "callback";
  const invalidCode = params.invalid === "1";
  const next = safeNext(params.next);

  const cookieStore = await cookies();
  const lastEmail = cookieStore.get(SIGNIN_EMAIL_COOKIE)?.value ?? null;
  const sentAtRaw = cookieStore.get(SIGNIN_SENT_AT_COOKIE)?.value ?? null;
  const sentAt = sentAtRaw ? Number(sentAtRaw) : null;
  const resendSecondsLeft = computeResendSecondsLeft(sentAt);

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-zinc-500">
          Email-based sign-in for the foreman of this tenant. We&apos;ll send a one-time code to
          type here.
        </p>
      </header>

      {sent ? (
        <div className={cardClass} role="status" aria-live="polite">
          <p className="text-sm">
            If that email is on the allowlist for this tenant, a one-time code is on its way. Enter
            it below to sign in.
          </p>
          {lastEmail && (
            <p className="text-xs text-zinc-500">
              Sent to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{lastEmail}</span>.
              Expires after about an hour.
            </p>
          )}

          <form action={verifyOtpAction} className="flex flex-col gap-3 pt-2">
            <input type="hidden" name="next" value={next} />
            <FormField
              label="One-time code"
              hint="Copy from the email — or paste from your password manager."
            >
              <input
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,10}"
                maxLength={10}
                autoFocus
                required
                className={`${inputClass} tracking-[0.4em] font-mono text-center`}
              />
            </FormField>
            {invalidCode && (
              <FormErrorBanner state="That code didn't work — check your email or request a new one." />
            )}
            <SubmitButton label="Verify" pendingLabel="Verifying…" />
          </form>

          <div className="flex items-center justify-between gap-3 pt-2">
            {lastEmail ? (
              <ResendButton next={next} initialSecondsLeft={resendSecondsLeft} />
            ) : (
              <span />
            )}
            <Link
              href={`/sign-in${next !== "/projects" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-sm text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Use a different email
            </Link>
          </div>
        </div>
      ) : (
        <form action={requestSignInCodeAction} className={cardClass}>
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
            Send sign-in email
          </button>
        </form>
      )}
    </section>
  );
}
