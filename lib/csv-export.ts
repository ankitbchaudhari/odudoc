// Minimal CSV builder.
//
// Used by every /api/admin/reports/* route to turn an array of rows
// into a downloadable .csv. RFC 4180-ish: comma-separated, fields
// containing comma / quote / newline are wrapped in double quotes
// with embedded quotes doubled. Excel-compatible because the BOM is
// included so Indian / European Excel installs render unicode + the
// rupee glyph correctly.

export interface CsvColumn<T> {
  key: string;
  label: string;
  /** Optional accessor — defaults to row[key]. Useful for derived
   *  columns (e.g. "Full name" from first + last). */
  get?: (row: T) => unknown;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => escapeCell(c.get ? c.get(row) : (row as Record<string, unknown>)[c.key]))
        .join(","),
    )
    .join("\r\n");
  return "﻿" + header + "\r\n" + body + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Stamp a YYYYMMDD-HHmm suffix onto a filename root for unique
 *  downloads. Sanitised because some browsers reject filenames with
 *  colons. */
export function timestampedFilename(root: string, ext = "csv"): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${root}-${stamp}.${ext}`;
}
