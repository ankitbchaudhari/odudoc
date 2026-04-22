// Emergency Code activations (Code Blue / Pink / Red / etc.). Tenant-scoped.
//
// Logs every rapid-response activation so the hospital can audit response
// time compliance (Code Blue goal: team at bedside in <3 min), identify
// false-alarm patterns, and review resuscitation outcomes. Timestamps drive
// two derived metrics per code:
//   responseMin     = arrivedAt   - activatedAt   (team arrival latency)
//   resolutionMin   = resolvedAt  - activatedAt   (full event duration)
//
// Patient linkage is optional (Code Pink / Red / Orange may not involve a
// specific patient). When a patient is deleted, emergency codes detach but
// retain the clinical record — resuscitation history is non-destructive.

import { bindPersistentArray } from "../persistent-array";

export type CodeType =
  | "blue" // cardiac/respiratory arrest
  | "pink" // infant / child abduction
  | "red" // fire
  | "orange" // hazmat / chemical spill
  | "black" // bomb threat
  | "white" // violent person / assault
  | "yellow" // internal disaster / mass casualty
  | "purple"; // psychiatric emergency

export type CodeStatus = "active" | "resolved" | "cancelled";

export type CodeOutcome =
  | "resolved"
  | "rosc" // return of spontaneous circulation (Code Blue)
  | "transferred"
  | "expired"
  | "false_alarm"
  | "drill"
  | "other";

export type Intervention =
  | "cpr"
  | "defibrillation"
  | "intubation"
  | "medication"
  | "oxygen"
  | "iv_access"
  | "transport"
  | "evacuation"
  | "containment"
  | "restraint"
  | "other";

