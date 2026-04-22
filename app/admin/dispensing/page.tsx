"use client";

import { useEffect, useMemo, useState } from "react";
import type { DispenseRecord } from "@/lib/hospital/dispensing-store";
import type { InventoryItem } from "@/lib/hospital/inventory-store";
import type { HospitalPrescription } from "@/lib/hospital/prescriptions-store";
import type { Patient } from "@/lib/patients-store";

interface DraftLine {
  itemId: string;
  quantity: string;
  unitPrice: string;
  instructions: string;
  rxItemIndex?: number;
}

const EMPTY_LINE: DraftLine = {
  itemId: "",
  quantity: "1",
  unitPrice: "",
  instructions: "",
};

function onHand(it: InventoryItem): number {
  return it.batches.reduce((s, b) => s + (b.quantity || 0), 0);
}

function latestSell(it: InventoryItem): number {
  const b = [...it.batches]
    .filter((x) => x.sellingPrice !== undefined)
    .sort(
      (a, c) =>
        new Date(c.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    )[0];
  return b?.sellingPrice ?? 0;
}

export default function DispensingPage() {
  const [dispenses, setDispenses] = useState<DispenseRecord[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<HospitalPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filterPatient, setFilterPatient] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [dispensedBy, setDispensedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([{ ...EMPTY_LINE }]);

  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const q = new URLSearchParams();
      if (filterPatient) q.set("patientId", filterPatient);
      const [dRes, iRes, pRes, rxRes] = await Promise.all([
        fetch(`/api/hospital/dispensing?${q.toString()}`, { cache: "no-store" }),
        fetch("/api/hospital/inventory", { cache: "no-store" }),
        fetch("/api/patients", { cache: "no-store" }),
        fetch("/api/hospital/prescriptions", { cache: "no-store" }),
      ]);
      const d = await dRes.json();
      const i = await iRes.json();
      const p = await pRes.json();
      const rx = await rxRes.json();
      if (!dRes.ok) throw new Error(d.error || "load_failed");
      setDispenses(d.dispenses || []);
      setItems(i.items || []);
      setPatients(p.patients || []);
      setPrescriptions(rx.prescriptions || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    patients.forEach((p) => m.set(p.id, p));
    return m;
  }, [patients]);

  const itemMap = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    items.forEach((i) => m.set(i.id, i));
    return m;
  }, [items]);

  const activeRx = useMemo(
    () =>
      prescriptions.filter(
        (r) =>
          r.status === "active" && (!patientId || r.patientId === patientId)
      ),
    [prescriptions, patientId]
  );

  function reset() {
    setPatientId("");
    setPrescriptionId("");
    setDispensedBy("");
    setNotes("");
    setLines([{ ...EMPTY_LINE }]);
    setShowForm(false);
  }

  function addLine() {
    setLines((ls) => [...ls, { ...EMPTY_LINE }]);
  }
  function removeLine(i: number) {
    setLines((ls) => (ls.length <= 1 ? ls : ls.filter((_, idx) => idx !== i)));
  }
  function updateLine(i: number, patch: Partial<DraftLine>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  // Auto-fill unit price from selected item's latest selling price.
  function onItemChange(i: number, itemId: string) {
    const it = itemMap.get(itemId);
    updateLine(i, {
      itemId,
      unitPrice: it ? String(latestSell(it)) : "",
    });
  }

  // When a prescription is picked, seed lines from its medication items
  // (trying fuzzy-match drugName to inventory item name).
  function onPrescriptionChange(id: string) {
    setPrescriptionId(id);
    if (!id) return;
    const rx = prescriptions.find((r) => r.id === id);
    if (!rx) return;
    if (rx.patientId) setPatientId(rx.patientId);
    const seeded: DraftLine[] = rx.items.map((it, idx) => {
      const name = it.drugName.toLowerCase();
      const match = items.find(
        (inv) =>
          inv.name.toLowerCase() === name ||
          inv.name.toLowerCase().includes(name) ||
          name.includes(inv.name.toLowerCase())
      );
      return {
        itemId: match?.id || "",
        quantity: String(it.quantity || 1),
        unitPrice: match ? String(latestSell(match)) : "",
        instructions: [it.dose, it.frequency, it.instructions]
          .filter(Boolean)
          .join(" · "),
        rxItemIndex: idx,
      };
    });
    setLines(seeded.length > 0 ? seeded : [{ ...EMPTY_LINE }]);
  }

  const draftTotal = useMemo(() => {
    let t = 0;
    for (const l of lines) {
      const q = Number(l.quantity) || 0;
      const p = Number(l.unitPrice) || 0;
      t += q * p;
    }
    return Math.round(t * 100) / 100;
  }, [lines]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) {
      alert("Select a patient");
      return;
    }
    const validLines = lines
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        unitPrice: l.unitPrice ? Number(l.unitPrice) : undefined,
        rxItemIndex: l.rxItemIndex,
        instructions: l.instructions || undefined,
      }));
    if (validLines.length === 0) {
      alert("Add at least one item with a quantity");
      return;
    }
    const res = await fetch("/api/hospital/dispensing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId,
        prescriptionId: prescriptionId || undefined,
        dispensedBy: dispensedBy || undefined,
        notes: notes || undefined,
        items: validLines,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const offender = data.itemId ? ` (item ${itemMap.get(data.itemId)?.name || data.itemId})` : "";
      alert(`${data.error}${offender}`);
      return;
    }
    reset();
    load();
  }

  async function cancel(id: string) {
    if (!confirm("Mark this dispense as cancelled? Stock will NOT be auto-returned.")) return;
    const res = await fetch("/api/hospital/dispensing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, cancel: true }),
    });
    if (res.ok) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Pharmacy Dispensing
          </h2>
          <p className="text-sm text-slate-500">
            Dispense medications against inventory (FEFO). Creates stock
            movements traced to the prescription.
          </p>
        </div>
        <button
          onClick={() => (showForm ? reset() : setShowForm(true))}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {showForm ? "Close" : "+ New dispense"}
        </button>
      </div>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
        >
          <h3 className="text-sm font-semibold text-slate-900">New dispense</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Prescription (optional)">
              <select
                value={prescriptionId}
                onChange={(e) => onPrescriptionChange(e.target.value)}
                className="input"
              >
                <option value="">— none —</option>
                {activeRx.map((r) => {
                  const p = patientMap.get(r.patientId);
                  return (
                    <option key={r.id} value={r.id}>
                      {p ? `${p.firstName} ${p.lastName}` : r.patientId} —{" "}
                      {r.items.length} med(s) —{" "}
                      {new Date(r.issuedAt).toLocaleDateString()}
                    </option>
                  );
                })}
              </select>
            </Field>
            <Field label="Patient*">
              <select
                required
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="input"
              >
                <option value="">— select —</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dispensed by">
              <input
                value={dispensedBy}
                onChange={(e) => setDispensedBy(e.target.value)}
                className="input"
                placeholder="Pharmacist name"
              />
            </Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Items
              </h4>
              <button
                type="button"
                onClick={addLine}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => {
                const it = itemMap.get(l.itemId);
                const avail = it ? onHand(it) : 0;
                const qty = Number(l.quantity) || 0;
                const shortfall = it && qty > avail;
                return (
                  <div
                    key={i}
                    className="grid grid-cols-12 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <div className="col-span-4">
                      <select
                        value={l.itemId}
                        onChange={(e) => onItemChange(i, e.target.value)}
                        className="input"
                      >
                        <option value="">— item —</option>
                        {items.map((inv) => (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} ({onHand(inv)} {inv.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(i, { quantity: e.target.value })
                        }
                        className={`input ${shortfall ? "border-red-400" : ""}`}
                        placeholder="Qty"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={l.unitPrice}
                        onChange={(e) =>
                          updateLine(i, { unitPrice: e.target.value })
                        }
                        className="input"
                        placeholder="Unit price"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        value={l.instructions}
                        onChange={(e) =>
                          updateLine(i, { instructions: e.target.value })
                        }
                        className="input"
                        placeholder="Instructions (optional)"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-100 hover:text-red-600"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                    {shortfall && (
                      <div className="col-span-12 text-[11px] text-red-600">
                        Only {avail} {it?.unit} on hand.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input min-h-[60px]"
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-sm text-slate-600">Total</div>
            <div className="text-lg font-semibold text-slate-900">
              {draftTotal.toFixed(2)}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Dispense
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Field label="Patient">
          <select
            value={filterPatient}
            onChange={(e) => setFilterPatient(e.target.value)}
            className="input"
          >
            <option value="">All patients</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={load}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900"
        >
          Apply
        </button>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Dispensed</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : dispenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No dispenses yet.
                </td>
              </tr>
            ) : (
              dispenses.map((d) => {
                const p = patientMap.get(d.patientId);
                const isOpen = expanded === d.id;
                return (
                  <>
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(d.dispensedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {p ? (
                          <div className="font-medium text-slate-900">
                            {p.firstName} {p.lastName}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {d.prescriptionId && (
                          <div className="text-[11px] text-slate-500">
                            Rx: {d.prescriptionId.slice(0, 10)}…
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {d.items.length}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {d.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            d.status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => setExpanded(isOpen ? null : d.id)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                          >
                            {isOpen ? "Hide" : "View"}
                          </button>
                          {d.status === "completed" && (
                            <button
                              onClick={() => cancel(d.id)}
                              className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr key={d.id + "-detail"} className="bg-slate-50/50">
                        <td colSpan={6} className="px-4 py-4">
                          <table className="w-full text-xs">
                            <thead className="bg-slate-100 text-left text-[10px] uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-2 py-2">Item</th>
                                <th className="px-2 py-2">Qty</th>
                                <th className="px-2 py-2">Unit</th>
                                <th className="px-2 py-2">Total</th>
                                <th className="px-2 py-2">Batches</th>
                                <th className="px-2 py-2">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.items.map((li, idx) => (
                                <tr
                                  key={idx}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-2 py-1.5">
                                    <div className="font-medium text-slate-900">
                                      {li.itemName}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-500">
                                      {li.itemSku}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {li.quantity} {li.unit}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {li.unitPrice.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1.5 font-semibold">
                                    {li.totalPrice.toFixed(2)}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    {li.batches.map((b) => (
                                      <div
                                        key={b.batchId}
                                        className="text-[10px]"
                                      >
                                        {b.batchNumber} × {b.quantity}
                                      </div>
                                    ))}
                                  </td>
                                  <td className="px-2 py-1.5 text-slate-600">
                                    {li.instructions || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {d.notes && (
                            <div className="mt-2 text-xs text-slate-600">
                              <b>Notes:</b> {d.notes}
                            </div>
                          )}
                          {d.dispensedBy && (
                            <div className="mt-1 text-xs text-slate-500">
                              Dispensed by: {d.dispensedBy}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}
