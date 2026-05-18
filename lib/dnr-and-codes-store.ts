// DNR registry + Code Blue / Code Pink activation log. Spec v6.0 §4
// (Clinical operations) + §31 (Vitals & EWS triggering codes).
//
// DNR (Do Not Resuscitate) is patient-level. When an order is being
// placed (intubation, ACLS drug, defibrillation) the EMR checks the
// registry and blocks the order if the patient has an active DNR
// matching its scope — with a confirm-override path that records
// who broke the rule and why (rarely justified clinically; usually
// a medication error).
//
// Code activations are time-stamped events. Every page/swipe on a
// Code Blue button creates a new row; the response team is paged
// via the 5-level notification escalation (v6.0 §32, lib/notifications).

import { bindPersistentArray } from "./persistent-array";

export type DnrScope = "full_code" | "no_cpr" | "no_intubation" | "comfort_care_only";

export interface DnrOrder {
  id: string;
  patientEmail: string;
  patientName: string;
  /** Tenant scope. */
  organizationId: string;
  scope: DnrScope;
  /** Doctor who placed the order. */
  doctorId: string;
  doctorName: string;
  /** Witness — required for legally binding DNRs. */
  witnessName?: string;
  /** Patient or guardian who consented. */
  consentedBy: string;
  consentedAt: string;
  /** Optional family meeting note. */
  note?: string;
  /** When this DNR is no longer in effect. */
  revokedAt?: string;
  revokedBy?: string;
  active: boolean;
  createdAt: string;
}

export type CodeKind = "code_blue" | "code_pink" | "code_red" | "code_silver";

export interface CodeActivation {
  id: string;
  kind: CodeKind;
  organizationId: string;
  /** Location — "ICU Bed 3", "OPD Reception", "Ward 4". */
  location: string;
  /** Patient (when known — Code Pink + Silver usually unknown). */
  patientEmail?: string;
  patientName?: string;
  /** Who activated. */
  activatedBy: string;
  activatedAt: string;
  /** When team arrived / response started. */
  respondedAt?: string;
  /** Response details captured during the debrief. */
  outcome?: "rosc" | "deceased" | "false_alarm" | "transferred" | "other";
  notes?: string;
}

const dnrs: DnrOrder[] = [];
const codes: CodeActivation[] = [];

const dHy = bindPersistentArray<DnrOrder>("dnr_orders", dnrs, () => []);
const cHy = bindPersistentArray<CodeActivation>("code_activations", codes, () => []);
await dHy.hydrate();
await cHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── DNR ──────────────────────────────────────────────────────────
export function placeDnr(input: Omit<DnrOrder, "id" | "active" | "createdAt">): DnrOrder {
  const at = new Date().toISOString();
  const order: DnrOrder = { id: id("dnr"), active: true, createdAt: at, ...input };
  dnrs.unshift(order);
  dHy.flush();
  return order;
}

export function revokeDnr(dnrId: string, revokedBy: string): DnrOrder | null {
  const o = dnrs.find((x) => x.id === dnrId);
  if (!o) return null;
  o.active = false;
  o.revokedAt = new Date().toISOString();
  o.revokedBy = revokedBy;
  dHy.flush();
  return o;
}

export function findActiveDnr(patientEmail: string): DnrOrder | null {
  return dnrs.find((o) => o.patientEmail.toLowerCase() === patientEmail.toLowerCase() && o.active) || null;
}

/** True iff the patient has a DNR that should block the given
 *  order intent. Callers pass an intent token; we map it to scope. */
export function isOrderBlockedByDnr(patientEmail: string, intent: "cpr" | "intubation" | "vasopressor" | "comfort_only_violation"): { blocked: boolean; reason?: string; order?: DnrOrder } {
  const order = findActiveDnr(patientEmail);
  if (!order) return { blocked: false };
  if (order.scope === "full_code") return { blocked: false };
  if (intent === "cpr" && (order.scope === "no_cpr" || order.scope === "comfort_care_only")) {
    return { blocked: true, reason: `Patient is ${order.scope.replace(/_/g, " ")}.`, order };
  }
  if (intent === "intubation" && (order.scope === "no_intubation" || order.scope === "comfort_care_only")) {
    return { blocked: true, reason: `Patient is ${order.scope.replace(/_/g, " ")}.`, order };
  }
  if (intent === "comfort_only_violation" && order.scope === "comfort_care_only") {
    return { blocked: true, reason: "Patient is comfort-care only.", order };
  }
  if (intent === "vasopressor" && order.scope === "comfort_care_only") {
    return { blocked: true, reason: "Patient is comfort-care only.", order };
  }
  return { blocked: false };
}

// ── Codes ────────────────────────────────────────────────────────
export function activateCode(input: Omit<CodeActivation, "id" | "activatedAt">): CodeActivation {
  const e: CodeActivation = {
    id: id("code"),
    activatedAt: new Date().toISOString(),
    ...input,
  };
  codes.unshift(e);
  cHy.flush();
  return e;
}

export function markCodeResponded(codeId: string): CodeActivation | null {
  const e = codes.find((x) => x.id === codeId);
  if (!e) return null;
  e.respondedAt = new Date().toISOString();
  cHy.flush();
  return e;
}

export function closeCode(codeId: string, outcome: CodeActivation["outcome"], notes?: string): CodeActivation | null {
  const e = codes.find((x) => x.id === codeId);
  if (!e) return null;
  e.outcome = outcome;
  e.notes = notes;
  cHy.flush();
  return e;
}

export function listCodes(orgId?: string, opts: { activeOnly?: boolean } = {}): CodeActivation[] {
  let list = orgId ? codes.filter((c) => c.organizationId === orgId) : [...codes];
  if (opts.activeOnly) list = list.filter((c) => !c.outcome);
  return list.sort((a, b) => b.activatedAt.localeCompare(a.activatedAt));
}
