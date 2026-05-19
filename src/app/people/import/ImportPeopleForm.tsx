"use client";

import Papa, { type ParseResult } from "papaparse";
import { useActionState, useMemo, useState, type ChangeEvent } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { ACTION_OK } from "@/lib/action-result";
import {
  buildProjectLookup,
  normalizeProjectName,
  PERSON_HEADER_SYNONYMS,
  sniffMapping,
  type ColumnMapping,
  type PersonField,
} from "@/lib/csv-import-mappings";
import { useRegisterBusyOnce } from "@/lib/page-busy";
import { importPersonRowSchema } from "@/lib/schemas/person";

import { bulkCreatePeopleAction } from "../actions";

const FIELD_OPTIONS: ReadonlyArray<{ value: PersonField | "ignore"; label: string }> = [
  { value: "ignore", label: "Skip this column" },
  { value: "name", label: "Name" },
  { value: "employee_number", label: "Employee #" },
  { value: "position", label: "Position" },
  { value: "phone", label: "Phone" },
  { value: "notes", label: "Notes" },
  { value: "project", label: "Project" },
];

const MAX_FILE_BYTES = 1_000_000; // ~1 MB; CSVs of people should be way under this
const MAX_ROWS = 500; // Mirrors BULK_IMPORT_MAX_ROWS in the server action
const PREVIEW_ROWS = 5;

type ActiveProject = { id: string; name: string };

// Row shape we render in the preview + serialize to the server. The
// `_project*` underscored fields are preview-only and stripped before
// the hidden form-field JSON is built. The wire payload carries the
// raw `project_name` (NOT a pre-resolved ID) — the server is the
// canonical resolver, so a project rename mid-session can't desync a
// stale snapshot from the actual current mapping.
//
// `_projectAmbiguous` distinguishes "this name matches multiple active
// projects" from "no match at all" — both result in no auto-assignment,
// but the operator's fix is different (rename a duplicate vs. fix a typo).
type MappedRow = {
  name: string;
  employee_number: string;
  position: string;
  phone: string;
  notes: string;
  project_name?: string;
  _projectMatched?: string; // canonical name on unambiguous match; undefined otherwise
  _projectAmbiguous?: boolean;
};

