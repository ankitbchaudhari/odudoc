// M&M (Morbidity & Mortality) review committee workflow.
// Spec v6.0 §7 Quality + NABH chapter on mortality review.
//
// Every patient death or major morbidity is queued for committee
// review. The committee meets weekly/fortnightly; each case gets
// presented, discussed, and graded on preventability + system
// learnings. Outcomes feed the quality dashboard + CAPA workflow.
//
// State machine:
//   queued (auto from discharge module on death/morbidity) →
//   scheduled (assigned to a meeting + presenter) →
//   presented (slot complete, discussion captured) →
//   graded (preventability rating + actions) →
//   closed (loop back to CAPA if actions exist)

import { bindPersistentArray } from "./persistent-array";

export type Preventability =
  | "non_preventable"      // disease severity overwhelmed best care
  | "possibly_preventable" // care gaps contributed
  | "preventable"          // clear care lapse
  | "indeterminate";       // insufficient data

export type CaseKind = "death" | "major_morbidity" | "near_miss" | "unexpected_outcome";

export type CaseStatus = "queued" | "scheduled" | "presented" | "graded" | "closed";

export interface MmCase {
  id: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  patientMrn?: string;
  kind: CaseKind;
  /** When the event happened. */
  eventDate: string;
  primaryDiagnosis: string;
  /** Death only — cause-of-death summary. */
  causeOfDeath?: string;
  /** Brief case summary entered when queued. */
  summary: string;
  status: CaseStatus;
  /** Meeting slot — when scheduled. */
  scheduledFor?: string;
  presenterId?: string;
  presenterName?: string;
  /** Captured at presentation time. */
  discussion?: string;
  /** Final grade — committee chair sets. */
  preventability?: Preventability;
  /** Actions that flow to CAPA. */
  capaActions?: Array<{ description: string; owner: string; dueOn?: string }>;
  /** When the case was closed. */
  closedAt?: string;
  closedBy?: string;
  /** Append-only history. */
  history: Array<{ at: string; actor: string; event: string; detail?: string }>;
  createdAt: string;
}

const cases: MmCase[] = [];
const { hydrate, flush } = bindPersistentArray<MmCase>(
  "mm_review_cases",
  cases,
  () => [],
);
await hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function appendHistory(c: MmCase, actor: string, event: string, detail?: string) {
  c.history.push({ at: new Date().toISOString(), actor, event, detail });
}

export function queueCase(input: {
  organizationId: string;
  patientEmail: string;
  patientName: string;
  patientMrn?: string;
  kind: CaseKind;
  eventDate: string;
  primaryDiagnosis: string;
  causeOfDeath?: string;
  summary: string;
  queuedBy: string;
}): MmCase {
  const at = new Date().toISOString();
  const c: MmCase = {
    id: id("mm"),
    organizationId: input.organizationId,
    patientEmail: input.patientEmail,
    patientName: input.patientName,
    patientMrn: input.patientMrn,
    kind: input.kind,
    eventDate: input.eventDate,
    primaryDiagnosis: input.primaryDiagnosis,
    causeOfDeath: input.causeOfDeath,
    summary: input.summary,
    status: "queued",
    history: [{ at, actor: input.queuedBy, event: "queued" }],
    createdAt: at,
  };
  cases.unshift(c);
  flush();
  return c;
}

export function scheduleCase(caseId: string, when: string, presenter: { id: string; name: string }, scheduledBy: string): MmCase | null {
  const c = cases.find((x) => x.id === caseId);
  if (!c || c.status !== "queued") return null;
  c.status = "scheduled";
  c.scheduledFor = when;
  c.presenterId = presenter.id;
  c.presenterName = presenter.name;
  appendHistory(c, scheduledBy, "scheduled", `${when} · ${presenter.name}`);
  flush();
  return c;
}

export function recordPresentation(caseId: string, discussion: string, by: string): MmCase | null {
  const c = cases.find((x) => x.id === caseId);
  if (!c || c.status !== "scheduled") return null;
  c.status = "presented";
  c.discussion = discussion;
  appendHistory(c, by, "presented");
  flush();
  return c;
}

export function gradeCase(caseId: string, input: { preventability: Preventability; capaActions: NonNullable<MmCase["capaActions"]>; by: string }): MmCase | null {
  const c = cases.find((x) => x.id === caseId);
  if (!c || c.status !== "presented") return null;
  c.status = "graded";
  c.preventability = input.preventability;
  c.capaActions = input.capaActions;
  appendHistory(c, input.by, "graded", input.preventability);
  flush();
  return c;
}

export function closeCase(caseId: string, by: string): MmCase | null {
  const c = cases.find((x) => x.id === caseId);
  if (!c || c.status !== "graded") return null;
  c.status = "closed";
  c.closedAt = new Date().toISOString();
  c.closedBy = by;
  appendHistory(c, by, "closed");
  flush();
  return c;
}

export function listCases(filter: { organizationId?: string; status?: CaseStatus } = {}): MmCase[] {
  let list = [...cases];
  if (filter.organizationId) list = list.filter((c) => c.organizationId === filter.organizationId);
  if (filter.status) list = list.filter((c) => c.status === filter.status);
  return list.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}
