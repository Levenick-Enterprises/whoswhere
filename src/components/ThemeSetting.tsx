"use client";

import { THEMES, useTheme, type Theme } from "@/lib/usePrefs";

const LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeSetting() {
  const [theme, setTheme] = useTheme();

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Color theme" className="flex gap-2">
        {THEMES.map((option) => {
          const active = theme === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(option)}
              className={`flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {LABELS[option]}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-zinc-500">
        System follows your phone or browser&apos;s appearance setting.
      </p>
    </div>
  );
}
