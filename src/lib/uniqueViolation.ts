import type { PostgrestError } from "@supabase/supabase-js";

// Translates Postgres unique-constraint violations (SQLSTATE 23505) on the
// numbered-identifier columns into operator-readable messages.
//
// Index-name strings below are matched as substrings against `error.message`,
// which Postgres formats as `duplicate key value violates unique constraint
// "<index_name>"`. Keep these strings in sync with the migration that creates
// the indexes (currently 20260519004747_add_project_metadata_and_employee_number.sql).
const UNIQUE_VIOLATION = "23505";

export function uniqueViolationMessage(error: PostgrestError | null): string | null {
  if (error?.code !== UNIQUE_VIOLATION) return null;
  if (error.message.includes("projects_project_number_unique")) {
    return "That project number is already used by another project.";
  }
  if (error.message.includes("people_employee_number_unique")) {
    return "That employee number is already used by another employee.";
  }
  return null;
}
