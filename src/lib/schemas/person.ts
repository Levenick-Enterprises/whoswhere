import { z } from "zod";

import { nullableTrimmed, nullableTrimmedMax } from "./shared";

export const personInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  position: nullableTrimmedMax(100),
  phone: nullableTrimmed,
  notes: nullableTrimmed,
});

export type PersonInput = z.infer<typeof personInputSchema>;
