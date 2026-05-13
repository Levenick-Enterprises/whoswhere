"use client";

import { useRef, type ReactNode } from "react";

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

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" aria-label={ariaLabel} onClick={open} className={className}>
        {children}
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          // Click on the backdrop (the dialog element itself, not its inner
          // content) closes the dialog. Native <dialog> doesn't do this by
          // default — it only closes on ESC.
          if (e.target === dialogRef.current) close();
        }}
        className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 shadow-xl backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
      >
        <h2 className="mb-3 max-w-xs text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Open in…
        </h2>
        <p className="mb-3 max-w-xs text-base text-zinc-900 dark:text-zinc-100">{address}</p>
        <div className="flex min-w-[14rem] flex-col gap-2">
          <a
            href={appleMapsHref(address)}
            onClick={close}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-center text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Apple Maps
          </a>
          <a
            href={googleMapsHref(address)}
            onClick={close}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