export interface EmergencyCode {
  id: string;
  organizationId: string;
  eventNumber: string; // ECODE-{suffix}-{seq}
  codeType: CodeType;
  status: CodeStatus;
  location: string; // ward / room / area
  calledBy: string;
  activatedAt: string;
  arrivedAt?: string;
  resolvedAt?: string;
  patientId?: string;
  patientName?: string;
  patientMRN?: string;
  teamMembers: string[];
  interventions: Intervention[];
  outcome?: CodeOutcome;
  isDrill: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const codes: EmergencyCode[] = [];
const binding = bindPersistentArray<EmergencyCode>(
  "hospital-emergency-codes",
  codes,
  () => []
);
await binding.hydrate();
const flush = binding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextEventNumber(orgId: string): string {
  const n = codes.filter((c) => c.organizationId === orgId).length + 1;
  return `ECODE-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const CODE_LABEL: Record<CodeType, string> = {
  blue: "Code Blue — Cardiac/Respiratory arrest",
  pink: "Code Pink — Infant/Child abduction",
  red: "Code Red — Fire",
  orange: "Code Orange — Hazmat",
  black: "Code Black — Bomb threat",
  white: "Code White — Violent person",
  yellow: "Code Yellow — Mass casualty",
  purple: "Code Purple — Psychiatric emergency",
};

export const CODE_SHORT: Record<CodeType, string> = {
  blue: "Blue",
  pink: "Pink",
  red: "Red",
  orange: "Orange",
  black: "Black",
  white: "White",
  yellow: "Yellow",
  purple: "Purple",
};

export const OUTCOME_LABEL: Record<CodeOutcome, string> = {
  resolved: "Resolved on scene",
  rosc: "ROSC achieved",
  transferred: "Transferred to higher care",
  expired: "Patient expired",
  false_alarm: "False alarm",
  drill: "Drill (training)",
  other: "Other",
};

export const INTERVENTION_LABEL: Record<Intervention, string> = {
  cpr: "CPR",
  defibrillation: "Defibrillation",
  intubation: "Intubation",
  medication: "Medication given",
  oxygen: "Supplemental O₂",
  iv_access: "IV access",
  transport: "Patient transport",
  evacuation: "Evacuation",
  containment: "Containment / isolation",
  restraint: "Physical restraint",
  other: "Other",
};

// ---------- CRUD ----------

export function listCodes(opts: {
  organizationId: string;
  codeType?: CodeType;
  status?: CodeStatus;
  from?: string;
  to?: string;
}): EmergencyCode[] {
  let list = codes.filter(
    (c) => c.organizationId === opts.organizationId
  );
  if (opts.codeType) list = list.filter((c) => c.codeType === opts.codeType);
  if (opts.status) list = list.filter((c) => c.status === opts.status);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((c) => new Date(c.activatedAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((c) => new Date(c.activatedAt).getTime() <= t);
  }
  // Active codes float to the top, then most recent first
  return list.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === "active") return -1;
      if (b.status === "active") return 1;
    }
    return (
      new Date(b.activatedAt).getTime() - new Date(a.activatedAt).getTime()
    );
  });
}

export interface CodeInput {
  codeType?: CodeType;
  status?: CodeStatus;
  location?: string;
  calledBy?: string;
  activatedAt?: string;
  arrivedAt?: string;
  resolvedAt?: string;
  patientId?: string;
  patientName?: string;
  patientMRN?: string;
  teamMembers?: string[];
  interventions?: Intervention[];
  outcome?: CodeOutcome;
  isDrill?: boolean;
  notes?: string;
}

export function createCode(
  organizationId: string,
  input: CodeInput
):
  | { ok: false; error: string }
  | { ok: true; code: EmergencyCode } {
  if (!input.codeType) return { ok: false, error: "missing_code_type" };
  if (!input.location || !input.location.trim())
    return { ok: false, error: "missing_location" };
  if (!input.calledBy || !input.calledBy.trim())
    return { ok: false, error: "missing_caller" };

  const now = new Date().toISOString();
  const c: EmergencyCode = {
    id: `ecode-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    eventNumber: nextEventNumber(organizationId),
    codeType: input.codeType,
    status: input.status || "active",
    location: input.location.trim(),
    calledBy: input.calledBy.trim(),
    activatedAt: input.activatedAt || now,
    arrivedAt: input.arrivedAt || undefined,
    resolvedAt: input.resolvedAt || undefined,
    patientId: input.patientId || undefined,
    patientName: input.patientName?.trim() || undefined,
    patientMRN: input.patientMRN?.trim() || undefined,
    teamMembers: (input.teamMembers || [])
      .map((m) => m.trim())
      .filter(Boolean),
    interventions: input.interventions || [],
    outcome: input.outcome,
    isDrill: input.isDrill ?? false,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  codes.unshift(c);
  flush();
  return { ok: true, code: c };
}

export function updateCode(
  id: string,
  organizationId: string,
  patch: CodeInput
): EmergencyCode | null {
  const c = codes.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!c) return null;
  const now = new Date().toISOString();

  if (patch.codeType !== undefined) c.codeType = patch.codeType;
  if (patch.location !== undefined) c.location = patch.location.trim() || c.location;
  if (patch.calledBy !== undefined) c.calledBy = patch.calledBy.trim() || c.calledBy;
  if (patch.activatedAt !== undefined) c.activatedAt = patch.activatedAt;
  if (patch.arrivedAt !== undefined)
    c.arrivedAt = patch.arrivedAt || undefined;
  if (patch.resolvedAt !== undefined)
    c.resolvedAt = patch.resolvedAt || undefined;
  if (patch.patientId !== undefined) c.patientId = patch.patientId || undefined;
  if (patch.patientName !== undefined)
    c.patientName = patch.patientName?.trim() || undefined;
  if (patch.patientMRN !== undefined)
    c.patientMRN = patch.patientMRN?.trim() || undefined;
  if (patch.teamMembers !== undefined)
    c.teamMembers = (patch.teamMembers || []).map((m) => m.trim()).filter(Boolean);
  if (patch.interventions !== undefined)
    c.interventions = patch.interventions || [];
  if (patch.outcome !== undefined) c.outcome = patch.outcome;
  if (patch.isDrill !== undefined) c.isDrill = patch.isDrill;
  if (patch.notes !== undefined) c.notes = patch.notes?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== c.status) {
    c.status = patch.status;
    if (patch.status === "resolved" && !c.resolvedAt) {
      c.resolvedAt = now;
    }
  }

  c.updatedAt = now;
  flush();
  return c;
}

