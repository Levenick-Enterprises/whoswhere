import { z } from "zod";

import { nullableTrimmed } from "./shared";

export const projectInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  address: nullableTrimmed,
  notes: nullableTrimmed,
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
