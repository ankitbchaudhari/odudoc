// Accounts Payable: Vendor Invoices + Payments. Tenant-scoped.
import { bindPersistentArray } from "../persistent-array";

export type InvoiceStatus = "draft" | "pending_approval" | "approved" | "partial_paid" | "paid" | "cancelled" | "disputed";
export type PaymentMethod = "bank_transfer" | "cheque" | "cash" | "upi" | "rtgs" | "neft" | "card" | "other";

export interface InvoiceLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxPercent?: number;
  amount: number;
}

export interface VendorInvoice {
  id: string; organizationId: string;
  vendorId?: string; vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  poReference?: string;
  grnReference?: string;
  lines: InvoiceLine[];
  subTotal: number;
  taxTotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  balanceAmount: number;
  currency: string;
  status: InvoiceStatus;
  notes?: string;
  createdAt: string; updatedAt: string;
}

export interface VendorPayment {
  id: string; organizationId: string;
  invoiceId: string; invoiceNumber?: string;
  vendorName?: string;
  paymentDate: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  bankAccount?: string;
  paidBy: string;
  notes?: string;
  createdAt: string; updatedAt: string;
}

const invoices: VendorInvoice[] = [];
const payments: VendorPayment[] = [];
const hI = bindPersistentArray<VendorInvoice>("ap-invoices", invoices, () => []);
const hP = bindPersistentArray<VendorPayment>("ap-payments", payments, () => []);
await hI; await hP;

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft", pending_approval: "Pending approval", approved: "Approved",
  partial_paid: "Partial paid", paid: "Paid", cancelled: "Cancelled", disputed: "Disputed",
};
export const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer", cheque: "Cheque", cash: "Cash", upi: "UPI",
  rtgs: "RTGS", neft: "NEFT", card: "Card", other: "Other",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function recompute(inv: VendorInvoice) {
  inv.subTotal = inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  inv.taxTotal = inv.lines.reduce((s, l) => s + l.quantity * l.unitPrice * ((l.taxPercent || 0) / 100), 0);
  inv.total = inv.subTotal + inv.taxTotal - (inv.discount || 0);
  for (const l of inv.lines) l.amount = l.quantity * l.unitPrice * (1 + (l.taxPercent || 0) / 100);
  inv.paidAmount = payments.filter((p) => p.organizationId === inv.organizationId && p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
  inv.balanceAmount = Math.max(0, inv.total - inv.paidAmount);
  if (inv.status !== "cancelled" && inv.status !== "disputed" && inv.status !== "draft" && inv.status !== "pending_approval") {
    if (inv.paidAmount >= inv.total - 0.01) inv.status = "paid";
    else if (inv.paidAmount > 0) inv.status = "partial_paid";
    else inv.status = "approved";
  }
}

export function listInvoices(opts: { organizationId: string; status?: InvoiceStatus; vendorId?: string }): VendorInvoice[] {
  return invoices.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.vendorId ? r.vendorId === opts.vendorId : true))
    .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));
}
export function createInvoice(orgId: string, input: Partial<VendorInvoice>): { ok: true; record: VendorInvoice } | { ok: false; error: string } {
  if (!input.vendorName || !input.invoiceNumber || !input.invoiceDate || !input.dueDate || !input.lines || input.lines.length === 0) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const lines: InvoiceLine[] = input.lines.map((l, idx) => ({
    id: l.id || `ln-${Date.now()}-${idx}`,
    description: l.description, quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0,
    taxPercent: l.taxPercent, amount: 0,
  }));
  const r: VendorInvoice = {
    id: nextId("VIV", invoices, orgId), organizationId: orgId,
    vendorId: input.vendorId, vendorName: input.vendorName,
    invoiceNumber: input.invoiceNumber, invoiceDate: input.invoiceDate, dueDate: input.dueDate,
    poReference: input.poReference, grnReference: input.grnReference,
    lines, subTotal: 0, taxTotal: 0, discount: Number(input.discount) || 0,
    total: 0, paidAmount: 0, balanceAmount: 0,
    currency: input.currency || "INR",
    status: (input.status || "draft") as InvoiceStatus,
    notes: input.notes, createdAt: now, updatedAt: now,
  };
  recompute(r); invoices.push(r);
  return { ok: true, record: r };
}
export function updateInvoice(id: string, orgId: string, patch: Partial<VendorInvoice>): VendorInvoice | null {
  const i = invoices.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = invoices[i];
  const next: VendorInvoice = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  if (patch.lines) next.lines = patch.lines.map((l, idx) => ({ id: l.id || `ln-${Date.now()}-${idx}`, description: l.description, quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0, taxPercent: l.taxPercent, amount: 0 }));
  recompute(next); invoices[i] = next; return next;
}
export function deleteInvoice(id: string, orgId: string): boolean {
  const i = invoices.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  invoices.splice(i, 1);
  // cascade-remove payments for this invoice
  for (let j = payments.length - 1; j >= 0; j--) if (payments[j].organizationId === orgId && payments[j].invoiceId === id) payments.splice(j, 1);
  return true;
}

