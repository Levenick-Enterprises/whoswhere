"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/jobsites", label: "Jobsites" },
  { href: "/people", label: "People" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  if (pathname === "/sign-in" || pathname.startsWith("/auth/")) return null;

  return (
    <nav
      aria-label="Primary"
      className="sticky bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90"
    >
      <div className="mx-auto flex w-full max-w-md gap-2 px-3 py-3">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                active
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
