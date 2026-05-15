// Clinic invoice store — one row per invoice issued by a clinic, with
// the tax breakdown frozen at issue time. Statements aggregate these
// rows by month / quarter / year for the doctor's tax filings.
//
// Tax math is delegated to lib/tax/engine (country-aware GST split,
// VAT, sales-tax). We persist the engine's full output so reprinting
// a 6-month-old invoice still matches the original (tax rules change;
// the issued invoice must not).

import { bindPersistentArray } from "./persistent-array";
import type { InvoiceTaxSummary } from "./tax/engine";

export interface ClinicInvoiceLineInput {
  description: string;
  category:
    | "consultation"
    | "lab_test"
    | "imaging"
    | "medicine"
    | "consumable"
    | "room_charge"
    | "surgery"
    | "other";
  amountRupees: number;
  taxOverride?: "exempt" | "standard" | "reduced";
}

export interface ClinicInvoice {
  id: string;                  // INV-XXXX
  number: string;              // human-readable, scoped per clinic + year
  clinicId: string;
  doctorId: string;
  bookingId?: string;          // BK-XXXX when this invoice covers a booked visit
  patientName: string;
  patientPhone: string;
  patientEmail?: string;
  patientUserId?: string;

  // Issuer snapshot — frozen at issue time so reprints match the
  // original even if the doctor later edits their tax profile.
  issuer: {
    legalBusinessName?: string;
    taxCountryCode: string;
    taxIdType?: string;
    taxId?: string;
    taxRegistered: boolean;
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    homeStateCode?: string;
  };

  lines: ClinicInvoiceLineInput[];
  // Stored verbatim from lib/tax/engine#computeInvoice.
  tax: InvoiceTaxSummary;
  currency: string;            // INR / USD / AED / etc.
  intraState?: boolean;        // India only — drives CGST+SGST vs IGST.

  // Lifecycle
  issuedAt: string;            // ISO
  paidAt?: string;             // ISO when reception marks paid
  status: "issued" | "paid" | "void";
  voidedAt?: string;
  voidReason?: string;
  createdByStaffId?: string;
}

const invoices: ClinicInvoice[] = [];
const { hydrate, flush } = bindPersistentArray<ClinicInvoice>(
  "clinic_invoices",
  invoices,
  () => [],
);
await hydrate();

let nextId = invoices.reduce((max, i) => {
  const m = /^INV-(\d+)$/.exec(i.id);
  const n = m ? parseInt(m[1], 10) : 0;
  return n > max ? n : max;
}, 1000) + 1;

/** Per-clinic + per-year invoice number, e.g. CL-1001/26-0042. */
function nextInvoiceNumber(clinicId: string): string {
  const year = String(new Date().getFullYear()).slice(-2);
  const prefix = `${clinicId}/${year}-`;
  const max = invoices
    .filter((i) => i.number.startsWith(prefix))
    .reduce((m, i) => {
      const n = parseInt(i.number.slice(prefix.length), 10) || 0;
      return n > m ? n : m;
    }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export function createClinicInvoice(
  data: Omit<ClinicInvoice, "id" | "number" | "issuedAt" | "status">,
): ClinicInvoice {
  const invoice: ClinicInvoice = {
    ...data,
    id: `INV-${nextId++}`,
    number: nextInvoiceNumber(data.clinicId),
    issuedAt: new Date().toISOString(),
    status: "issued",
  };
  invoices.push(invoice);
  flush();
  return invoice;
}

export function getInvoiceById(id: string): ClinicInvoice | undefined {
  return invoices.find((i) => i.id === id);
}

export function listInvoicesByClinic(clinicId: string): ClinicInvoice[] {
  return invoices
    .filter((i) => i.clinicId === clinicId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** Per-doctor list across every clinic they own — drives the doctor
 *  dashboard statement page. */
export function listInvoicesByDoctor(doctorId: string): ClinicInvoice[] {
  return invoices
    .filter((i) => i.doctorId === doctorId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** Filter helper — issuedAt within [startIso, endIso). */
export function listInvoicesInRange(args: {
  doctorId?: string;
  clinicId?: string;
  startIso: string;
  endIso: string;
}): ClinicInvoice[] {
  return invoices.filter((i) => {
    if (args.doctorId && i.doctorId !== args.doctorId) return false;
    if (args.clinicId && i.clinicId !== args.clinicId) return false;
    if (i.issuedAt < args.startIso) return false;
    if (i.issuedAt >= args.endIso) return false;
    return true;
  }).sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

export function markInvoicePaid(id: string): ClinicInvoice | undefined {
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return undefined;
  if (inv.status === "issued") {
    inv.status = "paid";
    inv.paidAt = new Date().toISOString();
    flush();
  }
  return inv;
}

export function voidInvoice(id: string, reason: string): ClinicInvoice | undefined {
  const inv = invoices.find((i) => i.id === id);
  if (!inv) return undefined;
  inv.status = "void";
  inv.voidedAt = new Date().toISOString();
  inv.voidReason = reason;
  flush();
  return inv;
}

/** Aggregate totals for a date range. Used by the statements page to
 *  render headline numbers (invoiced / collected / tax due). */
export function statementTotals(rows: ClinicInvoice[]): {
  count: number;
  invoicedTotal: number;
  paidTotal: number;
  taxTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  vatTotal: number;
  salesTaxTotal: number;
  byMonth: Array<{ month: string; count: number; invoiced: number; tax: number; paid: number }>;
} {
  const out = {
    count: 0,
    invoicedTotal: 0,
    paidTotal: 0,
    taxTotal: 0,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 0,
    vatTotal: 0,
    salesTaxTotal: 0,
    byMonth: [] as Array<{ month: string; count: number; invoiced: number; tax: number; paid: number }>,
  };
  const months = new Map<string, { count: number; invoiced: number; tax: number; paid: number }>();

  for (const inv of rows) {
    if (inv.status === "void") continue;
    out.count++;
    out.invoicedTotal += inv.tax.grandTotalRupees;
    out.taxTotal += inv.tax.totalTaxRupees;
    if (inv.status === "paid") out.paidTotal += inv.tax.grandTotalRupees;
    out.cgstTotal += inv.tax.cgstRupees || 0;
    out.sgstTotal += inv.tax.sgstRupees || 0;
    out.igstTotal += inv.tax.igstRupees || 0;
    out.vatTotal += inv.tax.vatRupees || 0;
    out.salesTaxTotal += inv.tax.salesTaxRupees || 0;

    const m = inv.issuedAt.slice(0, 7); // YYYY-MM
    const slot = months.get(m) || { count: 0, invoiced: 0, tax: 0, paid: 0 };
    slot.count++;
    slot.invoiced += inv.tax.grandTotalRupees;
    slot.tax += inv.tax.totalTaxRupees;
    if (inv.status === "paid") slot.paid += inv.tax.grandTotalRupees;
    months.set(m, slot);
  }

  out.byMonth = [...months.entries()]
    .map(([month, v]) => ({ month, ...v }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return out;
}
