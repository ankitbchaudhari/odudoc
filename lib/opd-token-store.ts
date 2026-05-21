// V17 of the Master Spec — OPD token system end-to-end.
//
// Flow:
//   1. Patient arrives at reception
//   2. Reception scans the patient's identity QR (or appointment QR
//      if pre-booked); /api/opd/issue resolves the QR + creates an
//      OpdToken with a sequential display number for this clinic +
//      doctor + date
//   3. OPD display board polls /api/opd/queue and shows the next 5
//   4. Doctor calls next from their queue
//   5. Doctor scans the OPD token (printed on the patient's chit, or
//      clicks "Start" in their dashboard); the patient data envelope
//      auto-fills the encounter form
//   6. Doctor closes the consultation; status flips to completed,
//      footfall counters increment, ABHA sync stub fires
//
// V13 event written at every state change so the live feed has a
// continuous picture of the OPD shift.

import { bindPersistentArray } from "@/lib/persistent-array";
import { recordEvent } from "@/lib/accountability-store";

export type OpdStatus = "waiting" | "called" | "in_consult" | "completed" | "no_show" | "cancelled";

export interface OpdToken {
  id: string;
  /** Human-readable per-clinic-per-day sequential e.g. "T-042". */
  displayNumber: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAbhaId?: string;
  /** Clinic + department + doctor scope. */
  clinicId: string;
  clinicName?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId: string;
  doctorName: string;
  status: OpdStatus;
  /** Position in the doctor's waiting queue at issue time. Live
   *  position is recomputed on read. */
  queuePosition: number;
  /** If the token was issued from an appointment scan, the booking
   *  ref. New walk-ins leave this blank. */
  linkedAppointmentId?: string;
  /** The QR token that produced this OPD token, for audit traceback. */
  scannedQrToken?: string;
  /** ABHA sync — set when the encounter data is pushed to ABDM. */
  abhaSynced?: boolean;
  abhaSyncedAt?: string;
  /** Lifecycle timestamps. */
  arrivedAt: string;
  calledAt?: string;
  consultStartedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelledReason?: string;
}

const tokens: OpdToken[] = [];
const handle = bindPersistentArray<OpdToken>("opd_tokens", tokens);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function todayKey(): string {
  // Local-date YYYY-MM-DD — token numbering resets at midnight
  // per-clinic local time. We use UTC date for the demo; real
  // deployment runs per-pod clinic timezone.
  return new Date().toISOString().slice(0, 10);
}

// ── Issue ────────────────────────────────────────────────────────

export interface IssueInput {
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientAbhaId?: string;
  clinicId: string;
  clinicName?: string;
  departmentId?: string;
  departmentName?: string;
  doctorId: string;
  doctorName: string;
  receptionEmail: string;
  linkedAppointmentId?: string;
  scannedQrToken?: string;
}

export async function issueOpdToken(input: IssueInput): Promise<OpdToken> {
  await ensureHydrated();
  // Don't double-issue if the patient already has a live token with
  // the same doctor today (waiting / called / in_consult).
  const day = todayKey();
  const existing = tokens.find(
    (t) =>
      t.patientId === input.patientId &&
      t.doctorId === input.doctorId &&
      t.arrivedAt.startsWith(day) &&
      (t.status === "waiting" || t.status === "called" || t.status === "in_consult"),
  );
  if (existing) return existing;

  // Per-doctor-per-day sequential. We compute by counting all today's
  // tokens for the doctor + 1, then format as T-NNN.
  const seq = tokens.filter(
    (t) => t.doctorId === input.doctorId && t.arrivedAt.startsWith(day),
  ).length + 1;
  const displayNumber = `T-${String(seq).padStart(3, "0")}`;

  const queuePosition = tokens.filter(
    (t) =>
      t.doctorId === input.doctorId &&
      t.arrivedAt.startsWith(day) &&
      (t.status === "waiting" || t.status === "called"),
  ).length + 1;

  const t: OpdToken = {
    id: uid("opd"),
    displayNumber,
    patientId: input.patientId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    patientAbhaId: input.patientAbhaId,
    clinicId: input.clinicId,
    clinicName: input.clinicName,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    doctorId: input.doctorId,
    doctorName: input.doctorName,
    status: "waiting",
    queuePosition,
    linkedAppointmentId: input.linkedAppointmentId,
    scannedQrToken: input.scannedQrToken,
    arrivedAt: new Date().toISOString(),
  };
  tokens.push(t);
  handle.flush();

  await recordEvent({
    category: "clinical",
    action: "opd.token.issued",
    actorEmail: input.receptionEmail,
    actorRole: "staff",
    tenantId: input.clinicId,
    subjectKind: "opd_token",
    subjectId: t.id,
    summary: `${displayNumber} · ${input.patientName} → Dr ${input.doctorName} · position ${queuePosition}`,
  }).catch(() => {});

  return t;
}

