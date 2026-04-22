"use client";

import { useEffect, useState } from "react";
import type { Receipt, ReceiptMethod, ReceiptKind } from "@/lib/hospital/ar-receipts-store";

// Inlined from ar-receipts-store — see documents/page.tsx comment for why.
const METHOD_LABEL: Record<ReceiptMethod, string> = {
  cash: "Cash", card: "Card", upi: "UPI", neft: "NEFT", rtgs: "RTGS",
  cheque: "Cheque", wallet: "Wallet", insurance: "Insurance", corporate: "Corporate", other: "Other",
};
const KIND_LABEL: Record<ReceiptKind, string> = {
  advance: "Advance", invoice: "Invoice payment", refund: "Refund", deposit: "Deposit",
};

interface Patient { id: string; firstName: string; lastName: string; }
const METHODS: ReceiptMethod[] = ["cash", "card", "upi", "neft", "rtgs", "cheque", "wallet", "insurance", "corporate", "other"];
const KINDS: ReceiptKind[] = ["advance", "invoice", "refund", "deposit"];

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [stats, setStats] = useState<{ collectedToday: number; collectedMonth: number; count: number; advancesHeld: number; refundsMonth: number; methodBreakdown: Record<string, number> } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState<Receipt | null>(null);
  const [fMethod, setFMethod] = useState<ReceiptMethod | "">("");

  async function load() {
    const res = await fetch("/api/hospital/ar-receipts", { cache: "no-store" });
    const data = await res.json();
    setReceipts(data.receipts || []); setStats(data.stats || null);
  }
  async function loadPatients() { try { const r = await fetch("/api/patients", { cache: "no-store" }); const d = await r.json(); setPatients(d.patients || []); } catch {} }
  useEffect(() => { load(); loadPatients(); }, []);

  async function del(id: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/ar-receipts", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  const list = receipts.filter((r) => (fMethod ? r.method === fMethod : true));

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AR Receipts</h1>
          <p className="text-sm text-slate-500">Patient / payer receipts · Advances · Refunds · Daily cash</p>
        </div>
        <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white">+ Receipt</button>
      </div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Today ₹" value={stats.collectedToday} tone="emerald" />
          <StatTile label="Month ₹" value={stats.collectedMonth} tone="emerald" />
          <StatTile label="Count" value={stats.count} tone="slate" />
          <StatTile label="Advances ₹" value={stats.advancesHeld} tone="indigo" />
          <StatTile label="Refunds (mo)" value={stats.refundsMonth} tone="rose" />
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterPill active={fMethod === ""} onClick={() => setFMethod("")}>All</FilterPill>
        {METHODS.map((m) => <FilterPill key={m} active={fMethod === m} onClick={() => setFMethod(m)}>{METHOD_LABEL[m]}</FilterPill>)}
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">By</th><th className="px-4 py-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((r) => (
              <tr key={r.id} className={`hover:bg-slate-50 ${r.voided ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-mono text-xs">{r.id}</td>
                <td className="px-4 py-3 text-xs">{new Date(r.receiptDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-xs"><div className="font-semibold">{r.payerName}</div>{r.patientName && <div className="text-slate-500">{r.patientName}</div>}</td>
                <td className="px-4 py-3 text-xs">{KIND_LABEL[r.kind]}</td>
                <td className="px-4 py-3 text-xs">{r.invoiceNumber || "-"}</td>
                <td className="px-4 py-3 text-xs font-semibold">{r.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-xs">{METHOD_LABEL[r.method]}</td>
                <td className="px-4 py-3 text-xs">{r.receivedBy}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEdit(r); setShow(true); }} className="mr-2 text-xs font-semibold text-primary-600">Edit</button>
                  <button onClick={() => del(r.id)} className="text-xs font-semibold text-rose-600">Delete</button>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9}><Empty>No receipts.</Empty></td></tr>}
          </tbody>
        </table>
      </div>
      {show && <ReceiptModal patients={patients} initial={edit} onClose={() => { setShow(false); setEdit(null); }} onSaved={() => { setShow(false); setEdit(null); load(); }} />}
    </div>
  );
}

function ReceiptModal({ patients, initial, onClose, onSaved }: { patients: Patient[]; initial: Receipt | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Receipt>>(initial ?? { method: "cash", kind: "invoice", receiptDate: new Date().toISOString().slice(0, 10), voided: false });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  function onPatient(id: string) { const p = patients.find((x) => x.id === id); setForm({ ...form, patientId: id || undefined, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName, payerName: form.payerName || (p ? `${p.firstName} ${p.lastName}` : "") }); }
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/ar-receipts", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit receipt" : "New receipt"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Date *"><input type="date" className="inp" value={(form.receiptDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, receiptDate: e.target.value })} /></Field>
          <Field label="Kind"><select className="inp" value={form.kind || "invoice"} onChange={(e) => setForm({ ...form, kind: e.target.value as ReceiptKind })}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></Field>
          <Field label="Patient"><select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}><option value="">-- None --</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}</select></Field>
          <Field label="Payer name *"><input className="inp" value={form.payerName || ""} onChange={(e) => setForm({ ...form, payerName: e.target.value })} /></Field>
          <Field label="Invoice #"><input className="inp" value={form.invoiceNumber || ""} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></Field>
          <Field label="Invoice ID"><input className="inp" value={form.invoiceId || ""} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} /></Field>
          <Field label="Amount *"><input type="number" step="0.01" className="inp" value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Method"><select className="inp" value={form.method || "cash"} onChange={(e) => setForm({ ...form, method: e.target.value as ReceiptMethod })}>{METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}</select></Field>
          <Field label="Reference"><input className="inp" value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="Bank account"><input className="inp" value={form.bankAccount || ""} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} /></Field>
          <Field label="Received by *"><input className="inp" value={form.receivedBy || ""} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} /></Field>
          <Field label="Counter"><input className="inp" value={form.counter || ""} onChange={(e) => setForm({ ...form, counter: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.voided} onChange={(e) => setForm({ ...form, voided: e.target.checked })} /> Voided</label>
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
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>; }
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
