import { z } from "zod";

import { nullableTrimmed, nullableTrimmedMax } from "./shared";

export const projectInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  project_number: nullableTrimmedMax(50),
  address: nullableTrimmed,
  project_executive: nullableTrimmedMax(100),
  project_manager: nullableTrimmedMax(100),
  project_engineer: nullableTrimmedMax(100),
  superintendent: nullableTrimmedMax(100),
  project_coordinator: nullableTrimmedMax(100),
  notes: nullableTrimmed,
});

export type ProjectInput = z.infer<typeof projectInputSchema>;
