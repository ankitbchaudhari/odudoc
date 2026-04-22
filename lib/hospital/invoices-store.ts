// Invoices — hospital billing. Tenant-scoped.
//
// An invoice holds one or more line items (consultation fees, procedures,
// lab tests, medications, room charges) plus discount and tax. Payments
// are tracked separately and reduce the balance; status transitions from
// "draft" → "issued" → "partially_paid" → "paid", or "void".

import { bindPersistentArray } from "../persistent-array";

export type InvoiceStatus =
  | "draft"
  | "issued"
  | "partially_paid"
  | "paid"
  | "void";

export type PaymentMethod =
  | "cash"
  | "card"
  | "upi"
  | "bank_transfer"
  | "insurance"
  | "other";

export interface InvoiceLineItem {
  id: string;
  description: string;
  category?: "consultation" | "procedure" | "lab" | "pharmacy" | "room" | "other";
  // Link back to source records where applicable (for traceability).
  sourceType?: "encounter" | "prescription" | "lab_order" | "manual";
  sourceId?: string;
  quantity: number;
  unitPrice: number;
  discount?: number; // absolute amount per line
  taxPercent?: number; // per-line tax %
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference?: string; // txn id, cheque no, etc.
  receivedAt: string;
  note?: string;
}

export interface Invoice {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  invoiceNumber: string; // per-org sequence
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  // Totals (recomputed on every write — never trust client values).
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidTotal: number;
  balance: number;
  // Billing metadata
  currency: string; // "INR", "USD", …
  issuedAt?: string;
  dueAt?: string;
  notes?: string;
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

const invoices: Invoice[] = [];
const { hydrate, flush } = bindPersistentArray<Invoice>(
  "hospital-invoices",
  invoices,
  () => []
);
await hydrate();

function newLineId() {
  return `li-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
function newPaymentId() {
  return `pay-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nextInvoiceNumber(organizationId: string): string {
  const orgSuffix = organizationId
    .replace(/^org-/, "")
    .slice(0, 4)
    .toUpperCase();
  const year = new Date().getFullYear();
  const countThisYear = invoices.filter(
    (i) =>
      i.organizationId === organizationId &&
      new Date(i.createdAt).getFullYear() === year
  ).length;
  const seq = String(countThisYear + 1).padStart(5, "0");
  return `INV-${orgSuffix}-${year}-${seq}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function cleanLine(l: InvoiceLineItem): InvoiceLineItem {
  const quantity = Math.max(0, Number(l.quantity) || 0);
  const unitPrice = Math.max(0, Number(l.unitPrice) || 0);
  const discount = Math.max(0, Number(l.discount) || 0);
  const taxPercent = Math.max(0, Number(l.taxPercent) || 0);
  return {
    id: l.id || newLineId(),
    description: l.description.trim(),
    category: l.category,
    sourceType: l.sourceType,
    sourceId: l.sourceId,
    quantity,
    unitPrice,
    discount,
    taxPercent,
  };
}

function recompute(inv: Invoice): void {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  for (const l of inv.items) {
    const lineBase = l.quantity * l.unitPrice;
    const lineDisc = l.discount || 0;
    const lineNet = Math.max(0, lineBase - lineDisc);
    const lineTax = lineNet * ((l.taxPercent || 0) / 100);
    subtotal += lineBase;
    discountTotal += lineDisc;
    taxTotal += lineTax;
  }
  const grandTotal = round2(subtotal - discountTotal + taxTotal);
  const paidTotal = round2(
    inv.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  );
  const balance = round2(grandTotal - paidTotal);

  inv.subtotal = round2(subtotal);
  inv.discountTotal = round2(discountTotal);
  inv.taxTotal = round2(taxTotal);
  inv.grandTotal = grandTotal;
  inv.paidTotal = paidTotal;
  inv.balance = balance;

  // Auto-advance status only from non-terminal states.
  if (inv.status !== "void" && inv.status !== "draft") {
    if (balance <= 0 && grandTotal > 0) inv.status = "paid";
    else if (paidTotal > 0 && balance > 0) inv.status = "partially_paid";
    else inv.status = "issued";
  }
}

export function listInvoices(opts: {
  organizationId: string;
  patientId?: string;
  status?: InvoiceStatus;
}): Invoice[] {
  let list = invoices.filter((i) => i.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((i) => i.patientId === opts.patientId);
  if (opts.status) list = list.filter((i) => i.status === opts.status);
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getInvoiceById(
  id: string,
  organizationId: string
): Invoice | null {
  const inv = invoices.find((x) => x.id === id);
  if (!inv || inv.organizationId !== organizationId) return null;
  return inv;
}

export interface InvoiceInput {
  patientId: string;
  encounterId?: string;
  items: Array<Omit<InvoiceLineItem, "id"> & { id?: string }>;
  currency?: string;
  dueAt?: string;
  notes?: string;
  issue?: boolean; // if true, create in "issued" state instead of "draft"
}

export function createInvoice(
  organizationId: string,
  input: InvoiceInput
): Invoice {
  const now = new Date().toISOString();
  const inv: Invoice = {
    id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    encounterId: input.encounterId || undefined,
    invoiceNumber: nextInvoiceNumber(organizationId),
    status: input.issue ? "issued" : "draft",
    items: (input.items || [])
      .filter((l) => l.description?.trim())
      .map((l) => cleanLine({ ...l, id: l.id || newLineId() } as InvoiceLineItem)),
    subtotal: 0,
    discountTotal: 0,
    taxTotal: 0,
    grandTotal: 0,
    paidTotal: 0,
    balance: 0,
    currency: input.currency || "INR",
    issuedAt: input.issue ? now : undefined,
    dueAt: input.dueAt,
    notes: input.notes?.trim() || undefined,
    payments: [],
    createdAt: now,
    updatedAt: now,
  };
  recompute(inv);
  invoices.unshift(inv);
  flush();
  return inv;
}

export function updateInvoice(
  id: string,
  organizationId: string,
  patch: Partial<{
    items: InvoiceLineItem[];
    status: InvoiceStatus;
    dueAt: string;
    notes: string;
    currency: string;
    encounterId: string;
    issue: boolean; // request to move draft → issued
  }>
): Invoice | null {
  const inv = invoices.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!inv) return null;
  if (patch.items !== undefined) {
    inv.items = patch.items
      .filter((l) => l.description?.trim())
      .map((l) => cleanLine(l));
  }
  if (patch.dueAt !== undefined) inv.dueAt = patch.dueAt;
  if (patch.notes !== undefined) inv.notes = patch.notes?.trim() || undefined;
  if (patch.currency !== undefined) inv.currency = patch.currency;
  if (patch.encounterId !== undefined)
    inv.encounterId = patch.encounterId || undefined;

  // Status transitions are constrained.
  if (patch.status !== undefined) {
    if (patch.status === "void") inv.status = "void";
    else if (patch.status === "draft" && inv.status === "draft") inv.status = "draft";
    else if (
      patch.status === "issued" &&
      (inv.status === "draft" || inv.status === "issued")
    ) {
      inv.status = "issued";
      if (!inv.issuedAt) inv.issuedAt = new Date().toISOString();
    }
  }
  if (patch.issue && inv.status === "draft") {
    inv.status = "issued";
    inv.issuedAt = new Date().toISOString();
  }

  recompute(inv);
  inv.updatedAt = new Date().toISOString();
  flush();
  return inv;
}

export interface PaymentInput {
  amount: number;
  method: PaymentMethod;
  reference?: string;
  note?: string;
  receivedAt?: string;
}

export function addPayment(
  id: string,
  organizationId: string,
  input: PaymentInput
): Invoice | null {
  const inv = invoices.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!inv) return null;
  if (inv.status === "void") return null;
  const amount = Math.max(0, Number(input.amount) || 0);
  if (amount <= 0) return inv;
  const now = new Date().toISOString();
  inv.payments.push({
    id: newPaymentId(),
    amount: round2(amount),
    method: input.method,
    reference: input.reference?.trim() || undefined,
    note: input.note?.trim() || undefined,
    receivedAt: input.receivedAt || now,
  });
  if (inv.status === "draft") {
    // Auto-issue if someone records a payment on a draft.
    inv.status = "issued";
    if (!inv.issuedAt) inv.issuedAt = now;
  }
  recompute(inv);
  inv.updatedAt = now;
  flush();
  return inv;
}

export function removePayment(
  id: string,
  organizationId: string,
  paymentId: string
): Invoice | null {
  const inv = invoices.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!inv) return null;
  const before = inv.payments.length;
  inv.payments = inv.payments.filter((p) => p.id !== paymentId);
  if (inv.payments.length === before) return inv;
  recompute(inv);
  inv.updatedAt = new Date().toISOString();
  flush();
  return inv;
}

export function deleteInvoice(id: string, organizationId: string): boolean {
  const i = invoices.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  invoices.splice(i, 1);
  flush();
  return true;
}

export function deleteInvoicesForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = invoices.length - 1; i >= 0; i--) {
    const inv = invoices[i];
    if (inv.patientId === patientId && inv.organizationId === organizationId) {
      invoices.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
