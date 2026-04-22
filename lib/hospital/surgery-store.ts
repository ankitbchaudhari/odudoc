// Operation theatres & surgical bookings. Tenant-scoped.
//
// Two entities in one file:
// - OperationTheatre: a physical OT room (name, type, status).
// - SurgeryBooking: a scheduled procedure tied to an OT, patient, surgeon,
//   team, and timing. Status machine: scheduled → in_progress → completed,
//   with cancel branching off at any point.
//
// Double-booking is prevented at booking time by checking overlap windows
// against existing scheduled / in_progress bookings for that OT.

import { bindPersistentArray } from "../persistent-array";

export type OTStatus = "available" | "occupied" | "maintenance" | "cleaning";
export type OTType =
  | "major"
  | "minor"
  | "emergency"
  | "ophthalmic"
  | "obstetric"
  | "dental"
  | "other";

export interface OperationTheatre {
  id: string;
  organizationId: string;
  name: string;
  type: OTType;
  floor?: string;
  status: OTStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SurgeryStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "postponed";

export type AnesthesiaType =
  | "general"
  | "regional"
  | "spinal"
  | "epidural"
  | "local"
  | "mac" // monitored anesthesia care
  | "none";

export interface SurgeryTeamMember {
  role: string; // "Surgeon", "Assistant", "Anesthetist", "Scrub Nurse"…
  name: string;
}

export interface PreOpChecklist {
  consentSigned: boolean;
  fastingConfirmed: boolean;
  allergiesReviewed: boolean;
  siteMarked: boolean;
  bloodAvailable: boolean;
  imagingAvailable: boolean;
  notes?: string;
}

export interface SurgeryBooking {
  id: string;
  organizationId: string;
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  otId: string;
  procedureName: string;
  procedureCode?: string; // ICD-10-PCS / CPT
  priority: "elective" | "urgent" | "emergency";
  anesthesiaType: AnesthesiaType;
  primarySurgeon: string;
  team: SurgeryTeamMember[];
  scheduledStart: string; // ISO
  scheduledEnd: string; // ISO
  actualStart?: string;
  actualEnd?: string;
  preOp: PreOpChecklist;
  operativeNotes?: string;
  postOpInstructions?: string;
  complications?: string;
  estimatedCost?: number;
  status: SurgeryStatus;
  createdAt: string;
  updatedAt: string;
}

const theatres: OperationTheatre[] = [];
const bookings: SurgeryBooking[] = [];

const { hydrate: hydrateOT, flush: flushOT } =
  bindPersistentArray<OperationTheatre>(
    "hospital-operation-theatres",
    theatres,
    () => []
  );
const { hydrate: hydrateBK, flush: flushBK } =
  bindPersistentArray<SurgeryBooking>(
    "hospital-surgery-bookings",
    bookings,
    () => []
  );
await hydrateOT();
await hydrateBK();

// ────────────────────────────────────────────── operation theatres

export function listTheatres(opts: {
  organizationId: string;
  type?: OTType;
}): OperationTheatre[] {
  let list = theatres.filter((t) => t.organizationId === opts.organizationId);
  if (opts.type) list = list.filter((t) => t.type === opts.type);
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getTheatreById(
  id: string,
  organizationId: string
): OperationTheatre | null {
  const t = theatres.find((x) => x.id === id);
  if (!t || t.organizationId !== organizationId) return null;
  return t;
}

export interface TheatreInput {
  name: string;
  type: OTType;
  floor?: string;
  status?: OTStatus;
  notes?: string;
}

export function createTheatre(
  organizationId: string,
  input: TheatreInput
): OperationTheatre {
  const now = new Date().toISOString();
  const ot: OperationTheatre = {
    id: `ot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    name: input.name.trim(),
    type: input.type,
    floor: input.floor?.trim() || undefined,
    status: input.status || "available",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  theatres.push(ot);
  flushOT();
  return ot;
}

export function updateTheatre(
  id: string,
  organizationId: string,
  patch: Partial<TheatreInput>
): OperationTheatre | null {
  const t = theatres.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!t) return null;
  if (patch.name !== undefined) t.name = patch.name.trim();
  if (patch.type !== undefined) t.type = patch.type;
  if (patch.floor !== undefined) t.floor = patch.floor?.trim() || undefined;
  if (patch.status !== undefined) t.status = patch.status;
  if (patch.notes !== undefined) t.notes = patch.notes?.trim() || undefined;
  t.updatedAt = new Date().toISOString();
  flushOT();
  return t;
}

export function deleteTheatre(id: string, organizationId: string): boolean {
  // Refuse if any active booking uses it.
  const hasActive = bookings.some(
    (b) =>
      b.organizationId === organizationId &&
      b.otId === id &&
      (b.status === "scheduled" || b.status === "in_progress")
  );
  if (hasActive) return false;
  const i = theatres.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  theatres.splice(i, 1);
  flushOT();
  return true;
}

// ────────────────────────────────────────────── surgery bookings

export function listBookings(opts: {
  organizationId: string;
  patientId?: string;
  otId?: string;
  status?: SurgeryStatus;
  dateFrom?: string;
  dateTo?: string;
}): SurgeryBooking[] {
  let list = bookings.filter((b) => b.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((b) => b.patientId === opts.patientId);
  if (opts.otId) list = list.filter((b) => b.otId === opts.otId);
  if (opts.status) list = list.filter((b) => b.status === opts.status);
  if (opts.dateFrom) {
    const f = new Date(opts.dateFrom).getTime();
    list = list.filter((b) => new Date(b.scheduledStart).getTime() >= f);
  }
  if (opts.dateTo) {
    const t = new Date(opts.dateTo).getTime();
    list = list.filter((b) => new Date(b.scheduledStart).getTime() <= t);
  }
  return list.sort(
    (a, b) =>
      new Date(b.scheduledStart).getTime() -
      new Date(a.scheduledStart).getTime()
  );
}

export function getBookingById(
  id: string,
  organizationId: string
): SurgeryBooking | null {
  const b = bookings.find((x) => x.id === id);
  if (!b || b.organizationId !== organizationId) return null;
  return b;
}

function overlapsExisting(
  organizationId: string,
  otId: string,
  start: number,
  end: number,
  excludeId?: string
): boolean {
  return bookings.some((b) => {
    if (b.organizationId !== organizationId) return false;
    if (b.otId !== otId) return false;
    if (excludeId && b.id === excludeId) return false;
    if (b.status !== "scheduled" && b.status !== "in_progress") return false;
    const bs = new Date(b.scheduledStart).getTime();
    const be = new Date(b.scheduledEnd).getTime();
    return start < be && end > bs;
  });
}

export interface BookingInput {
  patientId: string;
  admissionId?: string;
  encounterId?: string;
  otId: string;
  procedureName: string;
  procedureCode?: string;
  priority?: SurgeryBooking["priority"];
  anesthesiaType?: AnesthesiaType;
  primarySurgeon: string;
  team?: SurgeryTeamMember[];
  scheduledStart: string;
  scheduledEnd: string;
  estimatedCost?: number;
  preOp?: Partial<PreOpChecklist>;
}

export type BookingResult =
  | { ok: true; booking: SurgeryBooking }
  | { ok: false; error: string };

function emptyPreOp(): PreOpChecklist {
  return {
    consentSigned: false,
    fastingConfirmed: false,
    allergiesReviewed: false,
    siteMarked: false,
    bloodAvailable: false,
    imagingAvailable: false,
  };
}

export function createBooking(
  organizationId: string,
  input: BookingInput
): BookingResult {
  const start = new Date(input.scheduledStart).getTime();
  const end = new Date(input.scheduledEnd).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { ok: false, error: "invalid_times" };
  }
  const ot = theatres.find(
    (t) => t.id === input.otId && t.organizationId === organizationId
  );
  if (!ot) return { ok: false, error: "ot_not_found" };
  if (overlapsExisting(organizationId, input.otId, start, end)) {
    return { ok: false, error: "ot_conflict" };
  }
  const now = new Date().toISOString();
  const b: SurgeryBooking = {
    id: `sx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    admissionId: input.admissionId,
    encounterId: input.encounterId,
    otId: input.otId,
    procedureName: input.procedureName.trim(),
    procedureCode: input.procedureCode?.trim() || undefined,
    priority: input.priority || "elective",
    anesthesiaType: input.anesthesiaType || "general",
    primarySurgeon: input.primarySurgeon.trim(),
    team: (input.team || []).filter((t) => t.name?.trim()),
    scheduledStart: new Date(start).toISOString(),
    scheduledEnd: new Date(end).toISOString(),
    preOp: { ...emptyPreOp(), ...(input.preOp || {}) },
    estimatedCost: input.estimatedCost,
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  };
  bookings.unshift(b);
  flushBK();
  return { ok: true, booking: b };
}

export function updateBooking(
  id: string,
  organizationId: string,
  patch: Partial<
    BookingInput & {
      status: SurgeryStatus;
      operativeNotes: string;
      postOpInstructions: string;
      complications: string;
      preOp: Partial<PreOpChecklist>;
    }
  >
): BookingResult {
  const b = bookings.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!b) return { ok: false, error: "not_found" };

  // Reschedule path: re-check OT conflict.
  if (patch.scheduledStart !== undefined || patch.scheduledEnd !== undefined) {
    const start = new Date(patch.scheduledStart || b.scheduledStart).getTime();
    const end = new Date(patch.scheduledEnd || b.scheduledEnd).getTime();
    const otId = patch.otId || b.otId;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return { ok: false, error: "invalid_times" };
    }
    if (overlapsExisting(organizationId, otId, start, end, b.id)) {
      return { ok: false, error: "ot_conflict" };
    }
    b.scheduledStart = new Date(start).toISOString();
    b.scheduledEnd = new Date(end).toISOString();
    if (patch.otId !== undefined) b.otId = patch.otId;
  }

