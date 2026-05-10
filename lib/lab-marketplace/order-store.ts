// Lab order lifecycle.
//
//   placed → confirmed → sample_collected → in_lab → reported → closed
//   placed → cancelled
//
// "sample_collected" only applies when the patient picks home
// collection. In-lab visits skip straight from confirmed → in_lab
// (when the patient checks in) and on to reported.

import { bindPersistentArray } from "../persistent-array";
import { pushNotification } from "../notifications/store";

export type LabOrderStatus =
  | "placed"
  | "confirmed"
  | "sample_collected"
  | "in_lab"
  | "reported"
  | "closed"
  | "cancelled";

export interface LabOrderLine {
  testCode: string;
  testName?: string;
  pricedRupees: number;
  mrpRupees: number;
  testEntryId?: string;
  /** Result blob — labs upload structured key/value when reported. */
  resultText?: string;
  resultUrl?: string;
}

export interface LabOrder {
  id: string;
  patientUserId: string;
  patientName: string;
  patientPhone?: string;
  /** Either home-collection address or in-lab walk-in slot. */
  fulfilment: "home_collection" | "in_lab";
  address?: string;
  scheduledFor?: string;
  labId: string;
  labName: string;
  /** Source — encounter id when ordered by a doctor; "self_request"
   *  when patient self-orders. */
  source: "encounter" | "self_request";
  encounterId?: string;
  doctorName?: string;
  lines: LabOrderLine[];
  subtotalRupees: number;
  collectionFeeRupees: number;
  totalRupees: number;
  marketplaceFeePct: number;
  labNetRupees: number;
  status: LabOrderStatus;
  events: Array<{ at: string; status: LabOrderStatus; note?: string }>;
  paymentStatus: "pending" | "paid" | "refunded";
  /** Aggregate report URL once the lab finalises. */
  reportUrl?: string;
  reportedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: LabOrder[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<LabOrder>(
  "lab_orders",
  orders,
  () => []
);
await hydrate();

const DEFAULT_FEE_PCT = 7;

export function listOrdersForPatient(userId: string): LabOrder[] {
  return orders
    .filter((o) => o.patientUserId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function listOrdersForLab(labId: string): LabOrder[] {
  return orders
    .filter((o) => o.labId === labId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getOrder(id: string): LabOrder | null {
  return orders.find((o) => o.id === id) || null;
}

export interface CreateLabOrderInput {
  patientUserId: string;
  patientName: string;
  patientPhone?: string;
  fulfilment: LabOrder["fulfilment"];
  address?: string;
  scheduledFor?: string;
  labId: string;
  labName: string;
  source?: LabOrder["source"];
  encounterId?: string;
  doctorName?: string;
  lines: LabOrderLine[];
  collectionFeeRupees?: number;
  marketplaceFeePct?: number;
}

export function createLabOrder(input: CreateLabOrderInput): LabOrder {
  const subtotal = input.lines.reduce((a, l) => a + l.pricedRupees, 0);
  const fee = input.marketplaceFeePct ?? DEFAULT_FEE_PCT;
  const collection = input.collectionFeeRupees ?? 0;
  const total = subtotal + collection;
  const labNet = Math.round(total * (1 - fee / 100));
  const now = new Date().toISOString();
  const o: LabOrder = {
    id: `labo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    patientUserId: input.patientUserId,
    patientName: input.patientName,
    patientPhone: input.patientPhone,
    fulfilment: input.fulfilment,
    address: input.address?.trim(),
    scheduledFor: input.scheduledFor,
    labId: input.labId,
    labName: input.labName,
    source: input.source || "self_request",
    encounterId: input.encounterId,
    doctorName: input.doctorName,
    lines: input.lines,
    subtotalRupees: Math.round(subtotal),
    collectionFeeRupees: Math.round(collection),
    totalRupees: Math.round(total),
    marketplaceFeePct: fee,
    labNetRupees: labNet,
    status: "placed",
    events: [{ at: now, status: "placed" }],
    paymentStatus: "pending",
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

const NEXT: Record<LabOrderStatus, LabOrderStatus[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["sample_collected", "in_lab", "cancelled"],
  sample_collected: ["in_lab", "cancelled"],
  in_lab: ["reported", "cancelled"],
  reported: ["closed"],
  closed: [],
  cancelled: [],
};

export interface TransitionInput {
  id: string;
  to: LabOrderStatus;
  note?: string;
  reportUrl?: string;
  /** Per-line result text/url updates — used on `reported`. */
  results?: Record<string, { resultText?: string; resultUrl?: string }>;
}

export function transitionLabOrder(input: TransitionInput): LabOrder | null {
  const o = orders.find((x) => x.id === input.id);
  if (!o) return null;
  if (!NEXT[o.status].includes(input.to)) return null;
  const at = new Date().toISOString();
  o.status = input.to;
  if (input.to === "reported") {
    o.reportedAt = at;
    o.paymentStatus = "paid";
    if (input.reportUrl) o.reportUrl = input.reportUrl;
    if (input.results) {
      for (const ln of o.lines) {
        const r = input.results[ln.testEntryId || ln.testCode];
        if (r) {
          if (r.resultText !== undefined) ln.resultText = r.resultText;
          if (r.resultUrl !== undefined) ln.resultUrl = r.resultUrl;
        }
      }
    }
  }
  if (input.to === "cancelled") {
    if (o.paymentStatus === "paid") o.paymentStatus = "refunded";
  }
  o.events.push({ at, status: input.to, note: input.note?.trim() || undefined });
  o.updatedAt = at;
  flush();

  // Patient-facing notifications. Idempotent on (userId, kind, reference)
  // so re-running a transition doesn't double-notify.
  if (input.to === "confirmed") {
    pushNotification({
      userId: o.patientUserId, kind: "lab_result_ready", severity: "info",
      title: `Lab order confirmed`,
      body: `${o.labName} confirmed your booking${o.scheduledFor ? ` for ${new Date(o.scheduledFor).toLocaleString()}` : ""}.`,
      link: `/dashboard/labs`, reference: `${o.id}:confirmed`,
    });
  } else if (input.to === "sample_collected") {
    pushNotification({
      userId: o.patientUserId, kind: "lab_result_ready", severity: "success",
      title: `Sample collected`,
      body: `${o.labName} has your sample. Reports usually arrive within 24 hours.`,
      link: `/dashboard/labs`, reference: `${o.id}:sample_collected`,
    });
  } else if (input.to === "reported") {
    pushNotification({
      userId: o.patientUserId, kind: "lab_result_ready", severity: "success",
      title: `Lab results ready`,
      body: `${o.lines.length} test${o.lines.length === 1 ? "" : "s"} from ${o.labName} reported. Tap to view.`,
      link: o.reportUrl || `/dashboard/labs`, reference: `${o.id}:reported`,
    });
  } else if (input.to === "cancelled") {
    pushNotification({
      userId: o.patientUserId, kind: "lab_result_ready", severity: "warn",
      title: `Lab order cancelled`,
      body: input.note?.trim() ? `${o.labName}: ${input.note.trim()}` : `${o.labName} cancelled order ${o.id}.`,
      link: `/dashboard/labs`, reference: `${o.id}:cancelled`,
    });
  }
  return o;
}

export function deleteOrdersForPatient(userId: string): number {
  let n = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].patientUserId === userId) {
      tombstone(orders[i].id);
      orders.splice(i, 1);
      n++;
    }
  }
  if (n > 0) flush();
  return n;
}
