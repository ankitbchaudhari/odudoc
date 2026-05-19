// Integration glue — small helpers that wire stores into each other.
//
// The dirty secret of an MVP-grade healthcare platform is most
// modules don't know about each other. This file is the seam where
// events from one store fan out to others:
//
//   - Discharge → M&M auto-queue when outcome=died|major-morb
//   - Incident → CAPA auto-open
//   - Critical lab value → notification publish
//   - Admin config write → live-config publish
//   - Dependent-mutation API → family-permission gate
//
// Each helper is small + side-effect-isolated so a failure in one
// wiring doesn't cascade. Wrap every call in try/catch at the
// call-site too.

import { publish } from "./pubsub";
import { publishConfigChange } from "./live-config-channel";
import {
  isActionAllowed,
  getEffectivePermission,
  type FamilyAction,
} from "./family-permissions";
import { publishEvent } from "./notifications/dispatch-queue";

// ── Family-permission gate ────────────────────────────────────────
//
// Usage at the top of any dependent-mutation API endpoint:
//
//   const gate = familyGate({
//     actorEmail: session.user.email,
//     ownerEmail: ownerOfDependent,
//     dependentId,
//     action: "book_appointment",
//   });
//   if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 403 });

export function familyGate(input: {
  actorEmail: string;
  ownerEmail: string;
  dependentId: string;
  action: FamilyAction;
}): { ok: true; level: ReturnType<typeof getEffectivePermission> } | { ok: false; reason: string } {
  const level = getEffectivePermission(input);
  if (!level) return { ok: false, reason: "Not a collaborator on this dependent." };
  if (!isActionAllowed(level, input.action)) {
    return { ok: false, reason: `Your role (${level}) doesn't permit this action.` };
  }
  return { ok: true, level };
}

// ── Discharge → M&M auto-queue ───────────────────────────────────
//
// Call from the discharge module's finalise step. Returns the case
// id if queued, null if the outcome doesn't warrant M&M review.

export async function onDischargeFinalised(input: {
  organizationId: string;
  patientEmail: string;
  patientName: string;
  patientMrn?: string;
  outcome: "discharged_home" | "lama" | "died" | "major_morbidity" | "transferred";
  primaryDiagnosis: string;
  causeOfDeath?: string;
  summary: string;
  dischargedBy: string;
}): Promise<string | null> {
  if (input.outcome !== "died" && input.outcome !== "major_morbidity") return null;
  try {
    const { queueCase } = await import("./mm-review-store");
    const c = queueCase({
      organizationId: input.organizationId,
      patientEmail: input.patientEmail,
      patientName: input.patientName,
      patientMrn: input.patientMrn,
      kind: input.outcome === "died" ? "death" : "major_morbidity",
      eventDate: new Date().toISOString(),
      primaryDiagnosis: input.primaryDiagnosis,
      causeOfDeath: input.causeOfDeath,
      summary: input.summary,
      queuedBy: input.dischargedBy,
    });
    // Also page the quality team via the notification queue.
    publishEvent({
      organizationId: input.organizationId,
      reason: "mm_case_queued",
      recipients: [{ recipient: "quality-team", channel: "in_app" }],
      body: `New ${input.outcome} case queued for M&M: ${input.patientName} (${input.primaryDiagnosis}).`,
      level: 2,
    });
    return c.id;
  } catch {
    return null;
  }
}

// ── Incident → CAPA auto-open ────────────────────────────────────

export async function onIncidentReported(input: {
  organizationId: string;
  sourceRef: string;
  problem: string;
  severity: "low" | "medium" | "high" | "critical";
  reportedBy: string;
}): Promise<string | null> {
  // Only auto-open CAPAs for medium-and-above. Low-severity stays
  // in the incident log without triggering the full RCA workflow.
  if (input.severity === "low") return null;
  try {
    const { openCapa } = await import("./capa-store");
    const r = openCapa({
      organizationId: input.organizationId,
      sourceKind: "incident",
      sourceRef: input.sourceRef,
      problem: input.problem,
      severity: input.severity,
      openedBy: input.reportedBy,
    });
    return r.id;
  } catch {
    return null;
  }
}

// ── Critical lab value → escalation ──────────────────────────────

export async function onCriticalLabResult(input: {
  organizationId: string;
  patientEmail: string;
  patientName: string;
  testName: string;
  resultSummary: string;
  doctorEmail: string;
}): Promise<void> {
  // Push a level-3 (urgent) notification to the ordering doctor +
  // a level-2 to the patient's in-app feed.
  publishEvent({
    organizationId: input.organizationId,
    reason: "critical_value",
    level: 3,
    recipients: [
      { recipient: input.doctorEmail, channel: "sms" },
      { recipient: input.doctorEmail, channel: "whatsapp" },
      { recipient: input.doctorEmail, channel: "push" },
    ],
    body: `CRITICAL: ${input.testName} for ${input.patientName} — ${input.resultSummary}`,
  });
  publishEvent({
    organizationId: input.organizationId,
    reason: "lab_result",
    level: 2,
    recipients: [{ recipient: input.patientEmail, channel: "in_app" }],
    body: `Your ${input.testName} result is ready. Your doctor has been alerted.`,
  });
  // Also broadcast on pubsub for any subscribed dashboards.
  await publish(`org:${input.organizationId}:critical`, {
    kind: "lab_critical",
    patientEmail: input.patientEmail,
    testName: input.testName,
    at: new Date().toISOString(),
  });
}

// ── Admin config write → live-config publish ─────────────────────

export function onConfigWrite(input: {
  organizationId: string;
  domain: string;
  payload?: unknown;
}): void {
  try {
    publishConfigChange(input);
  } catch {
    /* swallow — config publish failure shouldn't break the write */
  }
}
