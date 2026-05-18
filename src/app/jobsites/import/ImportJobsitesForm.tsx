"use client";

import Papa, { type ParseResult } from "papaparse";
import { useActionState, useMemo, useState, type ChangeEvent } from "react";

import { FormErrorBanner } from "@/components/FormErrorBanner";
import { FormField, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { ACTION_OK } from "@/lib/action-result";
import {
  JOBSITE_HEADER_SYNONYMS,
  sniffMapping,
  type ColumnMapping,
  type JobsiteField,
} from "@/lib/csv-import-mappings";
import { useRegisterBusyOnce } from "@/lib/page-busy";
import { jobsiteInputSchema } from "@/lib/schemas/jobsite";

import { bulkCreateJobsitesAction } from "../actions";

const FIELD_OPTIONS: ReadonlyArray<{ value: JobsiteField | "ignore"; label: string }> = [
  { value: "ignore", label: "Skip this column" },
  { value: "name", label: "Name" },
  { value: "address", label: "Address" },
  { value: "notes", label: "Notes" },
];

const MAX_FILE_BYTES = 1_000_000; // ~1 MB; CSVs of jobsites should be way under this
const MAX_ROWS = 500; // Mirrors BULK_IMPORT_MAX_ROWS in the server action
const PREVIEW_ROWS = 5;

export function ImportJobsitesForm() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [hiddenColumnCount, setHiddenColumnCount] = useState(0);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping<JobsiteField>>({});
  const [parseError, setParseError] = useState<string | null>(null);
  const [state, formAction] = useActionState(bulkCreateJobsitesAction, ACTION_OK);
  const markBusy = useRegisterBusyOnce();

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
        // Drop columns that are empty in every row. Numbers/Excel/Sheets
        // frequently export trailing blank columns (e.g. Numbers' default
        // 7-column sheet), which papaparse surfaces with auto-named headers
        // like `_1`, `_2`. They clutter the mapping UI with nothing to map.
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
        setMapping(sniffMapping(usefulHeaders, JOBSITE_HEADER_SYNONYMS));
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

  function updateMapping(header: string, field: JobsiteField | "ignore") {
    setMapping((prev) => ({ ...prev, [header]: field }));
  }

  // Map each CSV row to a jobsite-shaped object based on current mappings.
  // Multiple CSV columns mapping to the same target field: last one wins
  // (operator's responsibility to avoid; UI shows what's mapped where).
  const mappedRows = useMemo(() => {
    return rows.map((row) => {
      const out: Record<string, string> = {};
      for (const [header, field] of Object.entries(mapping)) {
        if (field === "ignore") continue;
        out[field] = row[header] ?? "";
      }
      // Default missing optional fields to empty string so safeParse sees a
      // string (nullableTrimmed transforms empty → null on its own).
      return {
        name: out.name ?? "",
        address: out.address ?? "",
        notes: out.notes ?? "",
      };
    });
  }, [rows, mapping]);

  // Run safeParse client-side for instant feedback; the server re-runs the
  // same check on submit as defense in depth.
  const rowErrors = useMemo(() => {
    const errors: { row: number; message: string }[] = [];
    for (let i = 0; i < mappedRows.length; i++) {
      const result = jobsiteInputSchema.safeParse(mappedRows[i]);
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

  return (
    <div className="flex flex-col gap-5" onChange={markBusy}>
      <p className="text-sm text-zinc-500">
        Upload a CSV of jobsites. We&apos;ll guess which columns match our fields from your headers
        — correct anything that&apos;s wrong. All rows must pass validation before the import
        commits.
      </p>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">CSV file</label>
        <input
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
                        value={mapping[header] ?? "ignore"}
                        onChange={(e) =>
                          updateMapping(header, e.target.value as JobsiteField | "ignore")
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
                    <th className="px-3 py-2 font-medium">Address</th>
                    <th className="px-3 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, PREVIEW_ROWS).map((row, i) => (
                    <tr key={i} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                      <td className="px-3 py-2">
                        {row.name || <em className="text-zinc-400">(empty)</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.address || <em className="text-zinc-400">—</em>}
                      </td>
                      <td className="px-3 py-2">
                        {row.notes || <em className="text-zinc-400">—</em>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FormField>

          {!hasNameMapping && (
            <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
              Map one column to <span className="font-medium">Name</span> to continue — jobsites
              need a name.
            </p>
          )}

          {tooManyRows && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {mappedRows.length} rows exceeds the {MAX_ROWS}-row limit. Split your file and try
              again.
            </p>
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
            <input type="hidden" name="rows" value={JSON.stringify(mappedRows)} />
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
