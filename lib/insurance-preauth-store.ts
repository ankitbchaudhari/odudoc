// Insurance pre-authorization workflow. Spec v6.0 §16 + admin/cashless.
//
// Flow: provider submits a pre-auth request to the patient's TPA →
// TPA reviews (queries optional) → approval / denial / partial →
// case proceeds (or appeal) → final bill submitted as a claim
// against the approved pre-auth.
//
// State machine:
//   draft → submitted → under_review → approved | denied | partial
//   → claim_submitted → settled | denied | appealed
//
// MVP scope: the full lifecycle as a persistent record + a simple
// admin-side queue. TPA portal integration (HCFA-1500 push, EHR-AS
// connector) is stubbed — submission writes a payload + a pretend
// reference id; status updates come back via PATCH from the TPA
// adapter (cron) or manually from the admin queue.

import { bindPersistentArray } from "./persistent-array";

export type PreAuthStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "query_raised"
  | "approved"
  | "partial"
  | "denied"
  | "claim_submitted"
  | "settled"
  | "appealed";

export interface PreAuthRequest {
  id: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  /** TPA / insurer the patient is empanelled with. */
  tpaId: string;
  /** Insurer policy number. */
  policyNumber: string;
  /** Type of procedure — outpatient / inpatient / surgery / emergency. */
  encounterType: "opd" | "ipd" | "surgery" | "emergency";
  /** Brief clinical justification. */
  diagnosis: string;
  /** ICD-10 + procedure codes. */
  diagnosisCodes: string[];
  procedureCodes: string[];
  /** Estimated cost in INR (or pod currency). */
  estimatedAmount: number;
  currency: string;
  /** Doctor placing the request. */
  doctorId: string;
  doctorName: string;
  status: PreAuthStatus;
  /** Approved amount (set on approval / partial). */
  approvedAmount?: number;
  /** TPA query (when status = query_raised). */
  query?: string;
  /** TPA reference number once submitted. */
  tpaRef?: string;
  /** Free-text history shown in the case timeline. */
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  createdAt: string;
  updatedAt: string;
}

const requests: PreAuthRequest[] = [];
const { hydrate, flush } = bindPersistentArray<PreAuthRequest>(
  "insurance_preauth_requests",
  requests,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function appendHistory(req: PreAuthRequest, actor: string, event: string, detail?: string) {
  req.history.push({ at: new Date().toISOString(), actor, event, detail });
  req.updatedAt = req.history[req.history.length - 1].at;
}

export function createDraft(input: Omit<PreAuthRequest, "id" | "status" | "history" | "createdAt" | "updatedAt">): PreAuthRequest {
  const at = new Date().toISOString();
  const r: PreAuthRequest = {
    id: id("pa"),
    status: "draft",
    history: [{ at, actor: input.doctorName, event: "draft_created" }],
    createdAt: at,
    updatedAt: at,
    ...input,
  };
  requests.unshift(r);
  flush();
  return r;
}

export function submit(reqId: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r || r.status !== "draft") return null;
  r.status = "submitted";
  r.tpaRef = id("tpa").toUpperCase();
  appendHistory(r, actor, "submitted_to_tpa", `Ref ${r.tpaRef}`);
  flush();
  return r;
}

export function markUnderReview(reqId: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r || r.status !== "submitted") return null;
  r.status = "under_review";
  appendHistory(r, actor, "under_review");
  flush();
  return r;
}

export function raiseQuery(reqId: string, query: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r) return null;
  r.status = "query_raised";
  r.query = query;
  appendHistory(r, actor, "query_raised", query);
  flush();
  return r;
}

export function approve(reqId: string, approvedAmount: number, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r) return null;
  r.approvedAmount = approvedAmount;
  r.status = approvedAmount >= r.estimatedAmount ? "approved" : "partial";
  appendHistory(r, actor, r.status === "partial" ? "partial_approval" : "approved", `${approvedAmount} ${r.currency}`);
  flush();
  return r;
}

export function deny(reqId: string, reason: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r) return null;
  r.status = "denied";
  appendHistory(r, actor, "denied", reason);
  flush();
  return r;
}

export function submitClaim(reqId: string, finalAmount: number, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r || (r.status !== "approved" && r.status !== "partial")) return null;
  r.status = "claim_submitted";
  appendHistory(r, actor, "claim_submitted", `Final ${finalAmount} ${r.currency}`);
  flush();
  return r;
}

export function settle(reqId: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r || r.status !== "claim_submitted") return null;
  r.status = "settled";
  appendHistory(r, actor, "settled");
  flush();
  return r;
}

export function appeal(reqId: string, reason: string, actor: string): PreAuthRequest | null {
  const r = requests.find((x) => x.id === reqId);
  if (!r) return null;
  r.status = "appealed";
  appendHistory(r, actor, "appealed", reason);
  flush();
  return r;
}

export function listRequests(filter: { organizationId?: string; patientEmail?: string; status?: PreAuthStatus } = {}): PreAuthRequest[] {
  let list = [...requests];
  if (filter.organizationId) list = list.filter((r) => r.organizationId === filter.organizationId);
  if (filter.patientEmail) list = list.filter((r) => r.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  return list;
}
