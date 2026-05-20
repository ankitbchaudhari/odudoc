// Audit-log helper for the Universal Download Engine — V4 §2.1 bullet 7
// requires "All downloads are logged in the immutable audit log (who
// downloaded what and when)."
//
// We piggy-back on the existing immutable audit-envelope chain in
// lib/audit-envelope.ts where available; otherwise fall back to a
// plain log line so the export still works on environments that
// haven't enabled the chain yet.

import { log } from "@/lib/log";

export interface ExportAuditEntry {
  /** User who triggered the export. */
  userEmail: string;
  /** Role at time of export — staff scope is enforced upstream. */
  userRole: string;
  /** Resource that was exported (e.g. "consultations", "doctors"). */
  resource: string;
  /** Format requested. */
  format: "pdf" | "excel";
  /** Number of rows in the exported dataset. */
  rowCount: number;
  /** Active filters at time of export — kept for forensic replay. */
  filters?: Record<string, unknown>;
  /** SHA-256 of the dataset, matches the hash embedded in the file. */
  datasetHash: string;
  /** Hospital / tenant the data belongs to. */
  tenantId?: string;
  /** Optional human-readable filter summary as shown on the PDF. */
  filterSummary?: string;
}

/** Record an export event. Best-effort — failures must not block the
 *  download. */
export async function logExport(entry: ExportAuditEntry): Promise<void> {
  try {
    // The persistent audit chain is the preferred sink. If it's not
    // wired up we still produce a structured log line.
    const envelope = {
      kind: "export",
      at: new Date().toISOString(),
      userEmail: entry.userEmail,
      userRole: entry.userRole,
      resource: entry.resource,
      format: entry.format,
      rowCount: entry.rowCount,
      datasetHash: entry.datasetHash,
      tenantId: entry.tenantId,
      filterSummary: entry.filterSummary,
      filters: entry.filters,
    };

    // Try the audit-envelope chain if available; ignore import failure
    // so this module doesn't take a hard dependency on a module that
    // may not be present in every environment.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import("@/lib/audit-envelope").catch(() => null)) as any;
      if (mod && typeof mod.appendAuditEnvelope === "function") {
        await mod.appendAuditEnvelope("export", envelope);
        return;
      }
    } catch { /* fall through to log line */ }

    log.info("export", envelope);
  } catch (err) {
    log.error("export-audit-failed", err);
  }
}
