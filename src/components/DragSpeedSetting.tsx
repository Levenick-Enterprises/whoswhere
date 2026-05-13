"use client";

import { DRAG_SPEEDS, useDragSpeed, type DragSpeed } from "@/lib/usePrefs";

const LABELS: Record<DragSpeed, string> = {
  snappy: "Snappy",
  balanced: "Balanced",
  deliberate: "Deliberate",
};

export function DragSpeedSetting() {
  const [speed, setSpeed] = useDragSpeed();

  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" aria-label="Drag-and-drop hold delay" className="flex gap-2">
        {DRAG_SPEEDS.map((option) => {
          const active = speed === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSpeed(option)}
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
        How long to hold a pill before it picks up for drag-and-drop. Tap a pill briefly to open the
        record instead.
      </p>
    </div>
  );
}