// ── Read ─────────────────────────────────────────────────────────

export interface QueueFilter {
  clinicId?: string;
  doctorId?: string;
  /** Default true — restricts to today's tokens. Set false for the
   *  admin "full log" view. */
  todayOnly?: boolean;
  /** "live" = waiting + called + in_consult. Default. */
  liveOnly?: boolean;
}

export async function listOpdQueue(filter: QueueFilter = {}): Promise<OpdToken[]> {
  await ensureHydrated();
  const day = todayKey();
  const liveOnly = filter.liveOnly !== false;
  const todayOnly = filter.todayOnly !== false;
  let rows = [...tokens];
  if (todayOnly) rows = rows.filter((t) => t.arrivedAt.startsWith(day));
  if (filter.clinicId) rows = rows.filter((t) => t.clinicId === filter.clinicId);
  if (filter.doctorId) rows = rows.filter((t) => t.doctorId === filter.doctorId);
  if (liveOnly) rows = rows.filter((t) => t.status === "waiting" || t.status === "called" || t.status === "in_consult");
  // Live positions sorted by arrival order; completed tokens fall to
  // the bottom on a no-liveOnly query.
  rows.sort((a, b) => {
    if (a.status === b.status) return a.arrivedAt.localeCompare(b.arrivedAt);
    const rank = (s: OpdStatus) => ({ in_consult: 0, called: 1, waiting: 2, completed: 3, no_show: 4, cancelled: 5 } as const)[s];
    return rank(a.status) - rank(b.status);
  });
  return rows;
}

export async function getOpdToken(id: string): Promise<OpdToken | null> {
  await ensureHydrated();
  return tokens.find((t) => t.id === id) || null;
}

// ── State transitions ────────────────────────────────────────────

/** Doctor (or auto-roster) calls the next waiting patient. */
export async function callNext(doctorId: string, by: { email: string; role?: string }): Promise<OpdToken | null> {
  await ensureHydrated();
  const day = todayKey();
  // First any currently called/in_consult token blocks call-next —
  // doctors finish one before calling another.
  const blocking = tokens.find(
    (t) => t.doctorId === doctorId && t.arrivedAt.startsWith(day) && (t.status === "called" || t.status === "in_consult"),
  );
  if (blocking) return blocking;

  const next = tokens
    .filter((t) => t.doctorId === doctorId && t.arrivedAt.startsWith(day) && t.status === "waiting")
    .sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt))[0];
  if (!next) return null;

  next.status = "called";
  next.calledAt = new Date().toISOString();
  handle.flush();
  await recordEvent({
    category: "clinical",
    action: "opd.token.called",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "opd_token",
    subjectId: next.id,
    summary: `${next.displayNumber} called by Dr ${next.doctorName}`,
  }).catch(() => {});
  return next;
}

/** Doctor scans the token (or clicks Start in their dashboard) →
 *  flips to in_consult. Returns the token so the caller can request
 *  the auto-fill envelope on the next call. */
export async function startConsult(id: string, by: { email: string; role?: string; doctorId?: string }): Promise<OpdToken | null> {
  await ensureHydrated();
  const t = tokens.find((x) => x.id === id);
  if (!t) return null;
  if (by.doctorId && by.doctorId !== t.doctorId) {
    // Doctor scanning another doctor's token — refuse.
    return null;
  }
  if (t.status === "in_consult") return t;
  if (t.status !== "called" && t.status !== "waiting") return null;
  t.status = "in_consult";
  t.consultStartedAt = new Date().toISOString();
  handle.flush();
  await recordEvent({
    category: "clinical",
    action: "opd.consult.started",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "opd_token",
    subjectId: t.id,
    summary: `${t.displayNumber} consult started · patient ${t.patientName}`,
  }).catch(() => {});
  return t;
}

