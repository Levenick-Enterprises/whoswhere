// Plain-module storage keys so both the client-side usePrefs hooks and the
// server-rendered theme bootstrap script in layout.tsx reference the same
// source-of-truth string. Avoids drift when one place gets renamed.

export const DRAG_STORAGE_KEY = "whoswhere:dragSpeed";
export const THEME_STORAGE_KEY = "whoswhere:theme";
export const CARD_SIZE_STORAGE_KEY = "whoswhere:cardSize";
