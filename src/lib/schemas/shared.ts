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