export function listPayments(opts: { organizationId: string; invoiceId?: string }): VendorPayment[] {
  return payments.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.invoiceId ? r.invoiceId === opts.invoiceId : true))
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));
}
export function createPayment(orgId: string, input: Partial<VendorPayment>): { ok: true; record: VendorPayment } | { ok: false; error: string } {
  if (!input.invoiceId || !input.paymentDate || !input.amount || !input.method || !input.paidBy) return { ok: false, error: "missing_required" };
  const inv = invoices.find((x) => x.id === input.invoiceId && x.organizationId === orgId);
  if (!inv) return { ok: false, error: "invoice_not_found" };
  const now = new Date().toISOString();
  const r: VendorPayment = {
    id: nextId("VPM", payments, orgId), organizationId: orgId,
    invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, vendorName: inv.vendorName,
    paymentDate: input.paymentDate, amount: Number(input.amount),
    method: input.method as PaymentMethod,
    reference: input.reference, bankAccount: input.bankAccount,
    paidBy: input.paidBy, notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  payments.push(r); recompute(inv); inv.updatedAt = now;
  return { ok: true, record: r };
}
export function updatePayment(id: string, orgId: string, patch: Partial<VendorPayment>): VendorPayment | null {
  const i = payments.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  payments.splice(i, 1, { ...payments[i], ...patch, id: payments[i].id, organizationId: payments[i].organizationId, updatedAt: new Date().toISOString() });
  const inv = invoices.find((x) => x.id === payments[i].invoiceId && x.organizationId === orgId);
  if (inv) recompute(inv);
  return payments[i];
}
export function deletePayment(id: string, orgId: string): boolean {
  const i = payments.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  const invId = payments[i].invoiceId;
  payments.splice(i, 1);
  const inv = invoices.find((x) => x.id === invId && x.organizationId === orgId);
  if (inv) recompute(inv);
  return true;
}

export function computeStats(orgId: string) {
  const my = invoices.filter((r) => r.organizationId === orgId);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const overdue = my.filter((i) => i.balanceAmount > 0 && i.dueDate < today && i.status !== "paid" && i.status !== "cancelled");
  return {
    openInvoices: my.filter((i) => i.balanceAmount > 0 && i.status !== "cancelled").length,
    pendingApproval: my.filter((i) => i.status === "pending_approval").length,
    overdueCount: overdue.length,
    overdueAmount: Math.round(overdue.reduce((s, i) => s + i.balanceAmount, 0)),
    paidMonth: Math.round(payments.filter((p) => p.organizationId === orgId && p.paymentDate >= monthStart).reduce((s, p) => s + p.amount, 0)),
    payableTotal: Math.round(my.filter((i) => i.status !== "cancelled").reduce((s, i) => s + i.balanceAmount, 0)),
  };
}
