"use client";

import { useEffect, useState } from "react";
import type { VendorInvoice, VendorPayment, InvoiceLine, InvoiceStatus, PaymentMethod } from "@/lib/hospital/ap-store";

// Inlined from ap-store — see documents/page.tsx comment for why.
const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft", pending_approval: "Pending approval", approved: "Approved",
  partial_paid: "Partial paid", paid: "Paid", cancelled: "Cancelled", disputed: "Disputed",
};
const METHOD_LABEL: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer", cheque: "Cheque", cash: "Cash", upi: "UPI",
  rtgs: "RTGS", neft: "NEFT", card: "Card", other: "Other",
};

const STATUSES: InvoiceStatus[] = ["draft", "pending_approval", "approved", "partial_paid", "paid", "cancelled", "disputed"];
const METHODS: PaymentMethod[] = ["bank_transfer", "cheque", "cash", "upi", "rtgs", "neft", "card", "other"];

export default function APPage() {
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [payments, setPayments] = useState<VendorPayment[]>([]);
  const [stats, setStats] = useState<{ openInvoices: number; pendingApproval: number; overdueCount: number; overdueAmount: number; paidMonth: number; payableTotal: number } | null>(null);
  const [showInv, setShowInv] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [editInv, setEditInv] = useState<VendorInvoice | null>(null);
  const [editPay, setEditPay] = useState<VendorPayment | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/ap", { cache: "no-store" });
    const data = await res.json();
    setInvoices(data.invoices || []); setPayments(data.payments || []); setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string, kind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/ap", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Accounts Payable</h1>
          <p className="text-sm text-slate-500">Vendor invoices · Payment runs · Overdue tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditInv(null); setShowInv(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Invoice</button>
          <button onClick={() => { setEditPay(null); setShowPay(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Payment</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Open invoices" value={stats.openInvoices} tone="slate" />
          <StatTile label="Pending approval" value={stats.pendingApproval} tone="amber" />
          <StatTile label="Overdue count" value={stats.overdueCount} tone="rose" />
          <StatTile label="Overdue ₹" value={stats.overdueAmount} tone="rose" />
          <StatTile label="Paid (mo) ₹" value={stats.paidMonth} tone="emerald" />
          <StatTile label="Total payable ₹" value={stats.payableTotal} tone="indigo" />
        </div>
      )}

      <div className="mb-4 flex gap-2">
        <TabBtn active={tab === "invoices"} onClick={() => setTab("invoices")}>Invoices ({invoices.length})</TabBtn>
        <TabBtn active={tab === "payments"} onClick={() => setTab("payments")}>Payments ({payments.length})</TabBtn>
      </div>

      {tab === "invoices" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Due</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><div className="font-semibold text-slate-900">{i.invoiceNumber}</div><div className="text-xs text-slate-500">{i.id}</div></td>
                  <td className="px-4 py-3 text-xs text-slate-700">{i.vendorName}</td>
                  <td className="px-4 py-3 text-xs">{new Date(i.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">{i.currency} {i.total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{i.paidAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{i.balanceAmount.toFixed(2)}</td>
                  <td className="px-4 py-3"><Pill status={i.status}>{INVOICE_STATUS_LABEL[i.status]}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditInv(i); setShowInv(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button>
                    <button onClick={() => del(i.id)} className="text-xs font-semibold text-rose-600">Delete</button>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && <tr><td colSpan={9}><Empty>No invoices.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "payments" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">By</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.id}</td>
                  <td className="px-4 py-3 text-xs">{new Date(p.paymentDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs">{p.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{p.vendorName}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{p.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{METHOD_LABEL[p.method]}</td>
                  <td className="px-4 py-3 text-xs">{p.paidBy}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditPay(p); setShowPay(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button>
                    <button onClick={() => del(p.id, "payment")} className="text-xs font-semibold text-rose-600">Delete</button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={8}><Empty>No payments.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showInv && <InvoiceModal initial={editInv} onClose={() => { setShowInv(false); setEditInv(null); }} onSaved={() => { setShowInv(false); setEditInv(null); load(); }} />}
      {showPay && <PaymentModal invoices={invoices} initial={editPay} onClose={() => { setShowPay(false); setEditPay(null); }} onSaved={() => { setShowPay(false); setEditPay(null); load(); }} />}
    </div>
  );
}

function InvoiceModal({ initial, onClose, onSaved }: { initial: VendorInvoice | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<VendorInvoice>>(initial ?? { currency: "INR", status: "draft", invoiceDate: new Date().toISOString().slice(0, 10), dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), lines: [{ id: "ln-1", description: "", quantity: 1, unitPrice: 0, amount: 0 }] });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  function addLine() { setForm({ ...form, lines: [...(form.lines || []), { id: `ln-${Date.now()}`, description: "", quantity: 1, unitPrice: 0, amount: 0 }] }); }
  function updLine(i: number, patch: Partial<InvoiceLine>) { const lines = [...(form.lines || [])]; lines[i] = { ...lines[i], ...patch }; setForm({ ...form, lines }); }
  function rmLine(i: number) { const lines = [...(form.lines || [])]; lines.splice(i, 1); setForm({ ...form, lines }); }
  const sub = (form.lines || []).reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const tax = (form.lines || []).reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0) * ((l.taxPercent || 0) / 100), 0);
  const total = sub + tax - (form.discount || 0);
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/ap", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit invoice" : "New vendor invoice"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Vendor name *"><input className="inp" value={form.vendorName || ""} onChange={(e) => setForm({ ...form, vendorName: e.target.value })} /></Field>
          <Field label="Vendor ID"><input className="inp" value={form.vendorId || ""} onChange={(e) => setForm({ ...form, vendorId: e.target.value })} /></Field>
          <Field label="Invoice # *"><input className="inp" value={form.invoiceNumber || ""} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></Field>
          <Field label="Invoice date *"><input type="date" className="inp" value={(form.invoiceDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></Field>
          <Field label="Due date *"><input type="date" className="inp" value={(form.dueDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <Field label="Currency"><input className="inp" value={form.currency || ""} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></Field>
          <Field label="PO ref"><input className="inp" value={form.poReference || ""} onChange={(e) => setForm({ ...form, poReference: e.target.value })} /></Field>
          <Field label="GRN ref"><input className="inp" value={form.grnReference || ""} onChange={(e) => setForm({ ...form, grnReference: e.target.value })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Discount"><input type="number" step="0.01" className="inp" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Lines</div>
            <button onClick={addLine} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold">+ Line</button>
          </div>
          {(form.lines || []).map((l, i) => (
            <div key={l.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-12">
              <input className="inp md:col-span-5" placeholder="Description" value={l.description} onChange={(e) => updLine(i, { description: e.target.value })} />
              <input type="number" className="inp md:col-span-2" placeholder="Qty" value={l.quantity} onChange={(e) => updLine(i, { quantity: Number(e.target.value) || 0 })} />
              <input type="number" step="0.01" className="inp md:col-span-2" placeholder="Price" value={l.unitPrice} onChange={(e) => updLine(i, { unitPrice: Number(e.target.value) || 0 })} />
              <input type="number" step="0.01" className="inp md:col-span-2" placeholder="Tax %" value={l.taxPercent ?? ""} onChange={(e) => updLine(i, { taxPercent: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <button onClick={() => rmLine(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 md:col-span-1">×</button>
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-6 text-xs font-semibold">
            <div>Sub: {sub.toFixed(2)}</div><div>Tax: {tax.toFixed(2)}</div><div>Disc: {(form.discount || 0).toFixed(2)}</div><div className="text-emerald-700">Total: {total.toFixed(2)}</div>
          </div>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function PaymentModal({ invoices, initial, onClose, onSaved }: { invoices: VendorInvoice[]; initial: VendorPayment | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<VendorPayment>>(initial ?? { method: "bank_transfer", paymentDate: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "payment" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/ap", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  const inv = invoices.find((i) => i.id === form.invoiceId);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit payment" : "New payment"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Invoice *" full>
            <select className="inp" value={form.invoiceId || ""} disabled={!!initial} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })}>
              <option value="">-- Select --</option>
              {invoices.filter((i) => i.balanceAmount > 0 || initial).map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} · {i.vendorName} · bal {i.balanceAmount.toFixed(2)}</option>)}
            </select>
          </Field>
          {inv && <div className="md:col-span-2 rounded-lg bg-slate-50 p-2 text-xs">Invoice total: {inv.total.toFixed(2)} · Paid: {inv.paidAmount.toFixed(2)} · Balance: {inv.balanceAmount.toFixed(2)}</div>}
          <Field label="Date *"><input type="date" className="inp" value={(form.paymentDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></Field>
          <Field label="Amount *"><input type="number" step="0.01" className="inp" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Method"><select className="inp" value={form.method || "bank_transfer"} onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></Field>
          <Field label="Reference"><input className="inp" value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="Bank account"><input className="inp" value={form.bankAccount || ""} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></Field>
          <Field label="Paid by *"><input className="inp" value={form.paidBy || ""} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>; }
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = { draft: "bg-slate-100 text-slate-700", pending_approval: "bg-amber-100 text-amber-700", approved: "bg-indigo-100 text-indigo-700", partial_paid: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700", disputed: "bg-rose-100 text-rose-700" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
