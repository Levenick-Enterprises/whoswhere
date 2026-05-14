"use client";

import { useEffect, useState, useTransition } from "react";

import { requestMagicLinkAction } from "./actions";

export function ResendButton({
  next,
  initialSecondsLeft,
}: {
  next: string;
  initialSecondsLeft: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(initialSecondsLeft);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsLeft]);

  const disabled = secondsLeft > 0 || isPending;

  function handleClick() {
    const formData = new FormData();
    // Email omitted — the server action falls back to the signin_email cookie.
    formData.set("next", next);
    startTransition(() => {
      void requestMagicLinkAction(formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {isPending ? "Sending…" : secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend link"}
    </button>
  );
}
