"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const moreHref = "/more";
const morePaths = ["/more", "/trash"];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  // Sign-in / auth-callback routes render their own minimal shell; the
  // hamburger + home link wouldn't lead anywhere a signed-out user can reach.
  if (pathname === "/sign-in" || pathname.startsWith("/auth/")) return null;

  const onMorePage = pathname === moreHref;
  const moreActive = morePaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Re-tapping the hamburger while on /more closes the menu, mirroring how
  // toggleable nav drawers feel. Fall back to /projects if there's no history
  // (e.g. /more is the entry point on a fresh tab).
  const handleMoreClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!onMorePage) return;
    event.preventDefault();
    if (window.history.length > 1) router.back();
    else router.push("/projects");
  };

  return (
    <header
      className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-black/90"
      aria-label="App header"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-4 py-3">
        <Link
          href="/projects"
          aria-label="Who's Where? — home"
          className="text-lg font-semibold tracking-tight text-zinc-950 transition-colors hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
        >
          Who&apos;s Where?
        </Link>
        <Link
          href={moreHref}
          onClick={handleMoreClick}
          aria-label={onMorePage ? "Close menu" : "More"}
          aria-current={onMorePage ? "page" : undefined}
          className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
            moreActive
              ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
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
      </div>
    </header>
  );
}
