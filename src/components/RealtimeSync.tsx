"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { usePageBusyAPI } from "@/lib/page-busy";

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
 *
 * Skips refreshes while a `PageBusyProvider` consumer (DnD transition, dirty
 * edit form, dirty new form) is registered as busy. Prevents mid-drag
 * overlay wipes (#30) and lost typed-but-unsubmitted form input (#31).
 *
 * Catches up after a WebSocket reconnect: when the channel re-emits
 * `SUBSCRIBED` after a prior error/timeout, fires a refresh so events that
 * landed during the gap aren't permanently missed (#37).
 */
export function RealtimeSync() {
  const router = useRouter();
  const pathname = usePathname();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageBusy = usePageBusyAPI();

  const onAuthSurface = pathname === "/sign-in" || pathname.startsWith("/auth/");

  useEffect(() => {
    if (onAuthSurface) return;

    const supabase = createSupabaseBrowserClient();

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        // Imperatively check the latest busy state at fire time. If anything
        // on the page is mid-write or mid-edit, drop this refresh — the next
        // event, visibility-change, or reconnect will pick up the state.
        // `pageBusy` is closure-captured from a memoized context value, so
        // calling `isBusy()` here returns the live counter, not a stale one.
        if (pageBusy?.isBusy()) return;
        router.refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    // Tracks whether we've ever seen the SUBSCRIBED status, so we can
    // distinguish the initial subscribe (no need to catch up — the server
    // just rendered) from a reconnect (events may have been missed).
    let subscribedOnce = false;

    const channel = supabase
      .channel("whoswhere-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "jobsites" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "people" }, scheduleRefresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (subscribedOnce) {
            // Reconnect after a prior CHANNEL_ERROR / TIMED_OUT / CLOSED.
            // Fire a refresh to pick up anything we missed during the gap.
            scheduleRefresh();
          }
          subscribedOnce = true;
        }
      });

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
  }, [router, onAuthSurface, pageBusy]);

  return null;
}
