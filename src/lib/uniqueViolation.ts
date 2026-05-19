import type { PostgrestError } from "@supabase/supabase-js";

// Translates Postgres unique-constraint violations (SQLSTATE 23505) on the
// numbered-identifier columns into operator-readable messages.
//
// Matching strategy: Postgres formats the `details` field as
//   `Key (<column_name>)=(<value>) already exists.`
// We look for the column name in there rather than parsing the index name
// out of `message` — index names can be renamed without changing the
// column the constraint protects, and `details` is a more structured
// surface than the free-text `message`.
const UNIQUE_VIOLATION = "23505";

export function uniqueViolationMessage(error: PostgrestError | null): string | null {
  if (error?.code !== UNIQUE_VIOLATION) return null;
  const details = error.details ?? "";
  if (details.includes("(project_number)")) {
    return "That project number is already used by another project.";
  }
  if (details.includes("(employee_number)")) {
    return "That employee number is already used by another employee.";
  }
  return null;
}
