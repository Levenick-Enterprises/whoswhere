import { z } from "zod";

/**
 * Trims whitespace, treats empty strings as null. Use for free-text fields
 * that the foreman may leave blank in a form. Keeps the DB representation
 * consistent (null, not "" or "  ").
 */
export const nullableTrimmed = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s.length === 0 ? null : s))
  .nullable();

/**
 * Same as `nullableTrimmed`, plus a server-side max-length cap. Use when the
 * field also has a UI `maxLength` so the two stay aligned and a hand-crafted
 * request can't slip a too-long value past the form.
 */
export function nullableTrimmedMax(max: number) {
  return z
    .string()
    .transform((s) => s.trim())
    .transform((s) => (s.length === 0 ? null : s))
    .pipe(z.string().max(max, `Too long (max ${max})`).nullable());
}