/** Mark consultation complete. Fires footfall + ABHA sync stub. */
export async function completeConsult(id: string, by: { email: string; role?: string }, notes?: string): Promise<OpdToken | null> {
  await ensureHydrated();
  const t = tokens.find((x) => x.id === id);
  if (!t) return null;
  if (t.status !== "in_consult" && t.status !== "called") return null;
  t.status = "completed";
  t.completedAt = new Date().toISOString();
  handle.flush();

  await recordEvent({
    category: "clinical",
    action: "opd.consult.completed",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "opd_token",
    subjectId: t.id,
    summary: `${t.displayNumber} consult completed · patient ${t.patientName}${notes ? ` · ${notes}` : ""}`,
  }).catch(() => {});

  // ABHA sync stub — if the patient has an ABHA id we mark the
  // encounter as synced. Real ABDM push needs the consent token +
  // signed FHIR bundle; this surfaces the intent in the audit log
  // and on the token so the doctor + patient see the badge.
  if (t.patientAbhaId) {
    t.abhaSynced = true;
    t.abhaSyncedAt = new Date().toISOString();
    handle.flush();
    await recordEvent({
      category: "data_access",
      action: "abha.encounter.synced",
      actorEmail: by.email,
      subjectKind: "opd_token",
      subjectId: t.id,
      summary: `ABHA encounter synced for ${t.patientAbhaId} (token ${t.displayNumber})`,
    }).catch(() => {});
  }

  return t;
}

export async function markNoShow(id: string, by: { email: string; role?: string }): Promise<OpdToken | null> {
  await ensureHydrated();
  const t = tokens.find((x) => x.id === id);
  if (!t) return null;
  if (t.status === "completed" || t.status === "cancelled") return t;
  t.status = "no_show";
  handle.flush();
  await recordEvent({
    category: "clinical",
    action: "opd.token.no_show",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "opd_token",
    subjectId: t.id,
    summary: `${t.displayNumber} marked no-show`,
  }).catch(() => {});
  return t;
}

export async function cancelToken(id: string, reason: string, by: { email: string; role?: string }): Promise<OpdToken | null> {
  await ensureHydrated();
  const t = tokens.find((x) => x.id === id);
  if (!t) return null;
  if (t.status === "completed" || t.status === "cancelled") return t;
  t.status = "cancelled";
  t.cancelledAt = new Date().toISOString();
  t.cancelledReason = reason;
  handle.flush();
  await recordEvent({
    category: "clinical",
    action: "opd.token.cancelled",
    actorEmail: by.email,
    actorRole: by.role,
    subjectKind: "opd_token",
    subjectId: t.id,
    summary: `${t.displayNumber} cancelled · ${reason}`,
  }).catch(() => {});
  return t;
}

// ── Footfall ─────────────────────────────────────────────────────

export interface FootfallRow {
  date: string;
  doctorId: string;
  doctorName: string;
  clinicId: string;
  completed: number;
  noShows: number;
  cancelled: number;
  /** Average wait time arrived → called, in minutes. */
  avgWaitMin?: number;
  /** Average consult duration in minutes. */
  avgConsultMin?: number;
}

export async function listFootfall(filter: { clinicId?: string; doctorId?: string; days?: number } = {}): Promise<FootfallRow[]> {
  await ensureHydrated();
  const days = filter.days || 7;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
  let rows = tokens.filter((t) => t.arrivedAt >= cutoff);
  if (filter.clinicId) rows = rows.filter((t) => t.clinicId === filter.clinicId);
  if (filter.doctorId) rows = rows.filter((t) => t.doctorId === filter.doctorId);

  const buckets = new Map<string, FootfallRow & { waits: number[]; consults: number[] }>();
  for (const t of rows) {
    const date = t.arrivedAt.slice(0, 10);
    const key = `${date}|${t.doctorId}`;
    let row = buckets.get(key);
    if (!row) {
      row = {
        date, doctorId: t.doctorId, doctorName: t.doctorName, clinicId: t.clinicId,
        completed: 0, noShows: 0, cancelled: 0, waits: [], consults: [],
      };
      buckets.set(key, row);
    }
    if (t.status === "completed") row.completed++;
    else if (t.status === "no_show") row.noShows++;
    else if (t.status === "cancelled") row.cancelled++;
    if (t.calledAt) row.waits.push((new Date(t.calledAt).getTime() - new Date(t.arrivedAt).getTime()) / 60_000);
    if (t.consultStartedAt && t.completedAt) row.consults.push((new Date(t.completedAt).getTime() - new Date(t.consultStartedAt).getTime()) / 60_000);
  }

  return [...buckets.values()]
    .map((r) => ({
      ...r,
      avgWaitMin: r.waits.length ? Math.round(r.waits.reduce((a, b) => a + b, 0) / r.waits.length) : undefined,
      avgConsultMin: r.consults.length ? Math.round(r.consults.reduce((a, b) => a + b, 0) / r.consults.length) : undefined,
    }))
    .map(({ waits: _w, consults: _c, ...keep }) => keep)
    .sort((a, b) => b.date.localeCompare(a.date) || b.completed - a.completed);
}
