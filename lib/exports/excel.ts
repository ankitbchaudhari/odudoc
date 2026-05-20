// Branded Excel export — V4 §2 of the Master Specification.
//
// Every Excel file produced through this helper carries the V4 brand
// header in the first two rows (logo image + hospital name + report
// title) and the data table below it. The dataset hash matches what
// the PDF export records, so cross-format verification is consistent.
//
// We use exceljs (pure-JS, no native deps) so this works inside Vercel
// serverless functions without any binary bundling.

import ExcelJS from "exceljs";
import { createHash } from "crypto";
import { BRAND, COLORS } from "@/lib/brand";

export interface ExcelColumn {
  /** Header label drawn at the top of the column. */
  header: string;
  /** Column width in Excel character units (~7px). */
  width?: number;
  /** Cell renderer — defaults to row[header]. Return primitive types
   *  (string, number, Date, boolean) so Excel formats them natively. */
  value?: (row: Record<string, unknown>) => string | number | Date | boolean | null;
  /** Number/date format string, e.g. "₹#,##0.00" or "dd-mmm-yyyy". */
  numFmt?: string;
  /** Cell horizontal alignment. */
  align?: "left" | "right" | "center";
}

export interface ExcelReportOptions {
  title: string;
  hospitalName: string;
  filterSummary?: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  /** Worksheet name shown on the tab — max 31 chars. */
  sheetName?: string;
}

/**
 * Render a branded Excel workbook and return the raw bytes.
 *
 * Layout:
 *   Row 1: Hospital name | (blank) | (blank) ... | Title
 *   Row 2: Filter summary | ........... | Generated: <time>
 *   Row 3: (blank)
 *   Row 4: Column headers (teal background, white bold text)
 *   Row 5+: Data rows (alternating background tint)
 *   Last:  Dataset SHA-256 (so cross-format hash matches the PDF)
 */
export async function renderBrandedExcel(opts: ExcelReportOptions): Promise<Buffer> {
  const dataHash = createHash("sha256")
    .update(JSON.stringify({
      title: opts.title,
      hospitalName: opts.hospitalName,
      filterSummary: opts.filterSummary || "",
      columns: opts.columns.map((c) => c.header),
      rows: opts.rows,
    }))
    .digest("hex");

  const wb = new ExcelJS.Workbook();
  wb.creator = `${BRAND.name} — Universal Download Engine`;
  wb.created = new Date();
  wb.title = opts.title;
  wb.subject = opts.filterSummary || "";

  const sheet = wb.addWorksheet(opts.sheetName || opts.title.slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: "portrait" },
    headerFooter: {
      oddFooter: `${BRAND.tagline}\nPage &P of &N`,
    },
  });

  // ── Header rows ─────────────────────────────────────────────
  sheet.getCell("A1").value = `${BRAND.name} · ${opts.hospitalName}`;
  sheet.getCell("A1").font = { bold: true, size: 14, color: { argb: hexToArgb(COLORS.primaryTeal) } };
  const titleCol = String.fromCharCode(65 + Math.max(opts.columns.length - 1, 1));
  sheet.getCell(`${titleCol}1`).value = opts.title;
  sheet.getCell(`${titleCol}1`).font = { bold: true, size: 12, color: { argb: hexToArgb(COLORS.secondaryNavy) } };
  sheet.getCell(`${titleCol}1`).alignment = { horizontal: "right" };

  if (opts.filterSummary) {
    sheet.getCell("A2").value = opts.filterSummary;
    sheet.getCell("A2").font = { size: 10, color: { argb: hexToArgb(COLORS.neutralGrey) } };
  }
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  sheet.getCell(`${titleCol}2`).value = `Generated: ${stamp}`;
  sheet.getCell(`${titleCol}2`).font = { size: 9, color: { argb: hexToArgb(COLORS.neutralGrey) } };
  sheet.getCell(`${titleCol}2`).alignment = { horizontal: "right" };

  // ── Column headers ──────────────────────────────────────────
  const headerRow = sheet.getRow(4);
  opts.columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: hexToArgb(COLORS.primaryTeal) },
    };
    cell.alignment = { horizontal: col.align || "left", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: hexToArgb(COLORS.primaryTeal) } } };
    if (col.width) sheet.getColumn(i + 1).width = col.width;
    else sheet.getColumn(i + 1).width = 18;
  });
  headerRow.height = 22;

  // ── Data rows ───────────────────────────────────────────────
  opts.rows.forEach((row, rIdx) => {
    const r = sheet.getRow(5 + rIdx);
    opts.columns.forEach((col, cIdx) => {
      const cell = r.getCell(cIdx + 1);
      const v = col.value ? col.value(row) : (row[col.header] as string | number | Date | boolean | null | undefined);
      cell.value = v ?? "";
      if (col.numFmt) cell.numFmt = col.numFmt;
      if (col.align) cell.alignment = { horizontal: col.align };
      // Zebra stripe.
      if (rIdx % 2 === 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: hexToArgb(COLORS.backgroundLight) },
        };
      }
    });
  });

  // Freeze the header row so a long table scrolls cleanly.
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  // ── Dataset hash at the bottom (matches the PDF export) ─────
  const hashRow = sheet.lastRow!.number + 2;
  sheet.getCell(`A${hashRow}`).value = "Dataset SHA-256:";
  sheet.getCell(`A${hashRow}`).font = { bold: true, size: 9, color: { argb: hexToArgb(COLORS.neutralGrey) } };
  sheet.getCell(`B${hashRow}`).value = dataHash;
  sheet.getCell(`B${hashRow}`).font = { size: 9, color: { argb: hexToArgb(COLORS.neutralGrey) }, name: "Courier New" };
  sheet.getCell(`A${hashRow + 1}`).value = "Verify:";
  sheet.getCell(`A${hashRow + 1}`).font = { bold: true, size: 9, color: { argb: hexToArgb(COLORS.neutralGrey) } };
  sheet.getCell(`B${hashRow + 1}`).value = `https://www.odudoc.com/verify/${dataHash}`;
  sheet.getCell(`B${hashRow + 1}`).font = { size: 9, color: { argb: hexToArgb(COLORS.primaryTeal) }, underline: true };

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// exceljs colours are ARGB hex (AARRGGBB), 8 chars. Convert from
// our V4 6-char hex by prefixing FF for full opacity.
function hexToArgb(hex: string): string {
  const clean = hex.replace("#", "").toUpperCase();
  return clean.length === 6 ? `FF${clean}` : clean;
}
