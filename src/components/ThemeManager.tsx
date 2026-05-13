"use client";

import { useEffect } from "react";

import { useTheme } from "@/lib/usePrefs";

/**
 * Keeps the `.dark` class on <html> in sync with the user's theme preference
 * and (when `system` is chosen) the OS media query. A copy of the same logic
 * runs as an inline script in layout.tsx for the first paint to avoid FOUC.
 */
export function ThemeManager() {
  const [theme] = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", isDark);
    };
    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  return null;
}
