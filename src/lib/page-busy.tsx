"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

/**
 * "Page is busy" coordination shared between `RealtimeSync` and the components
 * that don't want a remote `router.refresh()` to interrupt them. Used to
 * prevent:
 *
 *   - A realtime event mid-drag wiping the `useOptimistic` overlay (#30).
 *   - A realtime event mid-edit blowing away typed-but-unsubmitted input in
 *     `defaultValue` forms (#31).
 *
 * Implementation note: we use a ref counter, not state. That keeps the
 * Provider stable (no re-renders on register/release) and lets `RealtimeSync`
 * read the current value imperatively from its debounce callback without
 * stale-closure problems. Consumers don't need to react to busy-state
 * changes — they only register themselves and let the realtime side observe.
 */
type PageBusyAPI = {
  /** Synchronously returns true if any consumer is currently registered. */
  isBusy: () => boolean;
  /**
   * Registers the caller as busy and returns a release function. The release
   * function is idempotent (calling it twice is a no-op) so a `finally`-style
   * pairing in async paths is safe.
   */
  register: () => () => void;
};

const Ctx = createContext<PageBusyAPI | null>(null);

export function PageBusyProvider({ children }: { children: ReactNode }) {
  const countRef = useRef(0);

  const isBusy = useCallback(() => countRef.current > 0, []);

  const register = useCallback(() => {
    countRef.current += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      countRef.current = Math.max(0, countRef.current - 1);
    };
  }, []);

  const value = useMemo(() => ({ isBusy, register }), [isBusy, register]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Returns the page-busy API for imperative use. Returns `null` when the
 * caller isn't mounted inside a `PageBusyProvider` — make non-essential
 * (e.g. `RealtimeSync` should still work without the provider, just without
 * the busy gate).
 */
export function usePageBusyAPI(): PageBusyAPI | null {
  return useContext(Ctx);
}

/**
 * Returns a synchronous "mark me busy" function. The first call registers;
 * subsequent calls are no-ops. Release happens automatically on unmount.
 *
 * Use this for event-handler-driven registration (e.g. first onChange on a
 * form). A useEffect-based hook would leave a micro-race where an already-due
 * realtime debounce timer could fire between the state flip and the effect
 * running — losing the first keystroke. Calling `register()` directly in the
 * event handler closes that window.
 */
export function useRegisterBusyOnce(): () => void {
  const ctx = useContext(Ctx);
  const releaseRef = useRef<(() => void) | null>(null);

  // Release on unmount. The empty deps + idempotent release function make
  // this safe to call regardless of how many times `markBusy` was invoked.
  useEffect(() => {
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
    };
  }, []);

  return useCallback(() => {
    if (releaseRef.current || !ctx) return;
    releaseRef.current = ctx.register();
  }, [ctx]);
}
