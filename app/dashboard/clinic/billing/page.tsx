"use client";

import { useState } from "react";
import { useClinicInvoices, type ClinicInvoice } from "@/lib/clinic-store";

type LineItem = { description: string; amount: string };

export default function ClinicBillingPage() {
  const { items, add, update, remove } = useClinicInvoices();
  const [showForm, setShowForm] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [taxRate, setTaxRate] = useState("18");
  const [lines, setLines] = useState<LineItem[]>([{ description: "", amount: "" }]);

  const parseLines = () =>
    lines
      .map((l) => ({ description: l.description.trim(), amount: parseFloat(l.amount) || 0 }))
      .filter((l) => l.description !== "");

  const subtotal = parseLines().reduce((s, l) => s + l.amount, 0);
  const tax = (subtotal * (parseFloat(taxRate) || 0)) / 100;
  const total = subtotal + tax;

  const nextInvoiceNumber = () => {
    const n = items.length + 1;
    return `INV-${new Date().getFullYear()}-${String(n).padStart(4, "0")}`;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseLines();
    if (!patientName.trim() || parsed.length === 0) return;
    add({
      invoiceNumber: nextInvoiceNumber(),
      patientName: patientName.trim(),
      items: parsed,
      subtotal,
      taxRate: parseFloat(taxRate) || 0,
      tax,
      total,
      status: "unpaid",
      issuedAt: new Date().toISOString(),
    });
    setPatientName("");
    setLines([{ description: "", amount: "" }]);
    setShowForm(false);
  };

  const markPaid = (id: string) => update(id, { status: "paid" });

  const totalRevenue = items
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total, 0);
  const outstanding = items
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => s + i.total, 0);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Billing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Automated invoices with GST / VAT.</p>
        </div>
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary !py-2 !text-sm">
          {showForm ? "Close" : "+ New invoice"}
        </button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card label="Revenue (paid)" value={`$${totalRevenue.toLocaleString()}`} color="text-emerald-700" />
        <Card label="Outstanding" value={`$${outstanding.toLocaleString()}`} color="text-amber-700" />
        <Card label="Invoices" value={items.length} color="text-gray-900 dark:text-slate-100" />
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-4 space-y-3 rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Patient name</span>
              <input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-slate-300">Tax rate (%)</span>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-300">Line items</p>
            {lines.map((l, i) => (
              <div key={i} className="mb-2 flex gap-2">
                <input
                  value={l.description}
                  onChange={(e) => setLines(lines.map((x, idx) => idx === i ? { ...x, description: e.target.value } : x))}
                  placeholder="Description"
                  className="flex-1 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                <input
                  type="number"
                  step="0.01"
                  value={l.amount}
                  onChange={(e) => setLines(lines.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x))}
                  placeholder="Amount"
                  className="w-32 rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                />
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines(lines.filter((_, idx) => idx !== i))} className="rounded px-2 text-sm text-red-600 hover:bg-red-50">
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setLines([...lines, { description: "", amount: "" }])} className="text-xs font-medium text-primary-600 hover:text-primary-700">
              + Add line
            </button>
          </div>

          <div className="flex items-end justify-between border-t border-gray-100 pt-3">
            <div className="text-sm text-gray-600 dark:text-slate-300">
              <div>Subtotal: <b>${subtotal.toFixed(2)}</b></div>
              <div>Tax ({taxRate || 0}%): <b>${tax.toFixed(2)}</b></div>
              <div className="mt-1 text-lg font-bold text-gray-900 dark:text-slate-100">Total: ${total.toFixed(2)}</div>
            </div>
            <button type="submit" className="btn-primary !py-2 !text-sm">Create invoice</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-sm">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-gray-400 dark:text-slate-500 dark:text-slate-400">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 text-left text-xs uppercase text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {items.map((inv: ClinicInvoice) => (
                <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-slate-100">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{inv.patientName}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-slate-300">{new Date(inv.issuedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-slate-100">${inv.total.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.status === "paid" ? "bg-green-50 text-green-700" :
                      inv.status === "overdue" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {inv.status !== "paid" && (
                        <button onClick={() => markPaid(inv.id)} className="rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                          Mark paid
                        </button>
                      )}
                      <button onClick={() => remove(inv.id)} className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-4 shadow-sm">
      <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
