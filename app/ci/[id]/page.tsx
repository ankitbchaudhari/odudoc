// Public clinic-invoice viewer. Short URL: /ci/INV-XXXX
//
// Anyone with the link can view the invoice (the invoice id itself is
// the access control — like /booking/[id] and /b/[id]). No login
// required because patients in India / abroad need a way to view the
// invoice their doctor's clinic sent them via WhatsApp/email/SMS
// without forcing them through OduDoc account creation first.

import { getInvoiceById } from "@/lib/clinic-invoices-store";
import { getClinicById } from "@/lib/clinics-store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function ClinicInvoicePage({ params }: { params: { id: string } }) {
  const inv = getInvoiceById(params.id);
  if (!inv) notFound();

  const clinic = getClinicById(inv.clinicId);
  const symbol = currencySymbol(inv.currency);
  const fmt = (n: number) => `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
        {/* Gradient header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">Invoice</p>
              <h1 className="mt-0.5 text-xl font-bold">{inv.number}</h1>
              <p className="mt-1 text-xs text-white/80">{new Date(inv.issuedAt).toLocaleString()}</p>
            </div>
            <StatusBadge status={inv.status} />
          </div>
        </header>

        {/* Issuer + bill-to */}
        <section className="grid gap-4 border-b border-gray-100 dark:border-slate-800 px-6 py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">From</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">
              {inv.issuer.legalBusinessName || clinic?.name || "OduDoc clinic"}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {[inv.issuer.addressLine1, inv.issuer.city, inv.issuer.state, inv.issuer.postalCode]
                .filter(Boolean)
                .join(", ")}
            </p>
            {inv.issuer.taxRegistered && inv.issuer.taxId && (
              <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">
                {inv.issuer.taxIdType || "Tax ID"}: <span className="font-mono">{inv.issuer.taxId}</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Bill to</p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-slate-100">{inv.patientName}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400">{inv.patientPhone}</p>
            {inv.patientEmail && <p className="text-xs text-gray-500 dark:text-slate-400">{inv.patientEmail}</p>}
          </div>
        </section>

        {/* Lines */}
        <section className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 text-left text-[10px] uppercase tracking-wider text-gray-500 dark:text-slate-400">
                <th className="pb-2 font-semibold">Description</th>
                <th className="pb-2 font-semibold">Cat.</th>
                <th className="pb-2 text-right font-semibold">Rate</th>
                <th className="pb-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {inv.tax.lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-900 dark:text-slate-100">{l.description}</td>
                  <td className="py-2 text-xs text-gray-500 dark:text-slate-400 capitalize">{l.category.replace("_", " ")}</td>
                  <td className="py-2 text-right text-xs text-gray-500 dark:text-slate-400">
                    {l.appliedRatePct ? `${l.appliedRatePct}%` : l.bucketLabel}
                  </td>
                  <td className="py-2 text-right font-mono font-medium text-gray-900 dark:text-slate-100">{fmt(l.amountRupees)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Totals */}
        <section className="border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60 px-6 py-4 text-sm">
          <Total label="Exempt subtotal" value={fmt(inv.tax.exemptSubtotal)} hide={!inv.tax.exemptSubtotal} />
          <Total label="Taxable (standard)" value={fmt(inv.tax.taxableStandardSubtotal)} hide={!inv.tax.taxableStandardSubtotal} />
          <Total label="Taxable (reduced)" value={fmt(inv.tax.taxableReducedSubtotal)} hide={!inv.tax.taxableReducedSubtotal} />
          {(inv.tax.cgstRupees || 0) > 0 && <Total label="CGST" value={fmt(inv.tax.cgstRupees!)} />}
          {(inv.tax.sgstRupees || 0) > 0 && <Total label="SGST" value={fmt(inv.tax.sgstRupees!)} />}
          {(inv.tax.igstRupees || 0) > 0 && <Total label="IGST" value={fmt(inv.tax.igstRupees!)} />}
          {(inv.tax.vatRupees || 0) > 0 && <Total label="VAT" value={fmt(inv.tax.vatRupees!)} />}
          {(inv.tax.salesTaxRupees || 0) > 0 && <Total label="Sales tax" value={fmt(inv.tax.salesTaxRupees!)} />}
          <div className="mt-2 flex items-center justify-between border-t border-gray-200 dark:border-slate-700 pt-2 text-base font-bold">
            <span className="text-gray-900 dark:text-slate-100">Grand total</span>
            <span className="font-mono text-gray-900 dark:text-slate-100">{fmt(inv.tax.grandTotalRupees)}</span>
          </div>
        </section>

        <footer className="border-t border-gray-100 dark:border-slate-800 px-6 py-4 text-center text-xs text-gray-400 dark:text-slate-500">
          Issued via OduDoc · <Link href="/" className="hover:underline">odudoc.com</Link>
        </footer>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: "issued" | "paid" | "void" }) {
  const cls =
    status === "paid" ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-300/40"
    : status === "void" ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-300/40"
    : "bg-amber-500/20 text-amber-100 ring-1 ring-amber-300/40";
  return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}>{status}</span>;
}

function Total({ label, value, hide }: { label: string; value: string; hide?: boolean }) {
  if (hide) return null;
  return (
    <div className="flex items-center justify-between py-0.5 text-gray-600 dark:text-slate-300">
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "د.إ",
    SAR: "ر.س", SGD: "S$", AUD: "A$", CAD: "C$", JPY: "¥",
  };
  return map[code] || `${code} `;
}
