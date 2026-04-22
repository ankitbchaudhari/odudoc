// Labor & Delivery Register. Tenant-scoped.
//
// Each Delivery record documents one labor event with mother-side clinical
// detail (labor stage durations, delivery mode, anesthesia, perineal
// condition, estimated blood loss, complications, care team) plus a nested
// list of NewbornRecord — one per baby for singleton/twin/triplet births.
//
// Lifecycle:
//   admitted -> in_labor -> delivered -> discharged
//                                     -> referred (transferred out)
// Derived durations (in minutes) computed at read time:
//   stage1Min = firstStageEndAt - laborOnsetAt
//   stage2Min = deliveredAt     - firstStageEndAt
//   stage3Min = placentaAt      - deliveredAt
//
// When the mother's patient record is deleted we *detach* (unlink) — the
// register is a legal birth document and must survive patient record churn.

import { bindPersistentArray } from "../persistent-array";

export type DeliveryStatus =
  | "admitted"
  | "in_labor"
  | "delivered"
  | "discharged"
  | "referred";

export type DeliveryMode =
  | "normal"
  | "c_section_elective"
  | "c_section_emergency"
  | "vacuum"
  | "forceps"
  | "breech";

export type Anesthesia =
  | "none"
  | "local"
  | "epidural"
  | "spinal"
  | "general";

export type PerinealCondition =
  | "intact"
  | "episiotomy"
  | "tear_1"
  | "tear_2"
  | "tear_3"
  | "tear_4";

export type DeliveryOutcome =
  | "live_birth"
  | "stillbirth"
  | "mother_death"
  | "neonatal_death"
  | "maternal_and_neonatal_death";

export type Complication =
  | "pph"
  | "obstructed_labor"
  | "shoulder_dystocia"
  | "cord_prolapse"
  | "eclampsia"
  | "pre_eclampsia"
  | "placenta_previa"
  | "abruption"
  | "retained_placenta"
  | "uterine_rupture"
  | "fetal_distress"
  | "meconium"
  | "other";

export type Sex = "male" | "female" | "ambiguous";

export interface NewbornRecord {
  id: string;
  sex: Sex;
  bornAt: string;
  weightG?: number;
  lengthCm?: number;
  headCircumCm?: number;
  apgar1?: number;
  apgar5?: number;
  apgar10?: number;
  alive: boolean;
  resuscitationNeeded: boolean;
  nicuAdmitted: boolean;
  birthCertNo?: string;
  babyName?: string;
  notes?: string;
}

export interface Delivery {
  id: string;
  organizationId: string;
  registerNumber: string; // MATR-{suffix}-{seq}

  motherId?: string;
  motherName: string;
  motherMRN?: string;
  motherAge?: number;
  motherBloodGroup?: string;

  gravidity?: number; // G
  parity?: number; // P
  livingChildren?: number; // L
  abortions?: number; // A

  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number;
  lmp?: string;

  status: DeliveryStatus;
  admittedAt: string;
  laborOnsetAt?: string;
  firstStageEndAt?: string; // full cervical dilation
  deliveredAt?: string;
  placentaAt?: string;
  dischargedAt?: string;

  deliveryMode?: DeliveryMode;
  anesthesia?: Anesthesia;
  perineum?: PerinealCondition;
  bloodLossMl?: number;
  complications: Complication[];

  obstetrician?: string;
  midwife?: string;
  pediatrician?: string;
  room?: string;

  outcome?: DeliveryOutcome;
  referralReason?: string;
  referredTo?: string;

