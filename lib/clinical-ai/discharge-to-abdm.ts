// Polish glue: when a discharge summary is finalised at a hospital,
// auto-register a care context against the patient's linked ABHA so
// the record is discoverable in ABDM. Idempotent — checks for an
// existing context with the same internalRef before creating.
//
// Caller path: after `synthesizeDischargeSummary` produces the final
// document and the encounter is saved, the caller passes the
// generated summary's id + the patient + the hospital here. We resolve
// the ABHA link, create a draft care-context row, and (when ABDM_MOCK
// is on) immediately register it with the mock NHA gateway.

import { findActiveLink } from "../abdm/abha-store";
import {
  registerContext,
  transitionContext,
  listContextsForOrg,
} from "../abdm/care-context-store";
import { registerCareContext } from "../abdm/mock-nha";

export interface AutoRegisterInput {
  organizationId: string;
  patientUserId: string;
  /** Stable id of the underlying discharge summary record. Used as
   *  internalRef so the same summary doesn't double-register. */
  summaryId: string;
  /** Patient name + admission date for the human-readable title. */
  patientName: string;
  dischargeDate?: string;
  /** Hospital display name for the title. */
  organizationName?: string;
}

export interface AutoRegisterResult {
  status: "registered" | "skipped_no_abha" | "skipped_already" | "registered_offline";
  contextId?: string;
  abhaNumber?: string;
}

export async function autoRegisterDischargeSummary(
  input: AutoRegisterInput,
): Promise<AutoRegisterResult> {
  const link = findActiveLink(input.patientUserId);
  if (!link) return { status: "skipped_no_abha" };

  // Idempotency check.
  const existing = listContextsForOrg(input.organizationId).find(
    (c) => c.internalRef === input.summaryId && c.patientUserId === input.patientUserId,
  );
  if (existing) {
    return { status: "skipped_already", contextId: existing.id, abhaNumber: link.abhaNumber };
  }

  const display = `Discharge summary — ${input.patientName} at ${input.organizationName || "OduDoc"}${input.dischargeDate ? `, ${input.dischargeDate}` : ""}`;
  const draft = registerContext({
    organizationId: input.organizationId,
    abhaNumber: link.abhaNumber,
    patientUserId: input.patientUserId,
    type: "DischargeSummary",
    display,
    internalRef: input.summaryId,
    recordDate: input.dischargeDate,
    status: "draft",
  });

  // Push to (mock) NHA. If the gateway is offline we leave the row in
  // draft state; an ops cron can retry later.
  try {
    const r = await registerCareContext({
      abhaNumber: link.abhaNumber,
      patientId: input.patientUserId,
      type: "DischargeSummary",
      display,
    });
    if (r.ok && r.nhaContextId) {
      transitionContext(draft.id, "registered", r.nhaContextId);
      return { status: "registered", contextId: draft.id, abhaNumber: link.abhaNumber };
    }
  } catch { /* fall through to offline state */ }

  return { status: "registered_offline", contextId: draft.id, abhaNumber: link.abhaNumber };
}
