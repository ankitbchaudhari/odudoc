// AR Receipts - patient/payer receipt capture & aging. Tenant-scoped.
import { bindPersistentArray } from "../persistent-array";

export type ReceiptMethod = "cash" | "card" | "upi" | "neft" | "rtgs" | "cheque" | "wallet" | "insurance" | "corporate" | "other";
export type ReceiptKind = "advance" | "invoice" | "refund" | "deposit";

export interface Receipt {
  id: string; organizationId: string;
  receiptDate: string;
  patientId?: string;
  patientName?: string;
  payerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  method: ReceiptMethod;
  kind: ReceiptKind;
  reference?: string;
  bankAccount?: string;
  receivedBy: string;
  counter?: string;
  notes?: string;
  voided: boolean;
  createdAt: string; updatedAt: string;
}

const receipts: Receipt[] = [];
const h = bindPersistentArray<Receipt>("ar-receipts", receipts, () => []);
await h;

export const METHOD_LABEL: Record<ReceiptMethod, string> = {
  cash: "Cash", card: "Card", upi: "UPI", neft: "NEFT", rtgs: "RTGS",
  cheque: "Cheque", wallet: "Wallet", insurance: "Insurance", corporate: "Corporate", other: "Other",
};
export const KIND_LABEL: Record<ReceiptKind, string> = {
  advance: "Advance", invoice: "Invoice payment", refund: "Refund", deposit: "Deposit",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(list: Receipt[], orgId: string) {
  const p = `RCP-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listReceipts(opts: { organizationId: string; method?: ReceiptMethod; kind?: ReceiptKind; patientId?: string }): Receipt[] {
  return receipts.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.method ? r.method === opts.method : true))
    .filter((r) => (opts.kind ? r.kind === opts.kind : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
}
export function createReceipt(orgId: string, input: Partial<Receipt>): { ok: true; record: Receipt } | { ok: false; error: string } {
  if (!input.receiptDate || !input.payerName || !input.amount || !input.method || !input.receivedBy) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: Receipt = {
    id: nextId(receipts, orgId), organizationId: orgId,
    receiptDate: input.receiptDate,
    patientId: input.patientId, patientName: input.patientName,
    payerName: input.payerName,
    invoiceId: input.invoiceId, invoiceNumber: input.invoiceNumber,
    amount: Number(input.amount) || 0,
    method: input.method as ReceiptMethod,
    kind: (input.kind || "invoice") as ReceiptKind,
    reference: input.reference, bankAccount: input.bankAccount,
    receivedBy: input.receivedBy, counter: input.counter,
    notes: input.notes, voided: input.voided ?? false,
    createdAt: now, updatedAt: now,
  };
  receipts.push(r); return { ok: true, record: r };
}
export function updateReceipt(id: string, orgId: string, patch: Partial<Receipt>): Receipt | null {
  const i = receipts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  receipts.splice(i, 1, { ...receipts[i], ...patch, id: receipts[i].id, organizationId: receipts[i].organizationId, updatedAt: new Date().toISOString() });
  return receipts[i];
}
export function deleteReceipt(id: string, orgId: string): boolean {
  const i = receipts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  receipts.splice(i, 1); return true;
}

export function computeStats(orgId: string) {
  const my = receipts.filter((r) => r.organizationId === orgId && !r.voided);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const byMethod: Record<string, number> = {};
  for (const r of my.filter((r) => r.receiptDate >= monthStart)) byMethod[r.method] = (byMethod[r.method] || 0) + r.amount;
  return {
    collectedToday: Math.round(my.filter((r) => r.receiptDate === today).reduce((s, r) => s + r.amount, 0)),
    collectedMonth: Math.round(my.filter((r) => r.receiptDate >= monthStart).reduce((s, r) => s + r.amount, 0)),
    count: my.length,
    advancesHeld: Math.round(my.filter((r) => r.kind === "advance").reduce((s, r) => s + r.amount, 0)),
    refundsMonth: Math.round(my.filter((r) => r.kind === "refund" && r.receiptDate >= monthStart).reduce((s, r) => s + r.amount, 0)),
    methodBreakdown: byMethod,
  };
}

export function unlinkReceiptsForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of receipts) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = r.patientName ? `[removed] ${r.patientName}` : "[removed]";
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  receipts.splice(receipts.length, 0);
}
