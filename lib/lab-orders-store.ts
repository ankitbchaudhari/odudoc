// Laboratory order + result tracking. One LabOrder = one test (or
// panel) requested by a doctor for a patient. The order moves
// through pending → collected → in_progress → ready → delivered;
// the lab tech enters the result + abnormal flag at the "ready"
// transition.

import { bindPersistentArray } from "./persistent-array";

export type LabOrderStatus =
  | "pending"        // ordered, awaiting collection
  | "collected"      // sample taken
  | "in_progress"   // running on analyser
  | "ready"         // result entered
  | "delivered"     // sent to ordering doctor
  | "rejected"      // sample rejected (haemolysis etc.)
  | "cancelled";

export interface LabOrder {
  id: string;
  doctorEmail: string;          // clinic owner
  patientId: string;
  patientName: string;
  orderedBy: string;            // ordering doctor email
  testName: string;
  testCode?: string;            // LOINC / NABL code if known
  panel?: string;               // "Lipid profile" — group label
  visitId?: string;             // tie to admission/visit if applicable
  status: LabOrderStatus;
  /** Result text once entered. */
  resultValue?: string;
  /** Reference range as a hint string. */
  refRange?: string;
  /** True when the value falls outside the reference range. */
  abnormal?: boolean;
  collectedAt?: string;
  reportedAt?: string;
  reportedBy?: string;          // lab tech email
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: LabOrder[] = [];
const {
  hydrate: hydrateOrders,
  reload: reloadOrdersInternal,
  flush: flushOrders,
} = bindPersistentArray<LabOrder>("emr-lab-orders", orders, () => []);

await hydrateOrders();
export async function reloadLabOrders() { await reloadOrdersInternal(); }

const nowIso = () => new Date().toISOString();
const newId = () => `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface CreateLabOrderInput {
  doctorEmail: string;
  patientId: string;
  patientName: string;
  orderedBy: string;
  testName: string;
  testCode?: string;
  panel?: string;
  visitId?: string;
  notes?: string;
}

export async function createLabOrder(input: CreateLabOrderInput): Promise<LabOrder> {
  const row: LabOrder = {
    id: newId(),
    doctorEmail: input.doctorEmail.toLowerCase(),
    patientId: input.patientId,
    patientName: input.patientName,
    orderedBy: input.orderedBy.toLowerCase(),
    testName: input.testName,
    testCode: input.testCode,
    panel: input.panel,
    visitId: input.visitId,
    status: "pending",
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  orders.push(row);
  flushOrders();
  return row;
}

export async function listLabOrders(opts: {
  doctorEmail: string;
  status?: LabOrderStatus | "All";
  orderedBy?: string;
  patientId?: string;
}): Promise<LabOrder[]> {
  await hydrateOrders();
  const e = opts.doctorEmail.toLowerCase();
  let list = orders.filter((o) => o.doctorEmail === e);
  if (opts.status && opts.status !== "All") list = list.filter((o) => o.status === opts.status);
  if (opts.orderedBy) {
    const ob = opts.orderedBy.toLowerCase();
    list = list.filter((o) => o.orderedBy === ob);
  }
  if (opts.patientId) list = list.filter((o) => o.patientId === opts.patientId);
  list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return list;
}

export async function updateLabOrder(
  id: string,
  doctorEmail: string,
  patch: Partial<Omit<LabOrder, "id" | "doctorEmail" | "createdAt">> & { reportedBy?: string },
): Promise<LabOrder | null> {
  await hydrateOrders();
  const r = orders.find((x) => x.id === id && x.doctorEmail === doctorEmail.toLowerCase());
  if (!r) return null;
  if (patch.status === "collected" && !r.collectedAt) r.collectedAt = nowIso();
  if (patch.status === "ready" && !r.reportedAt) r.reportedAt = nowIso();
  Object.assign(r, patch, { updatedAt: nowIso() });
  flushOrders();
  return r;
}