export function ImportPeopleForm({ activeProjects }: { activeProjects: ActiveProject[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hiddenColumnCount, setHiddenColumnCount] = useState(0);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping<PersonField>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [state, formAction] = useActionState(bulkCreatePeopleAction, ACTION_OK);
  const markBusy = useRegisterBusyOnce();

  // Build name → ProjectHit lookup using the shared helper. Used purely
  // for the preview here (server re-resolves authoritatively at submit
  // time using the same module — see [[reference]] in CLAUDE.md).
  const projectLookup = useMemo(() => buildProjectLookup(activeProjects), [activeProjects]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setParseError(null);
    if (!file) {
      resetParse();
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      resetParse();
      setParseError(
        `File is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Limit is 1 MB.`,
      );
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result: ParseResult<Record<string, string>>) => {
        if (result.errors.length > 0) {
          resetParse();
          setParseError(`Couldn't parse the CSV: ${result.errors[0].message}`);
          return;
        }
        const parsedHeaders = result.meta.fields ?? [];
        if (parsedHeaders.length === 0) {
          resetParse();
          setParseError("Couldn't find a header row in the CSV.");
          return;
        }
        // Reject over-cap CSVs immediately — a sub-1MB file can still have
        // thousands of short rows. Without this gate the form would map +
        // validate + render the preview for every row before the submit
        // gate fires, wasting work on data that can't be submitted.
        if (result.data.length > MAX_ROWS) {
          resetParse();
          setParseError(
            `${result.data.length} rows exceeds the ${MAX_ROWS}-row limit. Split your file and try again.`,
          );
          return;
        }
        // Drop columns that are empty in every row. See ImportProjectsForm
        // for the Numbers/Excel/Sheets trailing-blanks rationale.
        const usefulHeaders = parsedHeaders.filter((h) =>
          result.data.some((row) => (row[h] ?? "").trim() !== ""),
        );
        const hidden = parsedHeaders.length - usefulHeaders.length;
        if (usefulHeaders.length === 0) {
          resetParse();
          setParseError("The CSV has no columns with data.");
          return;
        }
        setFileName(file.name);
        setHeaders(usefulHeaders);
        setHiddenColumnCount(hidden);
        setRows(result.data);
        setMapping(sniffMapping(usefulHeaders, PERSON_HEADER_SYNONYMS));
      },
      error: (err: Error) => {
        resetParse();
        setParseError(`Couldn't read the file: ${err.message}`);
      },
    });
  }

  function resetParse() {
    setFileName(null);
    setHeaders([]);
    setHiddenColumnCount(0);
    setRows([]);
    setMapping({});
  }

  function updateMapping(header: string, field: PersonField | "ignore") {
    setMapping((prev) => ({ ...prev, [header]: field }));
  }

  // Map each CSV row to a person-shaped object + project resolution metadata.
  // Resolution here is preview-only — we set `project_name` (raw value)
  // on the payload and `_projectMatched` / `_projectAmbiguous` for the
  // preview UI. The server re-resolves at submit time via the same
  // helper, so client/server can't disagree on the rules.
  const mappedRows = useMemo<MappedRow[]>(() => {
    return rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (field === "ignore") continue;
        out[field] = row[header] ?? "";
      }
      const mapped: MappedRow = {
        name: out.name ?? "",
        employee_number: out.employee_number ?? "",
        position: out.position ?? "",
        phone: out.phone ?? "",
        notes: out.notes ?? "",
      };
      const projectRaw = out.project?.trim();
      if (projectRaw) {
        // Always carry the raw name through to the payload — the server
        // resolves authoritatively, even if the client preview shows
        // "no match" against the page-load snapshot.
        mapped.project_name = projectRaw;
        const hit = projectLookup.get(normalizeProjectName(projectRaw));
        if (hit?.kind === "single") {
          mapped._projectMatched = hit.canonicalName;
        } else if (hit?.kind === "ambiguous") {
          mapped._projectAmbiguous = true;
        }
        // No hit at all → leave preview metadata empty; preview renders the
        // "no match" state.
      }
      return mapped;
    });
  }, [rows, mapping, projectLookup]);

  // Run safeParse client-side for instant feedback; the server re-runs the
  // same check on submit as defense in depth.
  const rowErrors = useMemo(() => {
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < mappedRows.length; i++) {
      const result = importPersonRowSchema.safeParse(mappedRows[i]);
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? "Invalid value";
        errors.push({ row: i + 1, message });
      }
    }
    return errors;
  }, [mappedRows]);

  const hasNameMapping = Object.values(mapping).some((f) => f === "name");
  const tooManyRows = mappedRows.length > MAX_ROWS;
  const canSubmit =
    fileName !== null &&
    mappedRows.length > 0 &&
    hasNameMapping &&
    rowErrors.length === 0 &&
    !tooManyRows;

  const projectColumnMapped = Object.values(mapping).some((f) => f === "project");
  const ambiguousRowCount = mappedRows.filter((r) => r._projectAmbiguous).length;
  // Rows that *tried* to assign (project_name is set) but didn't resolve and
  // aren't ambiguous → a plain "no match" case (typo, archived, etc.). The
  // preview only shows the first PREVIEW_ROWS, so without this summary an
  // operator could miss every no-match row past row 5.
  const noMatchRows = useMemo(() => {
    if (!projectColumnMapped) return [] as { row: number; value: string }[];
    const out: { row: number; value: string }[] = [];
    for (let i = 0; i < mappedRows.length; i++) {
      const r = mappedRows[i];
      if (r.project_name && !r._projectMatched && !r._projectAmbiguous) {
        out.push({ row: i + 1, value: r.project_name });
      }
    }
    return out;
  }, [mappedRows, projectColumnMapped]);

  // Strip preview-only `_project*` fields before serialization. The server
  // receives only schema fields + the raw `project_name` (resolved server-side).
  const payloadRows = useMemo(() => {
    return mappedRows.map(({ _projectMatched, _projectAmbiguous, ...rest }) => {
      void _projectMatched;
      void _projectAmbiguous;
      return rest;
    });
  }, [mappedRows]);

  return (
    <div className="flex flex-col gap-5" onChange={markBusy}>
      <p className="text-sm text-zinc-500">
        Upload a CSV of people. We&apos;ll guess which columns match our fields from your headers —
        correct anything that&apos;s wrong. Map a <span className="font-medium">Project</span>{" "}
        column to auto-assign each person to a matching project by name (case-insensitive, active
        projects only). No-match values land in the Unassigned pile.
      </p>

      <div className="flex flex-col gap-2">
        <label htmlFor="people-csv-file" className="text-sm font-medium">
          CSV file
        </label>
        <input
          id="people-csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={onFileChange}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-700 dark:file:bg-white dark:file:text-zinc-950 dark:hover:file:bg-zinc-200"
        />
        {fileName && (
          <p className="text-xs text-zinc-500">
            Loaded <span className="font-medium text-zinc-700 dark:text-zinc-300">{fileName}</span>{" "}
            — {rows.length} {rows.length === 1 ? "row" : "rows"}, {headers.length}{" "}
            {headers.length === 1 ? "column" : "columns"}
            {hiddenColumnCount > 0 &&
              ` (${hiddenColumnCount} empty ${hiddenColumnCount === 1 ? "column" : "columns"} hidden)`}
            .
          </p>
        )}
        {parseError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {parseError}
          </p>
        )}
      </div>

      {headers.length > 0 && (
        <>
          <FormField
            label="Column mapping"
            hint="Each CSV column maps to one of our fields, or is skipped."
          >
            <div className="flex flex-col gap-3">
              {headers.map((header) => {
                const sample = rows.find((r) => (r[header] ?? "").trim() !== "")?.[header] ?? "";
                return (
                  <div
                    key={header}
                    className="flex flex-col gap-1.5 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium">{header}</span>
                      <select
                        aria-label={`Map CSV column "${header}" to a field`}
                        value={mapping[header] ?? "ignore"}
                        onChange={(e) =>
                          updateMapping(header, e.target.value as PersonField | "ignore")
                        }
                        className={`${inputClass} max-w-[170px]`}
                      >
                        {FIELD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {sample && (
                      <p className="truncate text-xs text-zinc-500">
                        Sample: <span className="font-mono">{sample}</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </FormField>

          <FormField
            label={`Preview (first ${Math.min(PREVIEW_ROWS, mappedRows.length)} of ${mappedRows.length})`}
            hint="How each row will be imported."
          >
            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-left dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Employee #</th>
                    <th className="px-3 py-2 font-medium">Position</th>
                    <th className="px-3 py-2 font-medium">Phone</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                      <td className="px-3 py-2">
                        {row.name || <em className="text-zinc-400">(empty)</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.employee_number || <em className="text-zinc-400">—</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.position || <em className="text-zinc-400">—</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.phone || <em className="text-zinc-400">—</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.notes || <em className="text-zinc-400">—</em>}
                      </td>
                      <td className="px-3 py-2">
                        {!projectColumnMapped ? (
                          <em className="text-zinc-400">—</em>
                        ) : row._projectMatched ? (
                          <span>
                            {row._projectMatched}{" "}
                            <span className="text-green-600 dark:text-green-400">✓</span>
                          </span>
                        ) : row._projectAmbiguous ? (
                          <em className="text-amber-700 dark:text-amber-400">
                            {row.project_name} — ambiguous (multiple projects match)
                          </em>
                        ) : (
                          <em className="text-amber-700 dark:text-amber-400">
                            {row.project_name ? `${row.project_name} — unassigned` : "— unassigned"}
                          </em>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormField>

          {!hasNameMapping && (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              Map one column to <span className="font-medium">Name</span> to continue — people need
              a name.
            </p>
          )}

          {tooManyRows && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {mappedRows.length} rows exceeds the {MAX_ROWS}-row limit. Split your file and try
              again.
            </p>
          )}

          {ambiguousRowCount > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              {ambiguousRowCount} {ambiguousRowCount === 1 ? "row matches" : "rows match"} a project
              name that&apos;s shared by multiple active projects. Those people will land Unassigned
              — rename one of the duplicate projects to make the match unambiguous.
            </p>
          )}

          {noMatchRows.length > 0 && (
            <details className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950">
              <summary className="cursor-pointer text-sm font-medium text-amber-800 dark:text-amber-200">
                {noMatchRows.length}{" "}
                {noMatchRows.length === 1
                  ? "row's project value doesn't"
                  : "rows' project values don't"}{" "}
                match an active project — those people will land Unassigned
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-amber-800 dark:text-amber-200">
                {noMatchRows.slice(0, 20).map((m) => (
                  <li key={m.row}>
                    Row {m.row}: <span className="font-mono">{m.value}</span>
                  </li>
                ))}
                {noMatchRows.length > 20 && (
                  <li className="text-xs italic">…and {noMatchRows.length - 20} more.</li>
                )}
              </ul>
            </details>
          )}

          {rowErrors.length > 0 && (
            <details className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-800 dark:bg-red-950">
              <summary className="cursor-pointer text-sm font-medium text-red-800 dark:text-red-200">
                {rowErrors.length} {rowErrors.length === 1 ? "row has" : "rows have"} errors
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-red-800 dark:text-red-200">
                {rowErrors.slice(0, 20).map((err) => (
                  <li key={err.row}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
                {rowErrors.length > 20 && (
                  <li className="text-xs italic">…and {rowErrors.length - 20} more.</li>
                )}
              </ul>
            </details>
          )}

          <form action={formAction} className="flex flex-col gap-3">
            <FormErrorBanner state={state} />
            <input type="hidden" name="rows" value={JSON.stringify(payloadRows)} />
            <SubmitButton
              label={`Import ${mappedRows.length} ${mappedRows.length === 1 ? "row" : "rows"}`}
              pendingLabel="Importing…"
              disabled={!canSubmit}
            />
          </form>
        </>
      )}
    </div>
  );
}
