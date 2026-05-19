import { z } from "zod";

import { nullableTrimmed, nullableTrimmedMax } from "./shared";

export const personInputSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Name is required").max(200, "Name is too long")),
  employee_number: nullableTrimmedMax(50),
  position: nullableTrimmedMax(100),
  phone: nullableTrimmed,
  notes: nullableTrimmed,
});

export type PersonInput = z.infer<typeof personInputSchema>;

// Row shape for the bulk CSV-import path. Extends the canonical person
// schema with an optional `project_name` (the raw value the operator
// mapped from a CSV Project column). The server resolves it to an
// active project ID at insert time. Max length matches the project name
// cap so a crafted payload can't push a multi-megabyte string through
// the trim + normalize + lookup path.
export const importPersonRowSchema = personInputSchema.extend({
  project_name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(200, "Project name is too long"))
    .optional(),
});

export type ImportPersonRow = z.infer<typeof importPersonRowSchema>;
