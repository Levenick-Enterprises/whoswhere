"use client";

import { useId, useRef, type ReactNode } from "react";

import { appleMapsHref, googleMapsHref } from "@/lib/links";

/**
 * Renders a button that opens a chooser dialog with Apple Maps / Google Maps
 * options for the given address. iOS doesn't natively offer a "pick your
 * maps app" prompt — Google's universal URL always opens Google, Apple's
 * always opens Apple — so we provide the choice ourselves via a `<dialog>`.
 *
 * Caller styles the trigger via `className` + `children`; the dialog is
 * positioned and styled internally.
 */
export function MapsLinkButton({
  address,
  ariaLabel,
  className,
  children,
}: {
  address: string;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const addressId = useId();

  // Guard against InvalidStateError when a fast double-tap fires the handler
  // before the first showModal() has fully opened. `dialog.open` reflects the
  // current state and is false on a freshly-mounted dialog.
  const open = () => {
    const d = dialogRef.current;
    if (d && !d.open) d.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" aria-label={ariaLabel} onClick={open} className={className}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={addressId}
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself, not its inner
          // content) closes the dialog. Native <dialog> doesn't do this by
          // default — it only closes on ESC.
          if (e.target === dialogRef.current) close();
        }}
        // m-auto restores the centering that Tailwind's preflight nukes (it
        // resets margin to 0 on every element, breaking <dialog>'s default
        // showModal() positioning).
        className="m-auto w-[min(20rem,90vw)] rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <h2
          id={titleId}
          className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
        >
          Open in…
        </h2>
        <p id={addressId} className="mb-5 text-base font-medium text-zinc-900 dark:text-zinc-100">
          {address}
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={appleMapsHref(address)}
            onClick={close}
            className="rounded-lg bg-zinc-950 px-4 py-3 text-center text-base font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Apple Maps
          </a>
          <a
            href={googleMapsHref(address)}
            onClick={close}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-base font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Google Maps
          </a>
          <button
            type="button"
            onClick={close}
            className="rounded-lg px-4 py-2 text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </>
  );
}
