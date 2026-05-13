"use client";

import { useCallback, useSyncExternalStore } from "react";

import { DRAG_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/prefsKeys";

export type DragSpeed = "snappy" | "balanced" | "deliberate";

export const DRAG_SPEEDS: DragSpeed[] = ["snappy", "balanced", "deliberate"];

export const DRAG_DELAY_MS: Record<DragSpeed, number> = {
  snappy: 200,
  balanced: 400,
  deliberate: 600,
};

export type Theme = "light" | "dark" | "system";

export const THEMES: Theme[] = ["light", "dark", "system"];

const DRAG_DEFAULT: DragSpeed = "balanced";
const THEME_DEFAULT: Theme = "system";

function isDragSpeed(value: unknown): value is DragSpeed {
  return value === "snappy" || value === "balanced" || value === "deliberate";
}

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

// Browsers don't fire the native `storage` event in the same tab that wrote
// the change — only in other tabs of the same origin. We use a custom event
// on top of that for in-tab subscribers, since manually-dispatched StorageEvents
// are unreliable across browsers.
const PREFS_CHANGE_EVENT = "whoswhere:prefs-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(PREFS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PREFS_CHANGE_EVENT, onChange);
  };
}

// localStorage can throw (SecurityError in private mode, quota errors, or when
// the browser disables storage entirely). Swallow it: degrade to defaults so a
// render-time `getSnapshot()` call never crashes the tree.
function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readDrag(): DragSpeed {
  const stored = safeGet(DRAG_STORAGE_KEY);
  return isDragSpeed(stored) ? stored : DRAG_DEFAULT;
}

function readTheme(): Theme {
  const stored = safeGet(THEME_STORAGE_KEY);
  return isTheme(stored) ? stored : THEME_DEFAULT;
}

function writeAndBroadcast(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — the value won't persist across reloads, but
    // in-tab subscribers still get notified so the UI reflects the choice
    // for the rest of this session.
  }
  window.dispatchEvent(new Event(PREFS_CHANGE_EVENT));
}

export function useDragSpeed(): [DragSpeed, (next: DragSpeed) => void] {
  const speed = useSyncExternalStore(subscribe, readDrag, () => DRAG_DEFAULT);
  const set = useCallback((next: DragSpeed) => writeAndBroadcast(DRAG_STORAGE_KEY, next), []);
  return [speed, set];
}

export function useDragDelayMs(): number {
  const [speed] = useDragSpeed();
  return DRAG_DELAY_MS[speed];
}

export function useTheme(): [Theme, (next: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readTheme, () => THEME_DEFAULT);
  const set = useCallback((next: Theme) => writeAndBroadcast(THEME_STORAGE_KEY, next), []);
  return [theme, set];
}