  newborns: NewbornRecord[];
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

const deliveries: Delivery[] = [];
const binding = bindPersistentArray<Delivery>(
  "hospital-maternity-deliveries",
  deliveries,
  () => []
);
await binding.hydrate();
const flush = binding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextRegisterNumber(orgId: string): string {
  const n =
    deliveries.filter((d) => d.organizationId === orgId).length + 1;
  return `MATR-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}
function genNewbornId(): string {
  return `nb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const MODE_LABEL: Record<DeliveryMode, string> = {
  normal: "Normal vaginal",
  c_section_elective: "C-section (elective)",
  c_section_emergency: "C-section (emergency)",
  vacuum: "Assisted — vacuum",
  forceps: "Assisted — forceps",
  breech: "Breech delivery",
};

export const ANESTHESIA_LABEL: Record<Anesthesia, string> = {
  none: "None",
  local: "Local infiltration",
  epidural: "Epidural",
  spinal: "Spinal",
  general: "General",
};

export const PERINEUM_LABEL: Record<PerinealCondition, string> = {
  intact: "Intact",
  episiotomy: "Episiotomy",
  tear_1: "1st degree tear",
  tear_2: "2nd degree tear",
  tear_3: "3rd degree tear",
  tear_4: "4th degree tear",
};

export const OUTCOME_LABEL: Record<DeliveryOutcome, string> = {
  live_birth: "Live birth",
  stillbirth: "Stillbirth",
  mother_death: "Maternal death",
  neonatal_death: "Neonatal death",
  maternal_and_neonatal_death: "Maternal + neonatal death",
};

export const COMPLICATION_LABEL: Record<Complication, string> = {
  pph: "Postpartum hemorrhage",
  obstructed_labor: "Obstructed labor",
  shoulder_dystocia: "Shoulder dystocia",
  cord_prolapse: "Cord prolapse",
  eclampsia: "Eclampsia",
  pre_eclampsia: "Pre-eclampsia",
  placenta_previa: "Placenta previa",
  abruption: "Placental abruption",
  retained_placenta: "Retained placenta",
  uterine_rupture: "Uterine rupture",
  fetal_distress: "Fetal distress",
  meconium: "Meconium-stained liquor",
  other: "Other",
};

// ---------- CRUD ----------

export function listDeliveries(opts: {
  organizationId: string;
  status?: DeliveryStatus;
  motherId?: string;
  from?: string;
  to?: string;
}): Delivery[] {
  let list = deliveries.filter(
    (d) => d.organizationId === opts.organizationId
  );
  if (opts.status) list = list.filter((d) => d.status === opts.status);
  if (opts.motherId) list = list.filter((d) => d.motherId === opts.motherId);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((d) => new Date(d.admittedAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((d) => new Date(d.admittedAt).getTime() <= t);
  }
  const order: Record<DeliveryStatus, number> = {
    in_labor: 0,
    admitted: 1,
    delivered: 2,
    referred: 3,
    discharged: 4,
  };
  return list.sort((a, b) => {
    const s = order[a.status] - order[b.status];
    if (s !== 0) return s;
    return (
      new Date(b.admittedAt).getTime() - new Date(a.admittedAt).getTime()
    );
  });
}

export interface NewbornInput {
  id?: string;
  sex?: Sex;
  bornAt?: string;
  weightG?: number;
  lengthCm?: number;
  headCircumCm?: number;
  apgar1?: number;
  apgar5?: number;
  apgar10?: number;
  alive?: boolean;
  resuscitationNeeded?: boolean;
  nicuAdmitted?: boolean;
  birthCertNo?: string;
  babyName?: string;
  notes?: string;
}

export interface DeliveryInput {
  motherId?: string;
  motherName?: string;
  motherMRN?: string;
  motherAge?: number;
  motherBloodGroup?: string;
  gravidity?: number;
  parity?: number;
  livingChildren?: number;
  abortions?: number;
  gestationalAgeWeeks?: number;
  gestationalAgeDays?: number;
  lmp?: string;
  status?: DeliveryStatus;
  admittedAt?: string;
  laborOnsetAt?: string;
  firstStageEndAt?: string;
  deliveredAt?: string;
  placentaAt?: string;
  dischargedAt?: string;
  deliveryMode?: DeliveryMode;
  anesthesia?: Anesthesia;
  perineum?: PerinealCondition;
  bloodLossMl?: number;
  complications?: Complication[];
  obstetrician?: string;
  midwife?: string;
  pediatrician?: string;
  room?: string;
  outcome?: DeliveryOutcome;
  referralReason?: string;
  referredTo?: string;
  newborns?: NewbornInput[];
  notes?: string;
}

function buildNewborns(input?: NewbornInput[]): NewbornRecord[] {
  if (!input) return [];
  const now = new Date().toISOString();
  return input.map((n) => ({
    id: n.id || genNewbornId(),
    sex: n.sex || "female",
    bornAt: n.bornAt || now,
    weightG: n.weightG,
    lengthCm: n.lengthCm,
    headCircumCm: n.headCircumCm,
    apgar1: n.apgar1,
    apgar5: n.apgar5,
    apgar10: n.apgar10,
    alive: n.alive ?? true,
    resuscitationNeeded: n.resuscitationNeeded ?? false,
    nicuAdmitted: n.nicuAdmitted ?? false,
    birthCertNo: n.birthCertNo?.trim() || undefined,
    babyName: n.babyName?.trim() || undefined,
    notes: n.notes?.trim() || undefined,
  }));
}

export function createDelivery(
  organizationId: string,
  input: DeliveryInput
):
  | { ok: false; error: string }
  | { ok: true; delivery: Delivery } {
  if (!input.motherName || !input.motherName.trim()) {
    return { ok: false, error: "missing_mother" };
  }
  const now = new Date().toISOString();
  const d: Delivery = {
    id: `del-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    registerNumber: nextRegisterNumber(organizationId),
    motherId: input.motherId || undefined,
    motherName: input.motherName.trim(),
    motherMRN: input.motherMRN?.trim() || undefined,
    motherAge: input.motherAge,
    motherBloodGroup: input.motherBloodGroup?.trim() || undefined,
    gravidity: input.gravidity,
    parity: input.parity,
    livingChildren: input.livingChildren,
    abortions: input.abortions,
    gestationalAgeWeeks: input.gestationalAgeWeeks,
    gestationalAgeDays: input.gestationalAgeDays,
    lmp: input.lmp || undefined,
    status: input.status || "admitted",
    admittedAt: input.admittedAt || now,
    laborOnsetAt: input.laborOnsetAt || undefined,
    firstStageEndAt: input.firstStageEndAt || undefined,
    deliveredAt: input.deliveredAt || undefined,
    placentaAt: input.placentaAt || undefined,
    dischargedAt: input.dischargedAt || undefined,
    deliveryMode: input.deliveryMode,
    anesthesia: input.anesthesia,
    perineum: input.perineum,
    bloodLossMl: input.bloodLossMl,
    complications: input.complications || [],
    obstetrician: input.obstetrician?.trim() || undefined,
    midwife: input.midwife?.trim() || undefined,
    pediatrician: input.pediatrician?.trim() || undefined,
    room: input.room?.trim() || undefined,
    outcome: input.outcome,
    referralReason: input.referralReason?.trim() || undefined,
    referredTo: input.referredTo?.trim() || undefined,
    newborns: buildNewborns(input.newborns),
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  deliveries.unshift(d);
  flush();
  return { ok: true, delivery: d };
}

export function updateDelivery(
  id: string,
  organizationId: string,
  patch: DeliveryInput
): Delivery | null {
  const d = deliveries.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!d) return null;
  const now = new Date().toISOString();

  // Mother-side
  if (patch.motherId !== undefined) d.motherId = patch.motherId || undefined;
  if (patch.motherName !== undefined && patch.motherName.trim())
    d.motherName = patch.motherName.trim();
  if (patch.motherMRN !== undefined)
    d.motherMRN = patch.motherMRN?.trim() || undefined;
  if (patch.motherAge !== undefined) d.motherAge = patch.motherAge;
  if (patch.motherBloodGroup !== undefined)
    d.motherBloodGroup = patch.motherBloodGroup?.trim() || undefined;
  if (patch.gravidity !== undefined) d.gravidity = patch.gravidity;
  if (patch.parity !== undefined) d.parity = patch.parity;
  if (patch.livingChildren !== undefined)
    d.livingChildren = patch.livingChildren;
  if (patch.abortions !== undefined) d.abortions = patch.abortions;
  if (patch.gestationalAgeWeeks !== undefined)
    d.gestationalAgeWeeks = patch.gestationalAgeWeeks;
  if (patch.gestationalAgeDays !== undefined)
    d.gestationalAgeDays = patch.gestationalAgeDays;
  if (patch.lmp !== undefined) d.lmp = patch.lmp || undefined;

  // Timestamps
  if (patch.admittedAt !== undefined) d.admittedAt = patch.admittedAt;
  if (patch.laborOnsetAt !== undefined)
    d.laborOnsetAt = patch.laborOnsetAt || undefined;
  if (patch.firstStageEndAt !== undefined)
    d.firstStageEndAt = patch.firstStageEndAt || undefined;
  if (patch.deliveredAt !== undefined)
    d.deliveredAt = patch.deliveredAt || undefined;
  if (patch.placentaAt !== undefined)
    d.placentaAt = patch.placentaAt || undefined;
  if (patch.dischargedAt !== undefined)
    d.dischargedAt = patch.dischargedAt || undefined;

  // Clinical
  if (patch.deliveryMode !== undefined) d.deliveryMode = patch.deliveryMode;
  if (patch.anesthesia !== undefined) d.anesthesia = patch.anesthesia;
  if (patch.perineum !== undefined) d.perineum = patch.perineum;
  if (patch.bloodLossMl !== undefined) d.bloodLossMl = patch.bloodLossMl;
  if (patch.complications !== undefined)
    d.complications = patch.complications || [];

  // Team / room
  if (patch.obstetrician !== undefined)
    d.obstetrician = patch.obstetrician?.trim() || undefined;
  if (patch.midwife !== undefined) d.midwife = patch.midwife?.trim() || undefined;
  if (patch.pediatrician !== undefined)
    d.pediatrician = patch.pediatrician?.trim() || undefined;
  if (patch.room !== undefined) d.room = patch.room?.trim() || undefined;

  // Outcome / referral
  if (patch.outcome !== undefined) d.outcome = patch.outcome;
  if (patch.referralReason !== undefined)
    d.referralReason = patch.referralReason?.trim() || undefined;
  if (patch.referredTo !== undefined)
    d.referredTo = patch.referredTo?.trim() || undefined;

  if (patch.newborns !== undefined) d.newborns = buildNewborns(patch.newborns);
  if (patch.notes !== undefined) d.notes = patch.notes?.trim() || undefined;

  // Status transitions with light auto-stamping
  if (patch.status !== undefined && patch.status !== d.status) {
    const prev = d.status;
    d.status = patch.status;
    if (patch.status === "in_labor" && !d.laborOnsetAt) d.laborOnsetAt = now;
    if (patch.status === "delivered" && !d.deliveredAt) d.deliveredAt = now;
    if (patch.status === "discharged" && !d.dischargedAt) d.dischargedAt = now;
    // Referred from any pre-delivered stage → record timestamp into notes if empty
    if (patch.status === "referred" && prev !== "referred" && !d.outcome) {
      // leave outcome null — referral is out-of-register result
    }
  }

  d.updatedAt = now;
  flush();
  return d;
}

export function deleteDelivery(
  id: string,
  organizationId: string
): boolean {
  const idx = deliveries.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  deliveries.splice(idx, 1);
  flush();
  return true;
}

// Patient cascade — DETACH ONLY. Birth register is a legal document.
export function unlinkDeliveriesForPatient(
  organizationId: string,
  patientId: string
): number {
  let n = 0;
  for (const d of deliveries) {
    if (d.organizationId === organizationId && d.motherId === patientId) {
      d.motherId = undefined;
      d.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flush();
  return n;
  // flush:auto-unlink
  deliveries.splice(deliveries.length, 0);
}

// ---------- Derived ----------

export function stageMinutes(d: Delivery): {
  stage1?: number;
  stage2?: number;
  stage3?: number;
} {
  const diff = (a?: string, b?: string): number | undefined => {
    if (!a || !b) return undefined;
    const x = new Date(b).getTime() - new Date(a).getTime();
    return Number.isFinite(x) && x >= 0 ? Math.round(x / 60000) : undefined;
  };
  return {
    stage1: diff(d.laborOnsetAt, d.firstStageEndAt),
    stage2: diff(d.firstStageEndAt, d.deliveredAt),
    stage3: diff(d.deliveredAt, d.placentaAt),
  };
}

// ---------- Stats ----------

export interface MaternityStats {
  activeLabor: number;
  deliveriesToday: number;
  deliveriesThisMonth: number;
  normalPct: number; // % normal vs c-section this month
  csectionPct: number;
  avgBloodLossMl: number; // completed this month
  complicationsThisMonth: number; // any complication
  stillbirthsThisMonth: number;
  neonatalDeathsThisMonth: number;
  nicuAdmitsThisMonth: number;
}

export function computeStats(organizationId: string): MaternityStats {
  const now = Date.now();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + 24 * 3600 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const org = deliveries.filter((d) => d.organizationId === organizationId);

  const activeLabor = org.filter(
    (d) => d.status === "in_labor" || d.status === "admitted"
  ).length;
  const deliveriesToday = org.filter(
    (d) =>
      d.deliveredAt &&
      new Date(d.deliveredAt).getTime() >= todayStart.getTime() &&
      new Date(d.deliveredAt).getTime() < todayEnd
  ).length;

  const monthDelivered = org.filter(
    (d) =>
      d.deliveredAt &&
      new Date(d.deliveredAt).getTime() >= monthStart.getTime()
  );
  const deliveriesThisMonth = monthDelivered.length;
  const normal = monthDelivered.filter(
    (d) => d.deliveryMode === "normal"
  ).length;
  const csect = monthDelivered.filter(
    (d) =>
      d.deliveryMode === "c_section_elective" ||
      d.deliveryMode === "c_section_emergency"
  ).length;
  const normalPct = deliveriesThisMonth
    ? Math.round((normal / deliveriesThisMonth) * 100)
    : 0;
  const csectionPct = deliveriesThisMonth
    ? Math.round((csect / deliveriesThisMonth) * 100)
    : 0;

  const bl = monthDelivered
    .map((d) => d.bloodLossMl || 0)
    .filter((x) => x > 0);
  const avgBloodLossMl = bl.length
    ? Math.round(bl.reduce((s, x) => s + x, 0) / bl.length)
    : 0;

  const complicationsThisMonth = monthDelivered.filter(
    (d) => d.complications.length > 0
  ).length;
  const stillbirthsThisMonth = monthDelivered.filter((d) =>
    d.newborns.some((n) => !n.alive)
  ).length;
  const neonatalDeathsThisMonth = monthDelivered.filter(
    (d) =>
      d.outcome === "neonatal_death" ||
      d.outcome === "maternal_and_neonatal_death"
  ).length;
  const nicuAdmitsThisMonth = monthDelivered.reduce(
    (s, d) => s + d.newborns.filter((n) => n.nicuAdmitted).length,
    0
  );

  // suppress unused-var warning for `now`
  void now;

  return {
    activeLabor,
    deliveriesToday,
    deliveriesThisMonth,
    normalPct,
    csectionPct,
    avgBloodLossMl,
    complicationsThisMonth,
    stillbirthsThisMonth,
    neonatalDeathsThisMonth,
    nicuAdmitsThisMonth,
  };
}
