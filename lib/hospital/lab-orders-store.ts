// Lab orders — clinical lab investigations ordered during or outside of
// an encounter. Tenant-scoped.
//
// Lifecycle: ordered → collected → in_progress → completed (with results) → reported.
// Can also be cancelled at any point before completed.
//
// Each order has N test items (e.g. CBC, LFT, KFT, HbA1c). When the lab
// techs enter results, they attach against the test item. Abnormal flags
// (H/L/critical) are derived from the value vs reference range.

import { bindPersistentArray } from "../persistent-array";

export type LabOrderStatus =
  | "ordered"
  | "collected"
  | "in_progress"
  | "completed"
  | "reported"
  | "cancelled";

export type LabPriority = "routine" | "urgent" | "stat";

export type LabResultFlag = "normal" | "low" | "high" | "critical" | "abnormal";

export interface LabTestItem {
  id: string; // within-order item id
  testName: string;
  testCode?: string; // LOINC or in-house code
  sampleType?: string; // "blood", "urine", "serum"
  // Result payload (filled after sample is processed)
  value?: string; // numeric or text
  unit?: string;
  referenceRange?: string; // "3.5–5.2"
  flag?: LabResultFlag;
  comment?: string;
  resultedAt?: string;
}

export interface LabOrder {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  orderingDoctor?: string;
  priority: LabPriority;
  clinicalNotes?: string; // reason for order
  items: LabTestItem[];
  status: LabOrderStatus;
  orderedAt: string;
  collectedAt?: string;
  completedAt?: string;
  reportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: LabOrder[] = [];
const { hydrate, flush } = bindPersistentArray<LabOrder>(
  "hospital-lab-orders",
  orders,
  () => []
);
await hydrate();

function newItemId(): string {
  return `li-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function cleanItem(i: LabTestItem): LabTestItem {
  return {
    id: i.id || newItemId(),
    testName: i.testName.trim(),
    testCode: i.testCode?.trim() || undefined,
    sampleType: i.sampleType?.trim() || undefined,
    value: i.value?.trim() || undefined,
    unit: i.unit?.trim() || undefined,
    referenceRange: i.referenceRange?.trim() || undefined,
    flag: i.flag,
    comment: i.comment?.trim() || undefined,
    resultedAt: i.resultedAt,
  };
}

export function listLabOrders(opts: {
  organizationId: string;
  patientId?: string;
  encounterId?: string;
  status?: LabOrderStatus;
  priority?: LabPriority;
}): LabOrder[] {
  let list = orders.filter((o) => o.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((o) => o.patientId === opts.patientId);
  if (opts.encounterId) list = list.filter((o) => o.encounterId === opts.encounterId);
  if (opts.status) list = list.filter((o) => o.status === opts.status);
  if (opts.priority) list = list.filter((o) => o.priority === opts.priority);
  return list.sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
  );
}

export function getLabOrderById(
  id: string,
  organizationId: string
): LabOrder | null {
  const o = orders.find((x) => x.id === id);
  if (!o || o.organizationId !== organizationId) return null;
  return o;
}

export interface LabOrderInput {
  patientId: string;
  encounterId?: string;
  orderingDoctor?: string;
  priority?: LabPriority;
  clinicalNotes?: string;
  items: Array<Omit<LabTestItem, "id"> & { id?: string }>;
  orderedAt?: string;
}

export function createLabOrder(
  organizationId: string,
  input: LabOrderInput
): LabOrder {
  const now = new Date().toISOString();
  const o: LabOrder = {
    id: `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    encounterId: input.encounterId || undefined,
    orderingDoctor: input.orderingDoctor?.trim() || undefined,
    priority: input.priority || "routine",
    clinicalNotes: input.clinicalNotes?.trim() || undefined,
    items: (input.items || [])
      .filter((i) => i.testName?.trim())
      .map((i) => cleanItem({ ...i, id: i.id || newItemId() } as LabTestItem)),
    status: "ordered",
    orderedAt: input.orderedAt || now,
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

export function updateLabOrder(
  id: string,
  organizationId: string,
  patch: Partial<
    Omit<LabOrderInput, "patientId"> & {
      status: LabOrderStatus;
      items: LabTestItem[];
    }
  >
): LabOrder | null {
  const o = orders.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!o) return null;
  if (patch.orderingDoctor !== undefined)
    o.orderingDoctor = patch.orderingDoctor?.trim() || undefined;
  if (patch.priority !== undefined) o.priority = patch.priority;
  if (patch.clinicalNotes !== undefined)
    o.clinicalNotes = patch.clinicalNotes?.trim() || undefined;
  if (patch.encounterId !== undefined)
    o.encounterId = patch.encounterId || undefined;
  if (patch.items !== undefined) {
    o.items = patch.items
      .filter((i) => i.testName?.trim())
      .map((i) => cleanItem({ ...i, id: i.id || newItemId() }));
  }
  if (patch.status !== undefined) {
    o.status = patch.status;
    const ts = new Date().toISOString();
    if (patch.status === "collected" && !o.collectedAt) o.collectedAt = ts;
    if (patch.status === "completed" && !o.completedAt) o.completedAt = ts;
    if (patch.status === "reported" && !o.reportedAt) o.reportedAt = ts;
  }
  o.updatedAt = new Date().toISOString();
  flush();
  return o;
}

// Set result values for one or more items of an order. Automatically moves
// the order to "completed" if every item has a value.
export function setLabResults(
  id: string,
  organizationId: string,
  results: Array<{
    itemId: string;
    value?: string;
    unit?: string;
    referenceRange?: string;
    flag?: LabResultFlag;
    comment?: string;
  }>
): LabOrder | null {
  const o = orders.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!o) return null;
  const now = new Date().toISOString();
  for (const r of results) {
    const it = o.items.find((x) => x.id === r.itemId);
    if (!it) continue;
    if (r.value !== undefined) it.value = r.value.trim() || undefined;
    if (r.unit !== undefined) it.unit = r.unit.trim() || undefined;
    if (r.referenceRange !== undefined)
      it.referenceRange = r.referenceRange.trim() || undefined;
    if (r.flag !== undefined) it.flag = r.flag;
    if (r.comment !== undefined) it.comment = r.comment.trim() || undefined;
    if (it.value) it.resultedAt = now;
  }
  const allDone = o.items.length > 0 && o.items.every((i) => i.value);
  if (allDone && o.status !== "reported") {
    o.status = "completed";
    if (!o.completedAt) o.completedAt = now;
  }
  o.updatedAt = now;
  flush();
  return o;
}

export function deleteLabOrder(id: string, organizationId: string): boolean {
  const i = orders.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  orders.splice(i, 1);
  flush();
  return true;
}

export function deleteLabOrdersForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    const o = orders[i];
    if (o.patientId === patientId && o.organizationId === organizationId) {
      orders.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