// Convenience: mark team arrival with current timestamp.
export function markArrived(
  id: string,
  organizationId: string
): EmergencyCode | null {
  const c = codes.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!c) return null;
  if (!c.arrivedAt) c.arrivedAt = new Date().toISOString();
  c.updatedAt = new Date().toISOString();
  flush();
  return c;
}

export function deleteCode(id: string, organizationId: string): boolean {
  const idx = codes.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  codes.splice(idx, 1);
  flush();
  return true;
}

// Patient cascade — detach only (retain resuscitation audit).
export function unlinkCodesForPatient(
  organizationId: string,
  patientId: string
): number {
  let n = 0;
  for (const c of codes) {
    if (c.organizationId === organizationId && c.patientId === patientId) {
      c.patientId = undefined;
      c.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flush();
  return n;
  // flush:auto-unlink
  codes.splice(codes.length, 0);
}

// ---------- Derived metrics ----------

export function responseMin(c: EmergencyCode): number | null {
  if (!c.arrivedAt) return null;
  const diff =
    new Date(c.arrivedAt).getTime() - new Date(c.activatedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}

export function resolutionMin(c: EmergencyCode): number | null {
  if (!c.resolvedAt) return null;
  const diff =
    new Date(c.resolvedAt).getTime() - new Date(c.activatedAt).getTime();
  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.round(diff / 60000);
}

export interface CodeStats {
  activeNow: number;
  codesThisMonth: number;
  codeBlueThisMonth: number;
  drillsThisMonth: number;
  falseAlarmsThisMonth: number;
  avgResponseMin: number; // real codes only, last 90 days
  codeBlueSurvivalPct: number; // ROSC or transferred / total resolved code blue, last 90d
}

export function computeStats(organizationId: string): CodeStats {
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const cutoff90 = now - 90 * 24 * 3600 * 1000;

  const orgCodes = codes.filter((c) => c.organizationId === organizationId);

  const thisMonth = orgCodes.filter(
    (c) => new Date(c.activatedAt).getTime() >= monthStart.getTime()
  );
  const activeNow = orgCodes.filter((c) => c.status === "active").length;
  const codeBlueThisMonth = thisMonth.filter(
    (c) => c.codeType === "blue" && !c.isDrill
  ).length;
  const drillsThisMonth = thisMonth.filter((c) => c.isDrill).length;
  const falseAlarmsThisMonth = thisMonth.filter(
    (c) => c.outcome === "false_alarm"
  ).length;

  const last90Real = orgCodes.filter(
    (c) =>
      !c.isDrill &&
      new Date(c.activatedAt).getTime() >= cutoff90 &&
      c.arrivedAt
  );
  const avgResponseMin = last90Real.length
    ? Math.round(
        last90Real.reduce((s, c) => s + (responseMin(c) ?? 0), 0) /
          last90Real.length
      )
    : 0;

  const blue90Resolved = orgCodes.filter(
    (c) =>
      c.codeType === "blue" &&
      !c.isDrill &&
      c.status === "resolved" &&
      new Date(c.activatedAt).getTime() >= cutoff90
  );
  const blueSurvivors = blue90Resolved.filter(
    (c) => c.outcome === "rosc" || c.outcome === "transferred"
  ).length;
  const codeBlueSurvivalPct = blue90Resolved.length
    ? Math.round((blueSurvivors / blue90Resolved.length) * 100)
    : 0;

  return {
    activeNow,
    codesThisMonth: thisMonth.length,
    codeBlueThisMonth,
    drillsThisMonth,
    falseAlarmsThisMonth,
    avgResponseMin,
    codeBlueSurvivalPct,
  };
}
