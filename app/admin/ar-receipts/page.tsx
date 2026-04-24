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

const FILTER_THEMES: Record<ReceiptMethod | "all", string> = {
  all: "from-emerald-500 via-green-500 to-teal-500",
  cash: "from-emerald-500 to-green-500",
  card: "from-teal-500 to-cyan-500",
  upi: "from-green-500 to-lime-500",
  neft: "from-emerald-500 to-teal-500",
  rtgs: "from-teal-500 to-emerald-600",
  cheque: "from-amber-500 to-orange-500",
  wallet: "from-fuchsia-500 to-pink-500",
  insurance: "from-indigo-500 to-blue-500",
  corporate: "from-violet-500 to-purple-500",
  other: "from-slate-500 to-gray-500",
};

const KIND_THEME: Record<ReceiptKind, { pill: string; dot: string }> = {
  advance: { pill: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  invoice: { pill: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  refund: { pill: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
  deposit: { pill: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
};

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
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              ₹{(stats?.collectedToday ?? 0).toFixed(2)} today · ₹{(stats?.collectedMonth ?? 0).toFixed(2)} this month
            </div>
            <h1 className="text-3xl font-bold tracking-tight">AR Receipts</h1>
            <p className="mt-1 text-sm text-white/80">Patient / payer receipts · Advances · Refunds · Daily cash</p>
          </div>
          <button onClick={() => { setEdit(null); setShow(true); }} className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/25">💰 + Receipt</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatTile label="Today ₹" value={stats.collectedToday} tone="emerald" />
          <StatTile label="Month ₹" value={stats.collectedMonth} tone="teal" />
          <StatTile label="Count" value={stats.count} tone="slate" />
          <StatTile label="Advances ₹" value={stats.advancesHeld} tone="indigo" />
          <StatTile label="Refunds (mo)" value={stats.refundsMonth} tone="rose" />
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <button onClick={() => setFMethod("")} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fMethod === "" ? `bg-gradient-to-r ${FILTER_THEMES.all} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>All</button>
        {METHODS.map((m) => (
          <button key={m} onClick={() => setFMethod(m)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition hover:-translate-y-0.5 ${fMethod === m ? `bg-gradient-to-r ${FILTER_THEMES[m]} text-white shadow-md` : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"}`}>{METHOD_LABEL[m]}</button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-teal-50/60 text-left text-xs font-semibold uppercase text-gray-600">
              <tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Payer</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">By</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {list.map((r) => {
                const kt = KIND_THEME[r.kind];
                return (
                  <tr key={r.id} className={`transition hover:bg-emerald-50/30 ${r.voided ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.id}</td>
                    <td className="px-4 py-3 text-xs">{new Date(r.receiptDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs"><div className="font-semibold text-gray-900">{r.payerName}</div>{r.patientName && <div className="text-gray-500">{r.patientName}</div>}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${kt.pill}`}><span className={`h-1.5 w-1.5 rounded-full ${kt.dot}`} />{KIND_LABEL[r.kind]}</span></td>
                    <td className="px-4 py-3 text-xs">{r.invoiceNumber || "-"}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-700">₹{r.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-xs">{METHOD_LABEL[r.method]}</td>
                    <td className="px-4 py-3 text-xs">{r.receivedBy}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setEdit(r); setShow(true); }} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">✎ Edit</button>
                        <button onClick={() => del(r.id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100">✕ Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">💰 No receipts.</td></tr>}
            </tbody>
          </table>
        </div>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-6 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500" />
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">{initial ? "✎ Edit receipt" : "💰 New receipt"}</h2>
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
          {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow">Cancel</button>
            <button onClick={submit} disabled={busy} className="rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">{busy ? "Saving…" : "💾 Save"}</button>
          </div>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" | "teal" }) {
  const t: Record<string, string> = {
    slate: "from-slate-50 to-slate-100 text-slate-700 ring-slate-200",
    amber: "from-amber-50 to-orange-100 text-amber-700 ring-amber-200",
    rose: "from-rose-50 to-pink-100 text-rose-700 ring-rose-200",
    emerald: "from-emerald-50 to-green-100 text-emerald-700 ring-emerald-200",
    indigo: "from-indigo-50 to-blue-100 text-indigo-700 ring-indigo-200",
    teal: "from-teal-50 to-cyan-100 text-teal-700 ring-teal-200",
  };
  return <div className={`rounded-xl bg-gradient-to-br p-4 ring-1 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-gray-600">{label}</div>{children}</label>; }