  if (patch.procedureName !== undefined) b.procedureName = patch.procedureName.trim();
  if (patch.procedureCode !== undefined) b.procedureCode = patch.procedureCode?.trim() || undefined;
  if (patch.priority !== undefined) b.priority = patch.priority;
  if (patch.anesthesiaType !== undefined) b.anesthesiaType = patch.anesthesiaType;
  if (patch.primarySurgeon !== undefined) b.primarySurgeon = patch.primarySurgeon.trim();
  if (patch.team !== undefined) b.team = patch.team.filter((t) => t.name?.trim());
  if (patch.estimatedCost !== undefined) b.estimatedCost = patch.estimatedCost;
  if (patch.preOp !== undefined) b.preOp = { ...b.preOp, ...patch.preOp };
  if (patch.operativeNotes !== undefined) b.operativeNotes = patch.operativeNotes;
  if (patch.postOpInstructions !== undefined) b.postOpInstructions = patch.postOpInstructions;
  if (patch.complications !== undefined) b.complications = patch.complications;

  if (patch.status !== undefined) {
    b.status = patch.status;
    const now = new Date().toISOString();
    if (patch.status === "in_progress" && !b.actualStart) b.actualStart = now;
    if (patch.status === "completed" && !b.actualEnd) b.actualEnd = now;
  }

  b.updatedAt = new Date().toISOString();
  flushBK();
  return { ok: true, booking: b };
}

export function cancelBooking(
  id: string,
  organizationId: string
): SurgeryBooking | null {
  const b = bookings.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!b) return null;
  if (b.status === "completed") return null;
  b.status = "cancelled";
  b.updatedAt = new Date().toISOString();
  flushBK();
  return b;
}

export function deleteBooking(id: string, organizationId: string): boolean {
  const i = bookings.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  if (bookings[i].status === "in_progress") return false;
  bookings.splice(i, 1);
  flushBK();
  return true;
}

export function deleteBookingsForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = bookings.length - 1; i >= 0; i--) {
    const b = bookings[i];
    if (b.patientId === patientId && b.organizationId === organizationId) {
      bookings.splice(i, 1);
      removed++;
    }
  }
  if (removed) flushBK();
  return removed;
}
