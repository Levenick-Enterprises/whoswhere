"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/jobsites", label: "Jobsites" },
  { href: "/people", label: "People" },
] as const;

// The hamburger lives next to the tabs — same row, narrower, and active
// for /more and anything underneath it (currently /trash, future /import).
const moreHref = "/more";
const morePaths = ["/more", "/trash"];

export function BottomNav() {
  const pathname = usePathname();
  const moreActive = morePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 flex border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90"
    >
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 items-center justify-center py-4 text-base font-medium transition-colors ${
              active
                ? "text-zinc-950 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link
        href={moreHref}
        aria-label="More"
        aria-current={moreActive ? "page" : undefined}
        className={`flex w-16 items-center justify-center py-4 transition-colors ${
          moreActive
            ? "text-zinc-950 dark:text-zinc-50"
            : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
        }`}
      >
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </Link>
    </nav>
  );
}
