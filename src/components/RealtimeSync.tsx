"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const REFRESH_DEBOUNCE_MS = 300;

/**
 * Top-level subscriber that keeps every connected browser session in sync
 * with database mutations. Subscribes to postgres_changes on `jobsites` and
 * `people`; any event debounces a `router.refresh()` so every active
 * `force-dynamic` server component re-fetches with fresh data.
 *
 * Renders nothing. Returns null on `/sign-in` and `/auth/*` so signed-out
 * sessions don't open a useless WebSocket — mirrors the pattern in
 * AppHeader and BottomNav.
 */
export function RealtimeSync() {
  const router = useRouter();
  const pathname = usePathname();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onAuthSurface = pathname === "/sign-in" || pathname.startsWith("/auth/");

  useEffect(() => {
    if (onAuthSurface) return;

    const supabase = createSupabaseBrowserClient();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("whoswhere-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobsites" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, scheduleRefresh)
      .subscribe();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Keep realtime's auth context fresh across cookie-refresh cycles. The
    // browser client refreshes the JWT every ~hour; without this the
    // WebSocket would keep using the original token and eventually drop
    // events under RLS once the original expires.
    const { data: authSub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      authSub.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [router, onAuthSurface]);

  return null;
}
