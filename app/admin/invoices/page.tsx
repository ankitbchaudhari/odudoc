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
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-2">Invoices</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
          <p className="text-amber-900 font-medium">No active organization</p>
          <p className="text-sm text-amber-800 mt-1">
            Select an organization from the switcher.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-gray-500">
            Patient billing with line items, tax, discounts, and payments.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          disabled={patients.length === 0}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {showForm ? "Cancel" : "+ New invoice"}
        </button>
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
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
            >
              {editingId ? "Save changes" : "Create invoice"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
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
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                statusFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No invoices match the filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">Invoice #</th>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2 text-right">Total</th>
                <th className="px-4 py-2 text-right">Paid</th>
                <th className="px-4 py-2 text-right">Balance</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const p = patientsById.get(inv.patientId);
                const statusColor =
                  inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                  inv.status === "partially_paid" ? "bg-amber-100 text-amber-700" :
                  inv.status === "issued" ? "bg-blue-100 text-blue-700" :
                  inv.status === "draft" ? "bg-gray-100 text-gray-700" :
                  "bg-red-100 text-red-700";
                return (
                  <>
                    <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                      <td className="px-4 py-2 font-mono text-xs">{inv.invoiceNumber}</td>
                      <td className="px-4 py-2">
                        {p ? (
                          <>
                            <div className="font-medium">{p.firstName} {p.lastName}</div>
                            <div className="text-xs font-mono text-gray-400">{p.mrn}</div>
                          </>
                        ) : (
                          <span className="text-gray-400 italic">unknown</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        {fmtMoney(inv.grandTotal, inv.currency)}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700">
                        {fmtMoney(inv.paidTotal, inv.currency)}
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold ${inv.balance > 0 ? "text-red-600" : "text-gray-500"}`}>
                        {fmtMoney(inv.balance, inv.currency)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${statusColor}`}>
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {inv.status === "draft" && (
                          <button onClick={() => issueDraft(inv)} className="text-blue-600 hover:underline mr-3">Issue</button>
                        )}
                        {inv.status !== "void" && inv.status !== "paid" && (
                          <button onClick={() => setPaymentFor(paymentFor === inv.id ? null : inv.id)} className="text-emerald-600 hover:underline mr-3">
                            Pay
                          </button>
                        )}
                        <button onClick={() => loadForEdit(inv)} className="text-blue-600 hover:underline mr-3">Edit</button>
                        {inv.status !== "void" && (
                          <button onClick={() => voidInvoice(inv)} className="text-amber-600 hover:underline mr-3">Void</button>
                        )}
                        <button onClick={() => remove(inv)} className="text-red-600 hover:underline">Delete</button>
                      </td>
                    </tr>
                    {(paymentFor === inv.id || inv.payments.length > 0) && (
                      <tr className="bg-slate-50 border-t border-gray-100">
                        <td colSpan={8} className="px-4 py-3">
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
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                              >
                                Record payment
                              </button>
                              <button
                                onClick={() => setPaymentFor(null)}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100"
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
        )}
      </div>
    </div>
  );
}
