// Convenience helper for writing to hospital audit-log-store from API routes.
// Never throws — if the audit write fails we log and move on.

import { createEntry, type AuditAction, type Severity } from "./hospital/audit-log-store";
import type { TenantContext } from "./tenant";

export interface AuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  severity?: Severity;
  module?: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  notes?: string;
}

export function audit(ctx: TenantContext, input: AuditInput): void {
  try {
    const orgId = ctx.organization?.id;
    if (!orgId) return;
    createEntry(orgId, {
      actorId: ctx.userId || undefined,
      actorName: ctx.email || "system",
      actorRole: ctx.role || undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      severity: input.severity || "info",
      module: input.module,
      before: input.before !== undefined ? JSON.stringify(input.before) : undefined,
      after: input.after !== undefined ? JSON.stringify(input.after) : undefined,
      reason: input.reason,
      notes: input.notes,
    });
  } catch (e) {
    void import("./log").then(({ log }) => log.error("audit.write_failed", e));
  }
}
