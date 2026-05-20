// Branded PDF export — V4 §2 of the Master Specification.
//
// Every PDF generated through this helper carries the V4 brand header
// (logo + hospital name + report title), the active filter summary,
// the data table itself, a footer with timestamp + page numbers, AND
// a SHA-256 hash + QR code that resolves to https://odudoc.com/verify/
// for blockchain-style tamper-evident verification (V4 §2.1 bullet 4).
//
// This is the ONLY place that should construct an OduDoc PDF. Every
// export route in /api/exports/* and every server-side document
// generator (prescription, discharge summary, lab report, invoice)
// builds on top of this primitive. Drift = brand inconsistency.

import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { createHash } from "crypto";
import { BRAND, COLORS } from "@/lib/brand";

export interface PdfTableColumn {
  /** Header label drawn at the top of the column. */
  header: string;
  /** Column width as a fraction of total table width (must sum to 1). */
  width: number;
  /** Cell renderer — defaults to String(row[header]) if omitted. */
  render?: (row: Record<string, unknown>) => string;
  /** Right-align numeric columns. */
  align?: "left" | "right" | "center";
}

export interface PdfReportOptions {
  /** Top-of-page title — e.g. "Daily Revenue Report". */
  title: string;
  /** Hospital name shown next to the OduDoc logo. Pass "OduDoc Platform"
   *  for super-admin exports that aren't scoped to a single tenant. */
  hospitalName: string;
  /** Free-form summary of the filters used to produce this report,
   *  e.g. "Date range: 01–31 Mar 2026 · Department: Cardiology". */
  filterSummary?: string;
  /** Column definitions. */
  columns: PdfTableColumn[];
  /** Rows to render. Large datasets (>5000) should be paginated by the
   *  caller and emitted in chunks — this helper renders everything you
   *  pass in into memory before flushing. */
  rows: Record<string, unknown>[];
  /** Optional disclosure line shown above the QR. */
  disclosure?: string;
  /** Override the orientation. Defaults to portrait. */
  orientation?: "portrait" | "landscape";
}

/**
 * Render a branded PDF report and return the raw bytes.
 *
 * Layout (V4 §1.4):
 *   ┌──────────────────────────────────────────────┐
 *   │ [Logo] OduDoc · <Hospital Name>          ... │
 *   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
 *   │ <Report Title>                               │
 *   │ <Filter Summary>            Generated: time  │
 *   │ ─────────────────────────────────────────── │
 *   │ <Table>                                      │
 *   │   ...                                        │
 *   │ ─────────────────────────────────────────── │
 *   │ SHA-256: <hash>                              │
 *   │ Verify: odudoc.com/verify/<hash>      [QR]   │
 *   │ Page 1 of N · "Every Patient. Every          │
 *   │   Provider. Everywhere."                     │
 *   └──────────────────────────────────────────────┘
 */
export async function renderBrandedPdf(opts: PdfReportOptions): Promise<Buffer> {
  // Hash is computed over the actual data payload (not the PDF bytes),
  // so re-rendering with the same filters produces the same hash. This
  // lets a verifier prove "this dataset existed at this time" without
  // needing the exact PDF file.
  const dataHash = createHash("sha256")
    .update(JSON.stringify({
      title: opts.title,
      hospitalName: opts.hospitalName,
      filterSummary: opts.filterSummary || "",
      columns: opts.columns.map((c) => c.header),
      rows: opts.rows,
    }))
    .digest("hex");

  const verifyUrl = `https://www.odudoc.com/verify/${dataHash}`;
  const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, {
    margin: 0,
    width: 120,
    color: { dark: COLORS.primaryTeal, light: "#ffffff" },
  });
  const qrPngBuf = Buffer.from(qrPngDataUrl.split(",")[1], "base64");

  const doc = new PDFDocument({
    size: "A4",
    layout: opts.orientation || "portrait",
    margin: 40,
    bufferPages: true, // so we can write "Page X of N" after we know N
    info: {
      Title: opts.title,
      Author: opts.hospitalName,
      Producer: `${BRAND.name} — Universal Download Engine`,
      Subject: opts.filterSummary || "",
    },
  });

  // Collect into a single buffer.
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c as Buffer));
  const finished = new Promise<void>((resolve) => doc.on("end", resolve));

  // ── Header ────────────────────────────────────────────────────
  renderHeader(doc, opts.hospitalName, opts.title);

  // ── Filter summary + timestamp ────────────────────────────────
  doc.moveDown(0.5);
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  if (opts.filterSummary) {
    doc.fontSize(9).fillColor(COLORS.neutralGrey).text(opts.filterSummary, {
      width: doc.page.width - 80 - 100,
      continued: false,
    });
  }
  doc.fontSize(9).fillColor(COLORS.neutralGrey).text(
    `Generated: ${stamp}`,
    doc.page.width - 200,
    doc.y - 12,
    { width: 160, align: "right" },
  );
  doc.moveDown(0.5);
  hr(doc);

  // ── Table ─────────────────────────────────────────────────────
  renderTable(doc, opts.columns, opts.rows);

  // ── Footer (hash + QR + page numbers) ─────────────────────────
  const totalPages = doc.bufferedPageRange().count;
  for (let i = 0; i < totalPages; i++) {
    doc.switchToPage(i);
    renderFooter(
      doc,
      { hash: dataHash, qr: qrPngBuf, verifyUrl, disclosure: opts.disclosure },
      i + 1,
      totalPages,
    );
  }

  doc.end();
  await finished;
  return Buffer.concat(chunks);
}

