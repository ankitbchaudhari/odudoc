// Sensitive-data audit log.
//
// Every view, print, or share of a patient's records is recorded
// with: who looked, when, from what IP, on what document/record,
// in what role. Patients can inspect their own audit log to spot
// suspicious access (a hospital admin viewing their record after
// discharge, an insurer viewing reports during a claim review,
// etc.). Compliance backbone for "right to a record of disclosures".
//
// We never expose another patient's events — even admins inspecting
// their own audit see only events where they are the actor or the
// subject.

import { bindPersistentArray } from "../persistent-array";

export type AuditAction =
  | "view"
  | "print"
  | "download"
  | "share"
  | "export"
  | "modify"
  | "delete";

export type AuditResource =
  | "document"
  | "prescription"
  | "lab_report"
  | "vital"
  | "consultation"
  | "appointment"
  | "preauth"
  | "wallet"
  | "consent"
  | "abha";

export interface AuditEvent {
  id: string;
  /** Who acted — userId from the session. */
  actorUserId: string;
  actorRole?: "patient" | "doctor" | "admin" | "staff" | "insurer" | "lab" | "pharmacy";
  actorEmail?: string;
  /** Who the data is about. Often == actor when patient self-views. */
  subjectUserId: string;
  resource: AuditResource;
  resourceId: string;
  action: AuditAction;
  /** Best-effort client IP (X-Forwarded-For first hop). */
  ip?: string;
  userAgent?: string;
  /** Free-text context — "claim review #41", "discharge audit". */
  reason?: string;
  organizationId?: string;
  at: string;
}

const events: AuditEvent[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<AuditEvent>(
  "audit_events",
  events,
  () => []
);
await hydrate();

export interface RecordEventInput {
  actorUserId: string;
  actorRole?: AuditEvent["actorRole"];
  actorEmail?: string;
  subjectUserId: string;
  resource: AuditResource;
  resourceId: string;
  action: AuditAction;
  ip?: string;
  userAgent?: string;
  reason?: string;
  organizationId?: string;
}

export function recordAuditEvent(input: RecordEventInput): AuditEvent {
  const e: AuditEvent = {
    id: `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ...input,
    at: new Date().toISOString(),
  };
  events.unshift(e);
  // Cap at 5000 rows total — beyond that we're storing forensics
  // not actionable signal. Tombstone the oldest in batches.
  if (events.length > 5000) {
    const drop = events.splice(5000);
    for (const d of drop) tombstone(d.id);
  }
  flush();
  return e;
}

/** Events about a single subject (the patient inspecting their own log). */
export function listEventsForSubject(subjectUserId: string, limit = 200): AuditEvent[] {
  return events
    .filter((e) => e.subjectUserId === subjectUserId)
    .slice(0, limit);
}

/** Events caused by a single actor (admin reviewing their own activity). */
export function listEventsForActor(actorUserId: string, limit = 200): AuditEvent[] {
  return events
    .filter((e) => e.actorUserId === actorUserId)
    .slice(0, limit);
}

/** Pull the X-Forwarded-For first hop, falling back to remote IP if
 *  the runtime exposes it. Keeps the helper next to the store so
 *  callers can normalise consistently. */
export function clientIpFromHeaders(headers: Headers): string | undefined {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || undefined;
}

export function deleteAuditEventsForSubject(subjectUserId: string): number {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].subjectUserId === subjectUserId) {
      tombstone(events[i].id);
      events.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
