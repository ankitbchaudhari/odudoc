// Patient admission / check-in / check-out tracking.
//
// Sits alongside the existing emr-store. A row here represents one
// physical visit to the clinic or hospital — registration → check-in
// → consult → check-out → discharge. Reception flips most of the
// states; nurses + doctors append clinical events to the same row
// so everyone has a single source of truth for "where is patient X
// right now?".
//
// Status flow (see lib/clinical-tones for the canonical pill colors):
//   scheduled → checked_in → in_consult → completed
//   completed → admitted → in_or → post_op → discharged
//   any → cancelled / no_show / transferred

import { bindPersistentArray } from "./persistent-array";

export type AdmissionStatus =
  | "scheduled"
  | "checked_in"
  | "in_consult"
  | "completed"
  | "admitted"
  | "in_or"
  | "post_op"
  | "discharged"
  | "transferred"
  | "cancelled"
  | "no_show";

export type Triage = "red" | "yellow" | "green" | "black" | "";

export interface EmrAdmission {
  id: string;
  /** Clinic owner email — same scoping as emr-store. */
  doctorEmail: string;
  patientId: string;
  /** Free-form patient name snapshot so the queue renders fast
   *  without a join. */
  patientName: string;
  /** Optional doctor / department the patient is here to see. */
  consultingDoctorEmail?: string;
  department?: string;
  /** "OPD-1" / "Bed 12" / "OR-2" / "ER-3" — wherever the patient
   *  currently is. Reception updates this when bed/room changes. */
  location?: string;
  reasonForVisit?: string;
  triage?: Triage;
  status: AdmissionStatus;
  /** Original appointment time. */
  scheduledAt?: string;
  checkedInAt?: string;
  checkedInBy?: string;
  consultStartedAt?: string;
  consultEndedAt?: string;
  admittedAt?: string;
  dischargedAt?: string;
  dischargedBy?: string;
  /** Free-form reception notes (allergies flag, accompanying person,
   *  language preference, mobility, etc.). */
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const admissions: EmrAdmission[] = [];
const {
  hydrate: hydrateAdmissions,
  reload: reloadAdmissionsInternal,
  flush: flushAdmissions,
} = bindPersistentArray<EmrAdmission>("emr-admissions", admissions, () => []);

await hydrateAdmissions();

export async function reloadAdmissions() {
  await reloadAdmissionsInternal();
}

function nowIso() {
  return new Date().toISOString();
}

function id() {
  return `adm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface CreateAdmissionInput {
  doctorEmail: string;
  patientId: string;
  patientName: string;
  consultingDoctorEmail?: string;
  department?: string;
  location?: string;
  reasonForVisit?: string;
  triage?: Triage;
  scheduledAt?: string;
  notes?: string;
}

export async function createAdmission(input: CreateAdmissionInput): Promise<EmrAdmission> {
  const row: EmrAdmission = {
    id: id(),
    doctorEmail: input.doctorEmail.toLowerCase(),
    patientId: input.patientId,
    patientName: input.patientName.trim(),
    consultingDoctorEmail: input.consultingDoctorEmail?.toLowerCase(),
    department: input.department,
    location: input.location,
    reasonForVisit: input.reasonForVisit,
    triage: input.triage,
    status: "scheduled",
    scheduledAt: input.scheduledAt,
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  admissions.push(row);
  flushAdmissions();
  return row;
}

export interface ListAdmissionsOptions {
  doctorEmail?: string;
  status?: AdmissionStatus | "All";
  /** Today's queue only — checks scheduledAt or createdAt against
   *  the local day. */
  today?: boolean;
  search?: string;
}

export async function listAdmissions(opts: ListAdmissionsOptions = {}): Promise<EmrAdmission[]> {
  await hydrateAdmissions();
  let list = admissions.slice();
  if (opts.doctorEmail) {
    const e = opts.doctorEmail.toLowerCase();
    list = list.filter((a) => a.doctorEmail === e);
  }
  if (opts.status && opts.status !== "All") {
    list = list.filter((a) => a.status === opts.status);
  }
  if (opts.today) {
    const todayKey = new Date().toISOString().slice(0, 10);
    list = list.filter((a) => {
      const d = (a.scheduledAt || a.createdAt).slice(0, 10);
      return d === todayKey;
    });
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.patientName.toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q) ||
        (a.reasonForVisit || "").toLowerCase().includes(q),
    );
  }
  // Newest pending events at the top.
  list.sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt));
  return list;
}

export async function getAdmissionById(rowId: string): Promise<EmrAdmission | null> {
  await hydrateAdmissions();
  return admissions.find((a) => a.id === rowId) || null;
}

export interface UpdateAdmissionInput {
  status?: AdmissionStatus;
  location?: string;
  triage?: Triage;
  notes?: string;
  consultingDoctorEmail?: string;
  department?: string;
  /** When set, records the actor stamp on the corresponding action. */
  actorEmail?: string;
}

/** Apply a status change with appropriate timestamp side-effects. */
export async function updateAdmission(
  rowId: string,
  patch: UpdateAdmissionInput,
): Promise<EmrAdmission | null> {
  await hydrateAdmissions();
  const a = admissions.find((x) => x.id === rowId);
  if (!a) return null;

  if (patch.status) {
    const now = nowIso();
    if (patch.status === "checked_in" && !a.checkedInAt) {
      a.checkedInAt = now;
      if (patch.actorEmail) a.checkedInBy = patch.actorEmail.toLowerCase();
    }
    if (patch.status === "in_consult" && !a.consultStartedAt) {
      a.consultStartedAt = now;
    }
    if (patch.status === "completed" && !a.consultEndedAt) {
      a.consultEndedAt = now;
    }
    if (patch.status === "admitted" && !a.admittedAt) {
      a.admittedAt = now;
    }
    if (patch.status === "discharged" && !a.dischargedAt) {
      a.dischargedAt = now;
      if (patch.actorEmail) a.dischargedBy = patch.actorEmail.toLowerCase();
    }
    a.status = patch.status;
  }
  if (patch.location !== undefined) a.location = patch.location;
  if (patch.triage !== undefined) a.triage = patch.triage;
  if (patch.notes !== undefined) a.notes = patch.notes;
  if (patch.consultingDoctorEmail !== undefined) a.consultingDoctorEmail = patch.consultingDoctorEmail.toLowerCase();
  if (patch.department !== undefined) a.department = patch.department;
  a.updatedAt = nowIso();
  flushAdmissions();
  return a;
}

/** Counts for KPI tiles on the reception dashboard. */
export interface AdmissionCounts {
  scheduled: number;
  checked_in: number;
  in_consult: number;
  completed: number;
  admitted: number;
  cancelled: number;
  no_show: number;
}

export async function countByStatusToday(doctorEmail: string): Promise<AdmissionCounts> {
  const today = await listAdmissions({ doctorEmail, today: true });
  const seed: AdmissionCounts = {
    scheduled: 0, checked_in: 0, in_consult: 0, completed: 0,
    admitted: 0, cancelled: 0, no_show: 0,
  };
  for (const a of today) {
    if (a.status in seed) (seed as unknown as Record<string, number>)[a.status] += 1;
  }
  return seed;
}
