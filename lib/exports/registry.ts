// Resource registry for the Universal Download Engine.
//
// Each entry maps an export "type" (e.g. "consultations", "doctors")
// to a server-side fetcher that returns the rows + column definitions
// for both formats. Adding a new exportable resource = adding one
// entry here — the API route, the audit log, and the front-end
// download button all pick it up automatically.

import type { Session } from "next-auth";
import type { PdfTableColumn } from "./pdf";
import type { ExcelColumn } from "./excel";

export interface ExportContext {
  /** NextAuth session of the user requesting the export. Use this to
   *  enforce role-based scoping (V4 §2.1 bullet 6 — staff can only
   *  download data within their permission scope). */
  session: Session;
  /** Query-string filters serialised by the front end. */
  filters: Record<string, string>;
}

export interface ExportPayload {
  /** Report title shown on the PDF header + Excel tab name. */
  title: string;
  /** Hospital / tenant name. Defaults to "OduDoc Platform" for super-admin
   *  exports. */
  hospitalName?: string;
  /** Human-readable summary of the active filters. */
  filterSummary?: string;
  /** PDF column definitions. */
  pdfColumns: PdfTableColumn[];
  /** Excel column definitions. */
  excelColumns: ExcelColumn[];
  /** Rows to export. */
  rows: Record<string, unknown>[];
  /** Tenant ID for the audit log. */
  tenantId?: string;
}

export interface ExportHandler {
  /** Roles that can run this export. */
  allowedRoles: Array<"admin" | "doctor" | "patient" | "staff" | "pharmacist" | "vendor" | "hr" | "support">;
  /** Server-side fetcher — returns rows + column defs. Must enforce
   *  per-tenant / per-user scope based on ctx.session. */
  fetch: (ctx: ExportContext) => Promise<ExportPayload>;
}

// Resource handlers register themselves here. Centralising the
// registry rather than scattering exports across each store keeps
// the audit trail consistent and makes "what can be exported and
// by whom" greppable in one place.
export const EXPORTS: Record<string, ExportHandler> = {};

export function registerExport(type: string, handler: ExportHandler) {
  EXPORTS[type] = handler;
}
