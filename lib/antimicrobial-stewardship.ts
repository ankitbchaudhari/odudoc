// Antimicrobial stewardship workflow. Spec v6.0 §7 Quality.
//
// Restricted antibiotic prescription needs:
//   1. Indication captured.
//   2. ID consultant approval within 72 h (else the order auto-
//      stops at the pharmacy counter).
//   3. Culture-sensitivity result attached if available.
//   4. De-escalation review at 48 h.
//
// MVP scope: data model + approval request/response + 48h/72h
// deadline tracking. Anti-MIC test escalation if MIC outside the
// expected band is a separate add-on hooking into lab results.

import { bindPersistentArray } from "./persistent-array";

/** Tiered restriction. T1 = unrestricted, T2 = needs indication,
 *  T3 = needs ID consultant approval, T4 = ICU/onco only. */
export type RestrictionTier = "T1" | "T2" | "T3" | "T4";

export const RESTRICTED_FORMULARY: Record<string, RestrictionTier> = {
  // T3 — needs ID approval
  meropenem: "T3",
  imipenem: "T3",
  vancomycin: "T3",
  linezolid: "T3",
  daptomycin: "T3",
  tigecycline: "T3",
  caspofungin: "T3",
  voriconazole: "T3",
  // T4 — ICU/onco only
  colistin: "T4",
  ceftazidime_avibactam: "T4",
  cefiderocol: "T4",
  ceftolozane_tazobactam: "T4",
  polymyxin_b: "T4",
  amphotericin_b_liposomal: "T4",
  // T2 — indication required (broad-spectrum but not restricted)
  piperacillin_tazobactam: "T2",
  cefepime: "T2",
  ciprofloxacin: "T2",
  levofloxacin: "T2",
  amikacin: "T2",
};

export type AmsStatus =
  | "pending_approval"
  | "approved"
  | "denied"
  | "expired"
  | "withdrawn"
  | "de_escalated";

export interface AmsRequest {
  id: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  drug: string;
  tier: RestrictionTier;
  /** Why this antibiotic was chosen. */
  indication: string;
  /** Culture results attached if any. */
  cultureRef?: string;
  /** Requesting doctor. */
  doctorId: string;
  doctorName: string;
  /** ID consultant approval (T3/T4 only). */
  approverEmail?: string;
  approverName?: string;
  approvalNote?: string;
  status: AmsStatus;
  /** When the approval window expires (72h from request). */
  approvalDeadline?: string;
  /** When de-escalation is due (48h from approval). */
  deEscalationDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

const requests: AmsRequest[] = [];
const { hydrate, flush } = bindPersistentArray<AmsRequest>(
  "ams_requests",
  requests,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function requestAms(input: Omit<AmsRequest, "id" | "tier" | "status" | "approvalDeadline" | "deEscalationDeadline" | "createdAt" | "updatedAt">): AmsRequest | { error: string } {
  const tier = RESTRICTED_FORMULARY[input.drug.toLowerCase()] || "T1";
  if (tier === "T1") {
    return { error: "Drug is unrestricted — no AMS approval needed." };
  }
  if (!input.indication || input.indication.trim().length < 10) {
    return { error: "Indication (≥ 10 chars) is required for restricted antibiotics." };
  }
  const at = new Date().toISOString();
  const approvalDeadline = tier === "T3" || tier === "T4"
    ? new Date(Date.now() + 72 * 3600 * 1000).toISOString()
    : undefined;
  const r: AmsRequest = {
    id: id("ams"),
    tier,
    status: tier === "T2" ? "approved" : "pending_approval", // T2 auto-approves with indication
    approvalDeadline,
    createdAt: at,
    updatedAt: at,
    ...input,
  };
  requests.unshift(r);
  flush();
  return r;
}

export function approveAms(requestId: string, approver: { email: string; name: string; note?: string }): AmsRequest | null {
  const r = requests.find((x) => x.id === requestId);
  if (!r || r.status !== "pending_approval") return null;
  r.status = "approved";
  r.approverEmail = approver.email;
  r.approverName = approver.name;
  r.approvalNote = approver.note;
  r.deEscalationDeadline = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  r.updatedAt = new Date().toISOString();
  flush();
  return r;
}

export function denyAms(requestId: string, approver: { email: string; name: string; note: string }): AmsRequest | null {
  const r = requests.find((x) => x.id === requestId);
  if (!r) return null;
  r.status = "denied";
  r.approverEmail = approver.email;
  r.approverName = approver.name;
  r.approvalNote = approver.note;
  r.updatedAt = new Date().toISOString();
  flush();
  return r;
}

export function recordDeEscalation(requestId: string, note?: string): AmsRequest | null {
  const r = requests.find((x) => x.id === requestId);
  if (!r || r.status !== "approved") return null;
  r.status = "de_escalated";
  r.approvalNote = (r.approvalNote ? r.approvalNote + " | " : "") + (note || "De-escalation completed");
  r.updatedAt = new Date().toISOString();
  flush();
  return r;
}

/** Auto-expire any pending approvals past their deadline. Cron entry. */
export function tickExpiry(now: number = Date.now()): number {
  let expired = 0;
  for (const r of requests) {
    if (r.status === "pending_approval" && r.approvalDeadline && new Date(r.approvalDeadline).getTime() < now) {
      r.status = "expired";
      r.updatedAt = new Date(now).toISOString();
      expired++;
    }
  }
  if (expired) flush();
  return expired;
}

export function listRequests(filter: { organizationId?: string; status?: AmsStatus } = {}): AmsRequest[] {
  let list = [...requests];
  if (filter.organizationId) list = list.filter((r) => r.organizationId === filter.organizationId);
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  return list;
}
