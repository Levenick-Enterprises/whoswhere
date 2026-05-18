// CSV-import column-mapping helpers. The import UI sniffs a CSV's header
// row against these synonym lists to pre-fill the operator's mapping; the
// operator can override any choice in the UI.
//
// Generic enough for any entity. `sniffMapping` is fully type-parameterized,
// so adding a new entity is just a new field type + synonym dict export.

export type JobsiteField = "name" | "address" | "notes";

// `jobsite` here is the *target jobsite name* — the import resolves names
// to IDs against the current set of active jobsites, then writes the row's
// `current_jobsite_id`. No-match values leave the imported person
// unassigned (visible in the preview before commit).
export type PersonField = "name" | "position" | "phone" | "notes" | "jobsite";

/**
 * Result of sniffing: each CSV header maps to one of our schema fields,
 * or `"ignore"` if no synonym matched (or the operator chose to skip).
 */
export type ColumnMapping<F extends string> = Record<string, F | "ignore">;

/**
 * Lowercase + NFKC-normalized + trimmed synonym lists. Lookup is exact
 * after normalizing the incoming header the same way, so order matters
 * only for the type — Set-based lookup is the actual mechanism.
 */
export const JOBSITE_HEADER_SYNONYMS: Record<JobsiteField, readonly string[]> = {
  name: [
    "name",
    "jobsite",
    "job site",
    "site",
    "project",
    "site name",
    "jobsite name",
    "project name",
  ],
  address: ["address", "addr", "street", "location", "site address", "project address"],
  notes: ["notes", "note", "comments", "comment", "description", "details", "memo"],
};

export const PERSON_HEADER_SYNONYMS: Record<PersonField, readonly string[]> = {
  name: [
    "name",
    "full name",
    "full_name",
    "person",
    "person name",
    "employee",
    "employee name",
    "worker",
  ],
  position: ["position", "role", "title", "job", "job title", "occupation"],
  phone: ["phone", "cell", "mobile", "phone number", "tel", "telephone"],
  notes: ["notes", "note", "comments", "comment", "description", "details", "memo"],
  jobsite: [
    "jobsite",
    "job site",
    "site",
    "project",
    "assignment",
    "location",
    "current site",
    "current jobsite",
  ],
};

function normalizeHeader(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}

/**
 * For each header in `headers`, look it up in `synonyms` and assign the
 * first matching field key — or `"ignore"` if nothing matches. Operators
 * can override any of these in the UI.
 *
 * Pure function; no side effects. Easy to unit-test (none today; add when
 * the synonym lists grow).
 */
export function sniffMapping<F extends string>(
  headers: readonly string[],
  synonyms: Record<F, readonly string[]>,
): ColumnMapping<F> {
  // Build a reverse lookup once: normalized synonym → field key.
  const lookup = new Map<string, F>();
  for (const field of Object.keys(synonyms) as F[]) {
    for (const synonym of synonyms[field]) {
      lookup.set(normalizeHeader(synonym), field);
    }
  }

  const mapping: ColumnMapping<F> = {};
  for (const header of headers) {
    mapping[header] = lookup.get(normalizeHeader(header)) ?? "ignore";
  }
  return mapping;
}