// ── Header ────────────────────────────────────────────────────────
function renderHeader(doc: PDFKit.PDFDocument, hospitalName: string, title: string) {
  // OduDoc logo — rounded teal square + white cross, drawn in vector
  // (matches components/Logo.tsx proportions exactly).
  const x = 40, y = 35;
  doc.save();
  doc.roundedRect(x, y, 28, 28, 8).fill(COLORS.primaryTeal);
  // Vertical bar of the cross
  doc.fillColor("#ffffff").rect(x + 11, y + 6, 6, 16).fill();
  // Horizontal bar
  doc.rect(x + 6, y + 11, 16, 6).fill();
  doc.restore();

  // Wordmark + hospital name
  doc
    .fontSize(16)
    .fillColor(COLORS.primaryTeal)
    .font("Helvetica-Bold")
    .text(BRAND.name, x + 36, y + 3, { lineBreak: false });
  doc
    .fontSize(10)
    .fillColor(COLORS.neutralGrey)
    .font("Helvetica")
    .text(hospitalName, x + 36, y + 20, { lineBreak: false });

  // Title — right-aligned, bold, navy
  doc
    .fontSize(14)
    .fillColor(COLORS.secondaryNavy)
    .font("Helvetica-Bold")
    .text(title, 40, y + 6, { width: doc.page.width - 80, align: "right" });

  // Brand bar
  doc.moveTo(40, y + 38).lineTo(doc.page.width - 40, y + 38).strokeColor(COLORS.primaryTeal).lineWidth(1.5).stroke();
  doc.y = y + 50;
  doc.x = 40;
}

// ── Horizontal rule ───────────────────────────────────────────────
function hr(doc: PDFKit.PDFDocument) {
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).strokeColor("#E5E7EB").lineWidth(0.5).stroke();
  doc.moveDown(0.5);
}

// ── Table ─────────────────────────────────────────────────────────
function renderTable(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn[],
  rows: Record<string, unknown>[],
) {
  const tableX = 40;
  const tableWidth = doc.page.width - 80;
  const colWidths = columns.map((c) => c.width * tableWidth);

  // Column headers
  const headerY = doc.y;
  doc.rect(tableX, headerY - 2, tableWidth, 18).fill(COLORS.primaryTeal);
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
  let cx = tableX + 4;
  columns.forEach((col, i) => {
    doc.text(col.header, cx, headerY + 2, {
      width: colWidths[i] - 8,
      align: col.align || "left",
      lineBreak: false,
    });
    cx += colWidths[i];
  });
  doc.y = headerY + 18;

  // Body rows
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.neutralGrey);
  let rowIndex = 0;
  for (const row of rows) {
    // Page break if we'd run off the bottom (leave 80px for footer).
    if (doc.y + 16 > doc.page.height - 80) {
      doc.addPage();
      doc.y = 90;
      // Repeat the header on the new page.
      const ny = doc.y;
      doc.rect(tableX, ny - 2, tableWidth, 18).fill(COLORS.primaryTeal);
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      let cx2 = tableX + 4;
      columns.forEach((col, i) => {
        doc.text(col.header, cx2, ny + 2, {
          width: colWidths[i] - 8,
          align: col.align || "left",
          lineBreak: false,
        });
        cx2 += colWidths[i];
      });
      doc.y = ny + 18;
      doc.font("Helvetica").fontSize(9).fillColor(COLORS.neutralGrey);
    }

    // Zebra stripe alternate rows for legibility.
    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(tableX, doc.y, tableWidth, 16).fill(COLORS.backgroundLight);
      doc.restore();
    }

    let cx = tableX + 4;
    columns.forEach((col, i) => {
      const text = col.render ? col.render(row) : String(row[col.header] ?? "");
      doc.fillColor(COLORS.neutralGrey).text(text, cx, doc.y + 3, {
        width: colWidths[i] - 8,
        align: col.align || "left",
        lineBreak: false,
        ellipsis: true,
      });
      cx += colWidths[i];
    });
    doc.y += 16;
    rowIndex++;
  }

  if (rows.length === 0) {
    doc.fillColor(COLORS.neutralGrey).text("No rows match the active filters.", tableX, doc.y + 8, {
      width: tableWidth,
      align: "center",
    });
    doc.y += 24;
  }
}

// ── Footer ────────────────────────────────────────────────────────
function renderFooter(
  doc: PDFKit.PDFDocument,
  meta: { hash: string; qr: Buffer; verifyUrl: string; disclosure?: string },
  pageNumber: number,
  totalPages: number,
) {
  const footerY = doc.page.height - 70;
  // Top divider
  doc.moveTo(40, footerY - 6).lineTo(doc.page.width - 40, footerY - 6).strokeColor("#E5E7EB").lineWidth(0.5).stroke();

  // QR code on the right
  const qrX = doc.page.width - 40 - 50;
  doc.image(meta.qr, qrX, footerY - 4, { width: 50, height: 50 });

  // Hash + verify URL on the left
  doc.font("Helvetica").fontSize(7).fillColor(COLORS.neutralGrey);
  doc.text(`SHA-256: ${meta.hash}`, 40, footerY, { width: qrX - 50, lineBreak: false });
  doc.text(`Verify: ${meta.verifyUrl}`, 40, footerY + 10, { width: qrX - 50, lineBreak: false });
  if (meta.disclosure) {
    doc.text(meta.disclosure, 40, footerY + 22, { width: qrX - 50, lineBreak: false });
  }

  // Tagline + page numbers — bottom edge
  doc.fontSize(7).fillColor(COLORS.primaryTeal);
  doc.text(
    `${BRAND.tagline}  ·  Page ${pageNumber} of ${totalPages}`,
    40,
    doc.page.height - 25,
    { width: doc.page.width - 80, align: "center" },
  );
}
