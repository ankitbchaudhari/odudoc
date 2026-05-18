// CAPA (Corrective + Preventive Action) workflow.
// Spec v6.0 §7 Quality + NABH chapter on CAPA.
//
// Every quality finding (incident, mortality review, infection
// surveillance, audit finding) can generate a CAPA. The CAPA has:
//   - Problem statement.
//   - Root cause analysis (5 whys / fishbone categories).
//   - Corrective action (fixes the immediate occurrence).
//   - Preventive action (stops recurrence).
//   - Owner + due date + verification of effectiveness (VoE).
//
// VoE happens 30-90 days after closure — a quality lead reviews
// whether the issue recurred. If it did, the CAPA is reopened.

import { bindPersistentArray } from "./persistent-array";

export type CapaSource =
  | "incident"
  | "mortality_review"
  | "infection_control"
  | "audit_finding"
  | "patient_complaint"
  | "medication_error"
  | "other";

export type CapaStatus =
  | "open"
  | "investigating"
  | "actions_pending"
  | "verifying"
  | "closed"
  | "reopened";

export type RootCauseCategory =
  | "people"          // staff training / competence
  | "process"         // SOP / workflow gap
  | "equipment"       // device / hardware
  | "environment"     // physical / ergonomic
  | "communication"   // handoff / documentation
  | "policy";         // org / regulatory

export interface CapaAction {
  description: string;
  owner: string;
  ownerEmail?: string;
  dueOn: string;
  /** Corrective fixes the immediate issue; preventive blocks
   *  recurrence. */
  kind: "corrective" | "preventive";
  completedAt?: string;
  completedBy?: string;
  evidenceNote?: string;
}

export interface CapaRecord {
  id: string;
  organizationId: string;
  /** Reference to the source row — links back to incident-store,
   *  mm-review-store, etc. */
  sourceKind: CapaSource;
  sourceRef?: string;
  /** Plain-language problem description. */
  problem: string;
  /** Optional severity hint surfaced from the source. */
  severity?: "low" | "medium" | "high" | "critical";
  /** RCA — 5 whys captured as a list + chosen category. */
  rca?: { whys: string[]; category: RootCauseCategory };
  actions: CapaAction[];
  status: CapaStatus;
  /** Verification of effectiveness — 30-90d after closure. */
  voeDueOn?: string;
  voeDoneAt?: string;
  voeDoneBy?: string;
  voeRecurred?: boolean;
  voeNote?: string;
  /** Append-only history. */
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  openedAt: string;
  closedAt?: string;
}

const records: CapaRecord[] = [];
const { hydrate, flush } = bindPersistentArray<CapaRecord>(
  "capa_records",
  records,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function appendHistory(r: CapaRecord, actor: string, event: string, detail?: string) {
  r.history.push({ at: new Date().toISOString(), actor, event, detail });
}

export function openCapa(input: {
  organizationId: string;
  sourceKind: CapaSource;
  sourceRef?: string;
  problem: string;
  severity?: CapaRecord["severity"];
  openedBy: string;
}): CapaRecord {
  const at = new Date().toISOString();
  const r: CapaRecord = {
    id: id("capa"),
    organizationId: input.organizationId,
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
    problem: input.problem,
    severity: input.severity,
    actions: [],
    status: "open",
    history: [{ at, actor: input.openedBy, event: "opened" }],
    openedAt: at,
  };
  records.unshift(r);
  flush();
  return r;
}

export function recordRca(capaId: string, rca: NonNullable<CapaRecord["rca"]>, by: string): CapaRecord | null {
  const r = records.find((x) => x.id === capaId);
  if (!r) return null;
  r.rca = rca;
  if (r.status === "open") r.status = "investigating";
  appendHistory(r, by, "rca_recorded", rca.category);
  flush();
  return r;
}

export function addAction(capaId: string, action: Omit<CapaAction, "completedAt" | "completedBy" | "evidenceNote">, by: string): CapaRecord | null {
  const r = records.find((x) => x.id === capaId);
  if (!r) return null;
  r.actions.push({ ...action });
  if (r.status === "investigating" || r.status === "open") r.status = "actions_pending";
  appendHistory(r, by, "action_added", `${action.kind} → ${action.owner}`);
  flush();
  return r;
}

export function completeAction(capaId: string, actionIndex: number, evidence: { by: string; note?: string }): CapaRecord | null {
  const r = records.find((x) => x.id === capaId);
  if (!r || !r.actions[actionIndex]) return null;
  const a = r.actions[actionIndex];
  a.completedAt = new Date().toISOString();
  a.completedBy = evidence.by;
  a.evidenceNote = evidence.note;
  appendHistory(r, evidence.by, "action_completed", a.description);
  // If every action is now complete, move to verifying.
  if (r.actions.every((x) => x.completedAt)) {
    r.status = "verifying";
    // VoE due 30 days from now by default; quality lead can extend.
    r.voeDueOn = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
  }
  flush();
  return r;
}

export function recordVoe(capaId: string, input: { recurred: boolean; note?: string; by: string }): CapaRecord | null {
  const r = records.find((x) => x.id === capaId);
  if (!r || r.status !== "verifying") return null;
  r.voeDoneAt = new Date().toISOString();
  r.voeDoneBy = input.by;
  r.voeRecurred = input.recurred;
  r.voeNote = input.note;
  if (input.recurred) {
    r.status = "reopened";
    appendHistory(r, input.by, "voe_recurred", input.note);
  } else {
    r.status = "closed";
    r.closedAt = new Date().toISOString();
    appendHistory(r, input.by, "closed_after_voe", input.note);
  }
  flush();
  return r;
}

export function listCapas(filter: { organizationId?: string; status?: CapaStatus; source?: CapaSource } = {}): CapaRecord[] {
  let list = [...records];
  if (filter.organizationId) list = list.filter((r) => r.organizationId === filter.organizationId);
  if (filter.status) list = list.filter((r) => r.status === filter.status);
  if (filter.source) list = list.filter((r) => r.sourceKind === filter.source);
  return list.sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}
