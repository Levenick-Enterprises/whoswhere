// Canonical form for emails used as keys (app_users PK, allowlist matching,
// Supabase auth lookups). NFKC folds compatibility-equivalent codepoints
// (e.g. fullwidth Latin → ASCII), trim removes accidental whitespace,
// lowercase normalizes case-insensitive local-parts. Sign-in form input,
// app_users PK storage, and the CLI all run through this same helper so
// the gate compares apples to apples.
export function normalizeEmail(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}
