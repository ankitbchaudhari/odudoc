"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentMethod,
} from "@/lib/hospital/invoices-store";
import type { Patient } from "@/lib/patients-store";
import type { Encounter } from "@/lib/encounters-store";

const STATUSES: InvoiceStatus[] = [
  "draft",
  "issued",
  "partially_paid",
  "paid",
  "void",
];
const METHODS: PaymentMethod[] = [
  "cash",
  "card",
  "upi",
  "bank_transfer",
  "insurance",
  "other",
];
const CATEGORIES: Array<InvoiceLineItem["category"]> = [
  "consultation",
  "procedure",
  "lab",
  "pharmacy",
  "room",
  "other",
];

type FormLine = Omit<InvoiceLineItem, "id"> & { id?: string };

const EMPTY_LINE: FormLine = {
  description: "",
  category: "consultation",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  taxPercent: 0,
};

function fmtMoney(n: number, ccy: string) {
  return `${ccy} ${n.toFixed(2)}`;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientId, setPatientId] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [dueAt, setDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<FormLine[]>([{ ...EMPTY_LINE }]);
  const [issueOnCreate, setIssueOnCreate] = useState(true);

  const [paymentFor, setPaymentFor] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PaymentMethod>("cash");
  const [payReference, setPayReference] = useState("");
  const [payNote, setPayNote] = useState("");

  const patientsById = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  const patientEncounters = useMemo(
    () => encounters.filter((e) => e.patientId === patientId),
    [encounters, patientId]
  );

  const preview = useMemo(() => {
    let subtotal = 0, disc = 0, tax = 0;
    for (const l of items) {
      const base = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      const d = Number(l.discount) || 0;
      const t = Math.max(0, base - d) * ((Number(l.taxPercent) || 0) / 100);
      subtotal += base;
      disc += d;
      tax += t;
    }
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      disc: Math.round(disc * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total: Math.round((subtotal - disc + tax) * 100) / 100,
    };
  }, [items]);

  async function loadAll() {
    setLoading(true);
    try {
      const [rp, re, ri] = await Promise.all([
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/encounters", { cache: "no-store" }),
        fetch(
          `/api/hospital/invoices?${new URLSearchParams({
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
            ...(patientFilter !== "all" ? { patientId: patientFilter } : {}),
          }).toString()}`,
          { cache: "no-store" }
        ),
      ]);
      const [dp, de, di] = await Promise.all([rp.json(), re.json(), ri.json()]);
      if (!ri.ok) {
        setError(di.error || "failed");
        setInvoices([]);
      } else {
        setError(null);
        setInvoices(di.invoices || []);
      }
      setPatients(dp.patients || []);
      setEncounters(de.encounters || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, patientFilter]);

  function resetForm() {
    setEditingId(null);
    setPatientId("");
    setEncounterId("");
    setCurrency("INR");
    setDueAt("");
    setNotes("");
    setItems([{ ...EMPTY_LINE }]);
    setIssueOnCreate(true);
    setShowForm(false);
  }

  function loadForEdit(inv: Invoice) {
    setEditingId(inv.id);
    setPatientId(inv.patientId);
    setEncounterId(inv.encounterId || "");
    setCurrency(inv.currency);
    setDueAt(inv.dueAt || "");
    setNotes(inv.notes || "");
    setItems(
      inv.items.length > 0
        ? inv.items.map((i) => ({ ...i }))
        : [{ ...EMPTY_LINE }]
    );
    setShowForm(true);
  }

  function setItem(idx: number, patch: Partial<FormLine>) {
    setItems((curr) => {
      const next = [...curr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }
  function addItem() {
    setItems((curr) => [...curr, { ...EMPTY_LINE }]);
  }
  function removeItem(idx: number) {
    setItems((curr) =>
      curr.length > 1 ? curr.filter((_, i) => i !== idx) : curr
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      alert("Please select a patient.");
      return;
    }
    const validItems = items
      .filter((l) => l.description.trim())
      .map((l) => ({
        ...l,
        quantity: Number(l.quantity) || 0,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discount) || 0,
        taxPercent: Number(l.taxPercent) || 0,
      }));
    if (validItems.length === 0) {
      alert("Add at least one line item.");
      return;
    }
    const payload = {
      patientId,
      encounterId: encounterId || undefined,
      currency,
      dueAt: dueAt || undefined,
      notes,
      items: validItems,
      issue: editingId ? undefined : issueOnCreate,
    };
    const res = await fetch("/api/hospital/invoices", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    if (res.ok) {
      resetForm();
      loadAll();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Save failed");
    }
  }

  async function issueDraft(inv: Invoice) {
    await fetch("/api/hospital/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inv.id, issue: true }),
    });
    loadAll();
  }

  async function voidInvoice(inv: Invoice) {
    if (!confirm(`Void invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    await fetch("/api/hospital/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inv.id, status: "void" }),
    });
    loadAll();
  }

  async function remove(inv: Invoice) {
    if (!confirm(`Delete invoice ${inv.invoiceNumber}? This cannot be undone.`)) return;
    await fetch("/api/hospital/invoices", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: inv.id }),
    });
    loadAll();
  }

  async function submitPayment(invId: string) {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      alert("Enter a positive amount.");
      return;
    }
    await fetch("/api/hospital/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: invId,
        addPayment: {
          amount: amt,
          method: payMethod,
          reference: payReference || undefined,
          note: payNote || undefined,
        },
      }),
    });
    setPaymentFor(null);
    setPayAmount("");
    setPayReference("");
    setPayNote("");
    loadAll();
  }

  async function removePayment(invId: string, paymentId: string) {
    if (!confirm("Remove this payment record?")) return;
    await fetch("/api/hospital/invoices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: invId, removePaymentId: paymentId }),
    });
    loadAll();
  }

  if (error === "no_active_org") {
    return (
      <div className="p-4 md:p-8 max-w-7xl">
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 p-6 text-white shadow-lg">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="mt-1 text-sm text-amber-50/90">
              Patient billing with line items, tax, discounts, and payments.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-rose-50 via-amber-50 to-rose-50 shadow-sm ring-1 ring-rose-200/60">
          <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500" />
          <div className="p-8 text-center">
            <div className="mb-3 text-5xl">🧾</div>
            <h2 className="text-lg font-bold text-rose-900">No active organization</h2>
            <p className="mt-2 text-sm text-rose-800/90">
              Select an organization from the switcher.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-accent-300/20 blur-3xl" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-200 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-300" />
              </span>
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
            </div>
            <h1 className="text-2xl font-bold">Invoices</h1>
            <p className="mt-1 text-sm text-amber-50/90">
              Patient billing with line items, tax, discounts, and payments.
            </p>
          </div>
          <button
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            disabled={patients.length === 0}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-amber-700 shadow transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {showForm ? "Cancel" : "🧾 + New invoice"}
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-8 shadow-sm space-y-4"
        >
          <h2 className="font-semibold text-lg">
            {editingId ? "Edit invoice" : "New invoice"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-600">Patient *</label>
              <select
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  setEncounterId("");
                }}
                required
                disabled={!!editingId}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">— Select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} · {p.mrn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Encounter</label>
              <select
                value={encounterId}
                onChange={(e) => setEncounterId(e.target.value)}
                disabled={!patientId}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white disabled:bg-gray-100"
              >
                <option value="">— Standalone —</option>
                {patientEncounters.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.startedAt).toLocaleDateString()} · {e.type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Due date</label>
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700">Line items</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((l, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center border border-gray-200 rounded-lg p-2"
                >
                  <input
                    className="col-span-4 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Description *"
                    value={l.description}
                    onChange={(e) => setItem(idx, { description: e.target.value })}
                  />
                  <select
                    className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
                    value={l.category}
                    onChange={(e) =>
                      setItem(idx, {
                        category: e.target.value as InvoiceLineItem["category"],
                      })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Qty"
                    value={l.quantity}
                    onChange={(e) => setItem(idx, { quantity: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Unit price"
                    value={l.unitPrice}
                    onChange={(e) => setItem(idx, { unitPrice: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Disc"
                    value={l.discount || 0}
                    onChange={(e) => setItem(idx, { discount: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    className="col-span-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                    placeholder="Tax %"
                    value={l.taxPercent || 0}
                    onChange={(e) => setItem(idx, { taxPercent: Number(e.target.value) })}
                  />
                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 text-xs hover:underline"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>{fmtMoney(preview.subtotal, currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Discount</span><span>- {fmtMoney(preview.disc, currency)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tax</span><span>+ {fmtMoney(preview.tax, currency)}</span></div>
              <div className="flex justify-between font-semibold border-t border-slate-200 mt-1 pt-1">
                <span>Grand total</span>
                <span>{fmtMoney(preview.total, currency)}</span>
              </div>
            </div>
          </div>

          {!editingId && (
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={issueOnCreate}
                onChange={(e) => setIssueOnCreate(e.target.checked)}
              />
              Issue immediately (otherwise saved as draft)
            </label>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
            >
              {editingId ? "💾 Save changes" : "🧾 Create invoice"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[200px]"
        >
          <option value="all">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName} · {p.mrn}
            </option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {(["all", ...STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition hover:-translate-y-0.5 ${
                statusFilter === s
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:shadow"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500" />
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-400">Loading…</p>
        ) : invoices.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-400">
            🧾 No invoices match the filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-yellow-50/60">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                  <th className="px-5 py-3">Invoice #</th>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-right">Paid</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((inv) => {
                  const p = patientsById.get(inv.patientId);
                  const statusStyle =
                    inv.status === "paid"
                      ? { pill: "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
                      : inv.status === "partially_paid"
                      ? { pill: "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" }
                      : inv.status === "issued"
                      ? { pill: "bg-gradient-to-r from-sky-50 to-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" }
                      : inv.status === "draft"
                      ? { pill: "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 ring-slate-200", dot: "bg-slate-500" }
                      : { pill: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
                  return (
                    <>
                      <tr key={inv.id} className="align-top transition-colors hover:bg-amber-50/30">
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{inv.invoiceNumber}</td>
                        <td className="px-5 py-3">
                          {p ? (
                            <>
                              <div className="font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                              <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-gray-900">
                          {fmtMoney(inv.grandTotal, inv.currency)}
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-700 font-semibold">
                          {fmtMoney(inv.paidTotal, inv.currency)}
                        </td>
                        <td className={`px-5 py-3 text-right font-bold ${inv.balance > 0 ? "text-rose-600" : "text-gray-400"}`}>
                          {fmtMoney(inv.balance, inv.currency)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusStyle.pill}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                            {inv.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1.5 flex-wrap">
                            {inv.status === "draft" && (
                              <button onClick={() => issueDraft(inv)} className="rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">📤 Issue</button>
                            )}
                            {inv.status !== "void" && inv.status !== "paid" && (
                              <button onClick={() => setPaymentFor(paymentFor === inv.id ? null : inv.id)} className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">
                                💵 Pay
                              </button>
                            )}
                            <button onClick={() => loadForEdit(inv)} className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md">✏️ Edit</button>
                            {inv.status !== "void" && (
                              <button onClick={() => voidInvoice(inv)} className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow">⊘ Void</button>
                            )}
                            <button onClick={() => remove(inv)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 ring-1 ring-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow">✕ Delete</button>
                          </div>
                        </td>
                      </tr>
                    {(paymentFor === inv.id || inv.payments.length > 0) && (
                      <tr className="bg-gradient-to-r from-amber-50/40 via-orange-50/30 to-yellow-50/40 border-t border-gray-100">
                        <td colSpan={8} className="px-5 py-3">
                          {inv.payments.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-semibold text-gray-700 mb-1">Payments</div>
                              <div className="space-y-1">
                                {inv.payments.map((pay) => (
                                  <div key={pay.id} className="flex items-center justify-between text-xs bg-white border border-gray-200 rounded px-2 py-1">
                                    <div>
                                      <span className="font-semibold">{fmtMoney(pay.amount, inv.currency)}</span>
                                      <span className="text-gray-500 ml-2">via {pay.method}</span>
                                      {pay.reference && <span className="text-gray-500 ml-2">· ref {pay.reference}</span>}
                                      <span className="text-gray-400 ml-2">· {new Date(pay.receivedAt).toLocaleDateString()}</span>
                                    </div>
                                    <button onClick={() => removePayment(inv.id, pay.id)} className="text-red-600 hover:underline">Remove</button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {paymentFor === inv.id && (
                            <div className="flex flex-wrap items-end gap-2">
                              <div>
                                <label className="text-[10px] font-medium text-gray-500">Amount</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={payAmount}
                                  onChange={(e) => setPayAmount(e.target.value)}
                                  placeholder={inv.balance.toString()}
                                  className="block mt-0.5 w-32 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-gray-500">Method</label>
                                <select
                                  value={payMethod}
                                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                                  className="block mt-0.5 px-2 py-1.5 border border-gray-300 rounded text-sm bg-white"
                                >
                                  {METHODS.map((m) => (
                                    <option key={m} value={m}>{m}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-medium text-gray-500">Reference</label>
                                <input
                                  type="text"
                                  value={payReference}
                                  onChange={(e) => setPayReference(e.target.value)}
                                  className="block mt-0.5 w-40 px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <div className="flex-1 min-w-[180px]">
                                <label className="text-[10px] font-medium text-gray-500">Note</label>
                                <input
                                  type="text"
                                  value={payNote}
                                  onChange={(e) => setPayNote(e.target.value)}
                                  className="block mt-0.5 w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                />
                              </div>
                              <button
                                onClick={() => submitPayment(inv.id)}
                                className="rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:shadow-md"
                              >
                                💵 Record payment
                              </button>
                              <button
                                onClick={() => setPaymentFor(null)}
                                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
