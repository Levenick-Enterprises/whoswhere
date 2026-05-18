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
 * after normalizing the incoming header the same way, so the order of
 * entries within a field doesn't affect matching — `sniffMapping`
 * builds a reverse `Map<normalizedSynonym, field>` and does a single
 * O(1) get per header.
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
 * Used by the people-import flow to resolve a CSV "Jobsite" column value
 * to an active jobsite. Same normalization as `normalizeHeader` so both
 * sides of the comparison go through identical text mangling — forgiving
 * (case, whitespace, NFKC variants) without being magical (no fuzzy /
 * Levenshtein).
 */
export function normalizeJobsiteName(raw: string): string {
  return raw.trim().normalize("NFKC").toLowerCase();
}

export type JobsiteHit =
  | { kind: "single"; id: string; canonicalName: string }
  | { kind: "ambiguous"; canonicalNames: string[] };

/**
 * Builds the normalized name → JobsiteHit lookup used by the people-import
 * flow. Two active jobsites that normalize to the same key are flagged
 * `ambiguous` so neither client nor server silently picks one of them
 * (the schema doesn't enforce unique jobsite names — operator can have
 * "Smith Residence" twice or "Smith Residence" + "smith residence" by
 * accident). Used by both the client preview and the server action so
 * a rename mid-session can't desync the client's snapshot from the
 * server's authoritative resolution.
 */
export function buildJobsiteLookup(
  jobsites: ReadonlyArray<{ id: string; name: string }>,
): Map<string, JobsiteHit> {
  const map = new Map<string, JobsiteHit>();
  for (const j of jobsites) {
    const key = normalizeJobsiteName(j.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { kind: "single", id: j.id, canonicalName: j.name });
    } else if (existing.kind === "single") {
      map.set(key, { kind: "ambiguous", canonicalNames: [existing.canonicalName, j.name] });
    } else {
      existing.canonicalNames.push(j.name);
    }
  }
  return map;
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
