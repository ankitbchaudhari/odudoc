"use client";

import { useEffect, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type { Ward, WardType, BedStatus } from "@/lib/hospital/wards-store";

const WARD_TYPES: WardType[] = [
  "general",
  "private",
  "semi_private",
  "icu",
  "nicu",
  "picu",
  "hdu",
  "isolation",
  "maternity",
  "other",
];

const STATUS_COLORS: Record<BedStatus, string> = {
  available: "bg-emerald-100 text-emerald-700",
  occupied: "bg-red-100 text-red-700",
  reserved: "bg-amber-100 text-amber-700",
  maintenance: "bg-slate-200 text-slate-600",
};

interface WardForm {
  name: string;
  type: WardType;
  floor: string;
  dailyRate: string;
  notes: string;
}

const EMPTY_WARD: WardForm = {
  name: "",
  type: "general",
  floor: "",
  dailyRate: "0",
  notes: "",
};

export default function WardsPage() {
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<WardForm>(EMPTY_WARD);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [bedForm, setBedForm] = useState({ bedNumber: "", dailyRate: "" });

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/hospital/wards", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "load_failed");
      setWards(data.wards || []);
    } catch (e) {
      setErr(String((e as Error).message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function reset() {
    setForm(EMPTY_WARD);
    setEditingId(null);
    setShowForm(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      floor: form.floor.trim() || undefined,
      dailyRate: Number(form.dailyRate) || 0,
      notes: form.notes.trim() || undefined,
    };
    const res = await fetch("/api/hospital/wards", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "save_failed");
      return;
    }
    reset();
    load();
  }

  function startEdit(w: Ward) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      type: w.type,
      floor: w.floor || "",
      dailyRate: String(w.dailyRate),
      notes: w.notes || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete ward? Fails if any bed is occupied.")) return;
    const res = await fetch("/api/hospital/wards", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  async function addBed(wardId: string) {
    if (!bedForm.bedNumber.trim()) {
      alert("Bed number required");
      return;
    }
    const res = await fetch("/api/hospital/wards", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: wardId,
        addBed: {
          bedNumber: bedForm.bedNumber,
          dailyRate: bedForm.dailyRate ? Number(bedForm.dailyRate) : undefined,
        },
      }),
    });
    if (res.ok) {
      setBedForm({ bedNumber: "", dailyRate: "" });
      load();
    }
  }

  async function updateBedStatus(wardId: string, bedId: string, status: BedStatus) {
    const res = await fetch("/api/hospital/wards", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: wardId,
        updateBed: { bedId, status },
      }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  async function removeBed(wardId: string, bedId: string) {
    if (!confirm("Remove bed?")) return;
    const res = await fetch("/api/hospital/wards", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: wardId, removeBedId: bedId }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    load();
  }

  const totalBeds = wards.reduce((s, w) => s + w.beds.length, 0);
  const occupied = wards.reduce(
    (s, w) => s + w.beds.filter((b) => b.status === "occupied").length,
    0
  );
  const occupancyPct = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHero
        icon="🏥"
        eyebrow="Bed Management"
        title="Wards & Beds"
        subtitle="Ward/bed catalog with occupancy, daily rates, and status management"
        tone="indigo"
        primaryAction={{ label: showForm ? "Close" : "+ New ward", onClick: () => (showForm ? reset() : setShowForm(true)) }}
      />

      <StatGrid cols={4}>
        <StatCard label="Wards" value={wards.length} tone="indigo" icon="🏨" />
        <StatCard label="Total beds" value={totalBeds} tone="violet" icon="🛏️" />
        <StatCard label="Occupied" value={occupied} tone={occupied > 0 ? "rose" : "slate"} icon="🔴" />
        <StatCard label="Occupancy" value={`${occupancyPct}%`} tone={occupancyPct >= 85 ? "amber" : "emerald"} icon="📊" />
      </StatGrid>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-semibold">{editingId ? "Edit ward" : "New ward"}</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Name*">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="Type*">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WardType })} className="input">
                {WARD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Floor">
              <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} className="input" />
            </Field>
            <Field label="Daily rate (per bed)">
              <input type="number" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} className="input" />
            </Field>
            <Field label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input" />
            </Field>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white">
              {editingId ? "Save" : "Create"}
            </button>
            <button type="button" onClick={reset} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">Loading…</div>
      ) : wards.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-400">
          No wards yet.
        </div>
      ) : (
        <div className="space-y-3">
          {wards.map((w) => {
            const isOpen = expanded === w.id;
            const occ = w.beds.filter((b) => b.status === "occupied").length;
            return (
              <div key={w.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{w.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                        {w.type}
                      </span>
                      {w.floor && (
                        <span className="text-[11px] text-slate-500">Floor {w.floor}</span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {w.beds.length} beds · {occ} occupied · ₹{w.dailyRate}/day
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setExpanded(isOpen ? null : w.id)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      {isOpen ? "Hide" : "Beds"}
                    </button>
                    <button
                      onClick={() => startEdit(w)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(w.id)}
                      className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/50 dark:bg-slate-800/30 p-4">
                    <div className="mb-3 flex items-end gap-2">
                      <Field label="Bed #">
                        <input
                          value={bedForm.bedNumber}
                          onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
                          className="input w-32"
                          placeholder="A-101"
                        />
                      </Field>
                      <Field label="Rate override">
                        <input
                          type="number"
                          value={bedForm.dailyRate}
                          onChange={(e) => setBedForm({ ...bedForm, dailyRate: e.target.value })}
                          className="input w-32"
                          placeholder="(ward rate)"
                        />
                      </Field>
                      <button
                        onClick={() => addBed(w.id)}
                        className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-900"
                      >
                        + Add bed
                      </button>
                    </div>
                    {w.beds.length === 0 ? (
                      <div className="text-sm text-slate-500">No beds.</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
                        {w.beds.map((b) => (
                          <div
                            key={b.id}
                            className={`rounded-lg border p-3 text-center ${
                              b.status === "occupied"
                                ? "border-red-200 bg-red-50"
                                : b.status === "available"
                                  ? "border-emerald-200 bg-emerald-50"
                                  : "border-slate-200 bg-white"
                            }`}
                          >
                            <div className="font-mono text-sm font-semibold">{b.bedNumber}</div>
                            <div className={`my-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[b.status]}`}>
                              {b.status}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              ₹{b.dailyRate ?? w.dailyRate}/day
                            </div>
                            <div className="mt-2 flex justify-center gap-1">
                              {b.status !== "occupied" && (
                                <>
                                  <select
                                    value={b.status}
                                    onChange={(e) => updateBedStatus(w.id, b.id, e.target.value as BedStatus)}
                                    className="rounded border border-slate-300 px-1 py-0.5 text-[10px]"
                                  >
                                    <option value="available">avail</option>
                                    <option value="reserved">reserved</option>
                                    <option value="maintenance">maint</option>
                                  </select>
                                  <button
                                    onClick={() => removeBed(w.id, b.id)}
                                    className="text-[10px] text-red-600 hover:underline"
                                  >
                                    del
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
