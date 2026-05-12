import { z } from "zod";

// Trims whitespace, treats empty strings as null for optional fields.
// Names are required, addresses + notes are not.
const nullableTrimmed = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s.length === 0 ? null : s))
  .nullable();

export const jobsiteInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  address: nullableTrimmed,
  notes: nullableTrimmed,
});

export type JobsiteInput = z.infer<typeof jobsiteInputSchema>;
