import { z } from "zod";

const nullableTrimmed = z
  .string()
  .transform((s) => s.trim())
  .transform((s) => (s.length === 0 ? null : s))
  .nullable();

export const personInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  phone: nullableTrimmed,
  notes: nullableTrimmed,
});

export type PersonInput = z.infer<typeof personInputSchema>;
