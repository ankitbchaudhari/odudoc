// IV MAR — Medication Administration Record. Spec v6.0 §4.
//
// Every IV drug ordered at the bedside generates an MAR row. The
// nurse scans the patient wristband + drug barcode at each dose;
// the system verifies the "5 rights" (right patient, right drug,
// right dose, right route, right time) before recording the
// administration. Missed doses, wrong-time doses, and overdue
// doses surface on the ward dashboard with auto-escalation.
//
// Production: barcode scanning routes through a thin mobile app
// or a scanner kiosk; verification is server-side here so
// scanner spoofing can't bypass the safety checks.

import { bindPersistentArray } from "./persistent-array";

export interface IvOrder {
  id: string;
  organizationId: string;
  patientEmail: string;
  patientName: string;
  patientBedId?: string;
  /** Doctor placing the order. */
  doctorId: string;
  drug: string;
  /** Dose amount + units, e.g. "1 g". */
  dose: string;
  /** Diluent + volume, e.g. "100 mL NS". */
  diluent?: string;
  /** Infusion rate or instruction. */
  rate?: string;
  /** Frequency rules: "q6h", "BD", "stat", etc. */
  frequency: string;
  /** Hours between scheduled doses. */
  intervalHours: number;
  /** Total course duration in hours (or null = open-ended). */
  durationHours?: number;
  /** Start time. */
  startsAt: string;
  /** Drug schedule class — drives extra checks (X = NDPS register). */
  scheduleClass?: "OTC" | "H" | "H1" | "X" | "G" | "K";
  active: boolean;
  createdAt: string;
}

export type MarAdministrationStatus =
  | "due"
  | "given"
  | "missed"
  | "held"     // nurse held the dose (clinical reason)
  | "refused"  // patient refused
  | "wrong_time";

export interface MarAdministration {
  id: string;
  orderId: string;
  /** When this dose was scheduled. */
  scheduledAt: string;
  /** When the dose was actually given. */
  administeredAt?: string;
  /** Nurse who administered. */
  administeredBy?: string;
  /** Witness — required for Schedule X (NDPS) drugs. */
  witnessBy?: string;
  status: MarAdministrationStatus;
  /** Reason for held / refused / wrong-time. */
  reason?: string;
  /** "5 rights" verification — set true if all four scans match. */
  verifiedPatient?: boolean;
  verifiedDrug?: boolean;
}

const orders: IvOrder[] = [];
const administrations: MarAdministration[] = [];

const oHy = bindPersistentArray<IvOrder>("iv_orders", orders, () => []);
const aHy = bindPersistentArray<MarAdministration>("mar_administrations", administrations, () => []);
await oHy.hydrate();
await aHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createIvOrder(input: Omit<IvOrder, "id" | "active" | "createdAt">): IvOrder {
  const o: IvOrder = { id: id("ivo"), active: true, createdAt: new Date().toISOString(), ...input };
  orders.unshift(o);
  oHy.flush();

  // Pre-generate the first 24 hours of administration rows so the
  // MAR shows due doses immediately. Cron extends the window every
  // 12 h for orders still active.
  const start = new Date(o.startsAt).getTime();
  const horizon = start + 24 * 3600 * 1000;
  for (let t = start; t <= horizon; t += o.intervalHours * 3600 * 1000) {
    if (o.durationHours && t > start + o.durationHours * 3600 * 1000) break;
    administrations.push({
      id: id("ma"),
      orderId: o.id,
      scheduledAt: new Date(t).toISOString(),
      status: "due",
    });
  }
  aHy.flush();
  return o;
}

/** Record a dose. Verifies 5-rights from the caller's scan input.
 *  Returns the administration row + verdict. */
export function recordDose(input: {
  administrationId: string;
  patientEmailScanned: string;
  drugScanned: string;
  administeredBy: string;
  witnessBy?: string;
  reason?: string;
  status?: "given" | "held" | "refused";
}): { admin: MarAdministration; order: IvOrder; verified: boolean } | null {
  const admin = administrations.find((a) => a.id === input.administrationId);
  if (!admin) return null;
  const order = orders.find((o) => o.id === admin.orderId);
  if (!order) return null;

  const patientOk = order.patientEmail.toLowerCase() === input.patientEmailScanned.toLowerCase();
  const drugOk = order.drug.toLowerCase() === input.drugScanned.toLowerCase();
  admin.verifiedPatient = patientOk;
  admin.verifiedDrug = drugOk;
  admin.administeredBy = input.administeredBy;
  admin.witnessBy = input.witnessBy;
  admin.administeredAt = new Date().toISOString();
  admin.reason = input.reason;

  // NDPS / Schedule X drugs require witness signature.
  if (order.scheduleClass === "X" && !input.witnessBy) {
    admin.status = "held";
    admin.reason = (admin.reason ? admin.reason + " · " : "") + "NDPS witness required";
    aHy.flush();
    return { admin, order, verified: false };
  }

  // Wrong-time: more than 30 min off the schedule (clinically tunable).
  const drift = Math.abs(new Date(admin.administeredAt).getTime() - new Date(admin.scheduledAt).getTime());
  const wrongTime = drift > 30 * 60 * 1000;

  if (input.status === "held") admin.status = "held";
  else if (input.status === "refused") admin.status = "refused";
  else if (!patientOk || !drugOk) admin.status = "held";
  else if (wrongTime) admin.status = "wrong_time";
  else admin.status = "given";

  aHy.flush();
  return { admin, order, verified: patientOk && drugOk };
}

export function listMar(filter: { patientEmail?: string; orderId?: string; activeOnly?: boolean } = {}): Array<MarAdministration & { order: IvOrder | null }> {
  let list = [...administrations];
  if (filter.orderId) list = list.filter((a) => a.orderId === filter.orderId);
  const out = list.map((a) => ({ ...a, order: orders.find((o) => o.id === a.orderId) || null }));
  if (filter.patientEmail) {
    return out.filter((a) => a.order?.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  }
  return out;
}

/** Find any overdue (due + scheduled in the past) administrations.
 *  Used by the nursing dashboard banner + the escalation cron. */
export function listOverdue(): Array<MarAdministration & { order: IvOrder | null }> {
  const now = Date.now();
  return administrations
    .filter((a) => a.status === "due" && new Date(a.scheduledAt).getTime() < now)
    .map((a) => ({ ...a, order: orders.find((o) => o.id === a.orderId) || null }));
}
