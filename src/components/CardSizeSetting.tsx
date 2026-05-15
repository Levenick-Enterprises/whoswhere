"use client";

import { CARD_SIZES, useCardSize, type CardSize } from "@/lib/usePrefs";

const LABELS: Record<CardSize, string> = {
  standard: "Standard",
  roomy: "Roomy",
};

export function CardSizeSetting() {
  const [size, setSize] = useCardSize();

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Magnet size" className="flex gap-2">
        {CARD_SIZES.map((option) => {
          const active = size === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSize(option)}
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
      <p className="text-xs text-zinc-500">Larger pills are easier to grab when dragging.</p>
    </div>
  );
}
