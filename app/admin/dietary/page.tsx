"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type DietType =
  | "regular" | "diabetic" | "renal" | "cardiac" | "low_sodium" | "low_fat"
  | "high_protein" | "soft" | "clear_liquid" | "full_liquid" | "pureed"
  | "npo" | "tube_feed" | "tpn" | "custom";
type MealSlot = "breakfast" | "mid_morning" | "lunch" | "tea" | "dinner" | "night";
type DietStatus = "active" | "on_hold" | "discontinued";
type DeliveryStatus = "served" | "refused" | "npo_skipped" | "partial";

interface DietOrder {
  id: string;
  orderNumber: string;
  patientId: string;
  admissionId?: string;
  dietType: DietType;
  caloriesKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  sodiumMgLimit?: number;
  potassiumMgLimit?: number;
  mealSlots: MealSlot[];
  textureNotes?: string;
  allergiesNote?: string;
  preferences?: string;
  restrictions?: string;
  feedFormula?: string;
  feedRateMlPerHr?: number;
  prescribedBy: string;
  startDate: string;
  endDate?: string;
  status: DietStatus;
  holdReason?: string;
  discontinuedAt?: string;
  discontinuedReason?: string;
  notes?: string;
}

interface Delivery {
  id: string;
  orderId: string;
  patientId: string;
  slot: MealSlot;
  servedAt: string;
  status: DeliveryStatus;
  servedBy?: string;
  percentConsumed?: number;
  notes?: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
}

const DIETS: { v: DietType; l: string }[] = [
  { v: "regular", l: "Regular" },
  { v: "diabetic", l: "Diabetic" },
  { v: "renal", l: "Renal" },
  { v: "cardiac", l: "Cardiac" },
  { v: "low_sodium", l: "Low Sodium" },
  { v: "low_fat", l: "Low Fat" },
  { v: "high_protein", l: "High Protein" },
  { v: "soft", l: "Soft" },
  { v: "clear_liquid", l: "Clear Liquid" },
  { v: "full_liquid", l: "Full Liquid" },
  { v: "pureed", l: "Pureed" },
  { v: "npo", l: "NPO" },
  { v: "tube_feed", l: "Tube Feed" },
  { v: "tpn", l: "TPN" },
  { v: "custom", l: "Custom" },
];
const MEALS: { v: MealSlot; l: string }[] = [
  { v: "breakfast", l: "Breakfast" },
  { v: "mid_morning", l: "Mid-morning" },
  { v: "lunch", l: "Lunch" },
  { v: "tea", l: "Tea" },
  { v: "dinner", l: "Dinner" },
  { v: "night", l: "Bedtime" },
];
const STATUSES: { v: DietStatus; l: string; cls: string }[] = [
  { v: "active", l: "Active", cls: "bg-emerald-100 text-emerald-700" },
  { v: "on_hold", l: "On Hold", cls: "bg-amber-100 text-amber-700" },
  { v: "discontinued", l: "Discontinued", cls: "bg-slate-200 text-slate-600" },
];
const DLVY_STATUSES: { v: DeliveryStatus; l: string; cls: string }[] = [
  { v: "served", l: "Served", cls: "bg-emerald-100 text-emerald-700" },
  { v: "partial", l: "Partial", cls: "bg-amber-100 text-amber-700" },
  { v: "refused", l: "Refused", cls: "bg-red-100 text-red-700" },
  { v: "npo_skipped", l: "NPO/Skipped", cls: "bg-slate-100 text-slate-600" },
];

function fmtDate(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}
function statusPill(status: DietStatus): string {
  return STATUSES.find((s) => s.v === status)?.cls || "";
}

export default function DietaryPage() {
  const [orders, setOrders] = useState<DietOrder[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deliveryForOrderId, setDeliveryForOrderId] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<DietStatus | "">("");
  const [filterDiet, setFilterDiet] = useState<DietType | "">("");
  const [filterPatient, setFilterPatient] = useState("");

  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedSlots, setSelectedSlots] = useState<MealSlot[]>([]);
  const [dForm, setDForm] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus) qs.set("status", filterStatus);
      if (filterDiet) qs.set("dietType", filterDiet);
      if (filterPatient) qs.set("patientId", filterPatient);
      const [oRes, dRes, pRes] = await Promise.all([
        fetch(`/api/hospital/dietary?${qs}`, { cache: "no-store" }),
        fetch(`/api/hospital/dietary/deliveries`, { cache: "no-store" }),
        fetch(`/api/patients`, { cache: "no-store" }),
      ]);
      if (oRes.ok) setOrders((await oRes.json()).orders || []);
      if (dRes.ok) setDeliveries((await dRes.json()).deliveries || []);
      if (pRes.ok) setPatients((await pRes.json()).patients || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterDiet, filterPatient]);

  const stats = useMemo(() => {
    const active = orders.filter((o) => o.status === "active").length;
    const npo = orders.filter((o) => o.dietType === "npo" && o.status === "active").length;
    const tpnOrTube = orders.filter(
      (o) => (o.dietType === "tpn" || o.dietType === "tube_feed") && o.status === "active"
    ).length;
    const today = new Date().toISOString().slice(0, 10);
    const mealsToday = deliveries.filter((d) => d.servedAt.startsWith(today)).length;
    return { active, npo, tpnOrTube, mealsToday };
  }, [orders, deliveries]);

  function openCreate() {
    setEditingId(null);
    setForm({
      patientId: filterPatient || (patients[0]?.id || ""),
      dietType: "regular",
      startDate: new Date().toISOString().slice(0, 10),
      status: "active",
      prescribedBy: "",
    });
    setSelectedSlots(["breakfast", "lunch", "dinner"]);
    setShowForm(true);
  }
  function openEdit(o: DietOrder) {
    setEditingId(o.id);
    setForm({
      patientId: o.patientId,
      admissionId: o.admissionId || "",
      dietType: o.dietType,
      caloriesKcal: o.caloriesKcal != null ? String(o.caloriesKcal) : "",
      proteinGrams: o.proteinGrams != null ? String(o.proteinGrams) : "",
      fluidMl: o.fluidMl != null ? String(o.fluidMl) : "",
      sodiumMgLimit: o.sodiumMgLimit != null ? String(o.sodiumMgLimit) : "",
      potassiumMgLimit: o.potassiumMgLimit != null ? String(o.potassiumMgLimit) : "",
      textureNotes: o.textureNotes || "",
      allergiesNote: o.allergiesNote || "",
      preferences: o.preferences || "",
      restrictions: o.restrictions || "",
      feedFormula: o.feedFormula || "",
      feedRateMlPerHr: o.feedRateMlPerHr != null ? String(o.feedRateMlPerHr) : "",
      prescribedBy: o.prescribedBy,
      startDate: o.startDate.slice(0, 10),
      endDate: o.endDate?.slice(0, 10) || "",
      status: o.status,
      holdReason: o.holdReason || "",
      discontinuedReason: o.discontinuedReason || "",
      notes: o.notes || "",
    });
    setSelectedSlots(o.mealSlots);
    setShowForm(true);
  }

  function toggleSlot(s: MealSlot) {
    setSelectedSlots((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );
  }

  async function submit() {
    if (!form.patientId) return;
    const payload: Record<string, unknown> = {
      ...form,
      mealSlots: selectedSlots,
      caloriesKcal: form.caloriesKcal ? Number(form.caloriesKcal) : undefined,
      proteinGrams: form.proteinGrams ? Number(form.proteinGrams) : undefined,
      fluidMl: form.fluidMl ? Number(form.fluidMl) : undefined,
      sodiumMgLimit: form.sodiumMgLimit ? Number(form.sodiumMgLimit) : undefined,
      potassiumMgLimit: form.potassiumMgLimit ? Number(form.potassiumMgLimit) : undefined,
      feedRateMlPerHr: form.feedRateMlPerHr ? Number(form.feedRateMlPerHr) : undefined,
    };
    const method = editingId ? "PATCH" : "POST";
    if (editingId) payload.id = editingId;
    const res = await fetch("/api/hospital/dietary", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setShowForm(false);
      setEditingId(null);
      await load();
    } else {
      alert("Save failed");
    }
  }

  async function removeOrder(id: string) {
    if (!confirm("Delete this diet order and its delivery log?")) return;
    const res = await fetch("/api/hospital/dietary", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) await load();
  }

  async function changeStatus(o: DietOrder, status: DietStatus) {
    let holdReason: string | undefined;
    let discontinuedReason: string | undefined;
    if (status === "on_hold") {
      holdReason = prompt("Hold reason?") || "";
      if (!holdReason) return;
    }
    if (status === "discontinued") {
      discontinuedReason = prompt("Discontinuation reason?") || "";
      if (!discontinuedReason) return;
    }
    const res = await fetch("/api/hospital/dietary", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: o.id, status, holdReason, discontinuedReason }),
    });
    if (res.ok) await load();
  }

  function openDelivery(orderId: string) {
    setDeliveryForOrderId(orderId);
    setDForm({
      slot: "lunch",
      servedAt: new Date().toISOString().slice(0, 16),
      status: "served",
      servedBy: "",
      percentConsumed: "100",
    });
  }
  async function submitDelivery() {
    if (!deliveryForOrderId) return;
    const payload: Record<string, unknown> = {
      ...dForm,
      orderId: deliveryForOrderId,
      percentConsumed: dForm.percentConsumed ? Number(dForm.percentConsumed) : undefined,
      servedAt: dForm.servedAt ? new Date(dForm.servedAt).toISOString() : undefined,
    };
    const res = await fetch("/api/hospital/dietary/deliveries", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setDeliveryForOrderId(null);
      setDForm({});
      await load();
    } else {
      alert("Failed to log meal");
    }
  }

  function patientLabel(pid: string) {
    const p = patients.find((x) => x.id === pid);
    return p ? `${p.firstName} ${p.lastName}` : "—";
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🍽️"
        eyebrow="Clinical Nutrition"
        title="Dietary Orders"
        subtitle="Clinical nutrition prescriptions and meal-delivery log"
        tone="emerald"
        primaryAction={{ label: "+ Prescribe Diet", onClick: openCreate }}
      />

      <StatGrid cols={4}>
        <StatCard label="Active orders" value={stats.active} tone="emerald" icon="📋" />
        <StatCard label="NPO (active)" value={stats.npo} tone={stats.npo > 0 ? "rose" : "slate"} icon="🚫" />
        <StatCard label="Tube feed / TPN" value={stats.tpnOrTube} tone={stats.tpnOrTube > 0 ? "amber" : "slate"} icon="💉" />
        <StatCard label="Meals today" value={stats.mealsToday} tone="indigo" icon="🍱" />
      </StatGrid>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        <select
          value={filterPatient}
          onChange={(e) => setFilterPatient(e.target.value)}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">All patients</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as DietStatus | "")}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <select
          value={filterDiet}
          onChange={(e) => setFilterDiet(e.target.value as DietType | "")}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">All diet types</option>
          {DIETS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              {editingId ? "Edit Diet Order" : "Prescribe Diet"}
            </h2>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>

          <Section title="Patient & Prescription">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Patient *">
                <select value={form.patientId || ""} onChange={(e) => setForm({ ...form, patientId: e.target.value })} className="inp">
                  <option value="">Select patient…</option>
                  {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
                </select>
              </Field>
              <Field label="Admission ID (optional)">
                <input value={form.admissionId || ""} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} className="inp" />
              </Field>
              <Field label="Prescribed By">
                <input value={form.prescribedBy || ""} onChange={(e) => setForm({ ...form, prescribedBy: e.target.value })} className="inp" placeholder="Dr. / Dietician" />
              </Field>
              <Field label="Diet Type">
                <select value={form.dietType || "regular"} onChange={(e) => setForm({ ...form, dietType: e.target.value })} className="inp">
                  {DIETS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
                </select>
              </Field>
              <Field label="Start Date">
                <input type="date" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="inp" />
              </Field>
              <Field label="End Date">
                <input type="date" value={form.endDate || ""} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="inp" />
              </Field>
            </div>
          </Section>

          <Section title="Meal slots">
            <div className="flex flex-wrap gap-2">
              {MEALS.map((m) => {
                const on = selectedSlots.includes(m.v);
                return (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => toggleSlot(m.v)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      on
                        ? "border-primary-300 bg-primary-50 text-primary-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {on ? "✓ " : ""}{m.l}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Therapeutic targets">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Calories (kcal)">
                <input type="number" value={form.caloriesKcal || ""} onChange={(e) => setForm({ ...form, caloriesKcal: e.target.value })} className="inp" />
              </Field>
              <Field label="Protein (g)">
                <input type="number" value={form.proteinGrams || ""} onChange={(e) => setForm({ ...form, proteinGrams: e.target.value })} className="inp" />
              </Field>
              <Field label="Fluid (ml)">
                <input type="number" value={form.fluidMl || ""} onChange={(e) => setForm({ ...form, fluidMl: e.target.value })} className="inp" />
              </Field>
              <Field label="Na limit (mg)">
                <input type="number" value={form.sodiumMgLimit || ""} onChange={(e) => setForm({ ...form, sodiumMgLimit: e.target.value })} className="inp" />
              </Field>
              <Field label="K limit (mg)">
                <input type="number" value={form.potassiumMgLimit || ""} onChange={(e) => setForm({ ...form, potassiumMgLimit: e.target.value })} className="inp" />
              </Field>
            </div>
          </Section>

          {(form.dietType === "tube_feed" || form.dietType === "tpn") && (
            <Section title="Feed details">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Field label="Formula">
                  <input value={form.feedFormula || ""} onChange={(e) => setForm({ ...form, feedFormula: e.target.value })} className="inp" placeholder="Ensure / Osmolite / …" />
                </Field>
                <Field label="Rate (ml/hr)">
                  <input type="number" value={form.feedRateMlPerHr || ""} onChange={(e) => setForm({ ...form, feedRateMlPerHr: e.target.value })} className="inp" />
                </Field>
              </div>
            </Section>
          )}

          <Section title="Restrictions & preferences">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Texture notes">
                <input value={form.textureNotes || ""} onChange={(e) => setForm({ ...form, textureNotes: e.target.value })} className="inp" placeholder="minced / thickened fluids L2" />
              </Field>
              <Field label="Allergies">
                <input value={form.allergiesNote || ""} onChange={(e) => setForm({ ...form, allergiesNote: e.target.value })} className="inp" />
              </Field>
              <Field label="Preferences">
                <input value={form.preferences || ""} onChange={(e) => setForm({ ...form, preferences: e.target.value })} className="inp" placeholder="veg / jain / halal" />
              </Field>
              <Field label="Restrictions">
                <input value={form.restrictions || ""} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} className="inp" placeholder="no citrus, no dairy" />
              </Field>
            </div>
          </Section>

          <Section title="Notes & status">
            <Field label="Notes">
              <textarea rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="inp" />
            </Field>
          </Section>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button onClick={submit} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              {editingId ? "Save changes" : "Prescribe"}
            </button>
          </div>
        </div>
      )}

      {deliveryForOrderId && (
        <div className="rounded-xl border border-primary-200 bg-primary-50/30 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">
              Record meal — {orders.find((o) => o.id === deliveryForOrderId)?.orderNumber}
            </h2>
            <button onClick={() => setDeliveryForOrderId(null)} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="Meal slot">
              <select value={dForm.slot || "lunch"} onChange={(e) => setDForm({ ...dForm, slot: e.target.value })} className="inp">
                {MEALS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </Field>
            <Field label="Served at">
              <input type="datetime-local" value={dForm.servedAt || ""} onChange={(e) => setDForm({ ...dForm, servedAt: e.target.value })} className="inp" />
            </Field>
            <Field label="Status">
              <select value={dForm.status || "served"} onChange={(e) => setDForm({ ...dForm, status: e.target.value })} className="inp">
                {DLVY_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="% consumed">
              <input type="number" min={0} max={100} value={dForm.percentConsumed || ""} onChange={(e) => setDForm({ ...dForm, percentConsumed: e.target.value })} className="inp" />
            </Field>
            <Field label="Served by">
              <input value={dForm.servedBy || ""} onChange={(e) => setDForm({ ...dForm, servedBy: e.target.value })} className="inp" />
            </Field>
            <div className="md:col-span-3">
              <Field label="Notes">
                <input value={dForm.notes || ""} onChange={(e) => setDForm({ ...dForm, notes: e.target.value })} className="inp" />
              </Field>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setDeliveryForOrderId(null)} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button onClick={submitDelivery} className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Log meal
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5 text-left">Order / Patient</th>
              <th className="px-4 py-2.5 text-left">Diet</th>
              <th className="px-4 py-2.5 text-left">Meals</th>
              <th className="px-4 py-2.5 text-left">Targets</th>
              <th className="px-4 py-2.5 text-left">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No diet orders.</td></tr>
            )}
            {orders.map((o) => {
              const isOpen = expanded === o.id;
              const orderDeliveries = deliveries.filter((d) => d.orderId === o.id);
              return (
                <Fragment key={o.id}>
                  <tr onClick={() => setExpanded(isOpen ? null : o.id)} className="cursor-pointer hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-slate-500">{o.orderNumber}</div>
                      <div className="font-medium text-slate-900">{patientLabel(o.patientId)}</div>
                      <div className="text-[11px] text-slate-500">Rx: {o.prescribedBy || "—"} · {fmtDate(o.startDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${o.dietType === "npo" ? "bg-red-100 text-red-700" : o.dietType === "tpn" || o.dietType === "tube_feed" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                        {DIETS.find((d) => d.v === o.dietType)?.l}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {o.mealSlots.map((s) => MEALS.find((m) => m.v === s)?.l?.slice(0, 3)).join(" · ")}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600">
                      {o.caloriesKcal ? <span>{o.caloriesKcal} kcal</span> : null}
                      {o.proteinGrams ? <span>{o.caloriesKcal ? " · " : ""}{o.proteinGrams}g P</span> : null}
                      {o.fluidMl ? <span>{" · "}{o.fluidMl}ml</span> : null}
                      {!o.caloriesKcal && !o.proteinGrams && !o.fluidMl && <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={o.status}
                        onChange={(e) => changeStatus(o, e.target.value as DietStatus)}
                        className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold ${statusPill(o.status)}`}
                      >
                        {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDelivery(o.id)} className="mr-2 rounded-md bg-primary-50 px-2 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100">
                        + Meal
                      </button>
                      <button onClick={() => openEdit(o)} className="mr-2 text-xs font-medium text-slate-600 hover:text-slate-900">
                        Edit
                      </button>
                      <button onClick={() => removeOrder(o.id)} className="text-xs font-medium text-red-600 hover:text-red-700">
                        Delete
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                          <KV k="Texture" v={o.textureNotes || "—"} />
                          <KV k="Allergies" v={o.allergiesNote || "—"} />
                          <KV k="Preferences" v={o.preferences || "—"} />
                          <KV k="Restrictions" v={o.restrictions || "—"} />
                          {(o.dietType === "tube_feed" || o.dietType === "tpn") && (
                            <>
                              <KV k="Formula" v={o.feedFormula || "—"} />
                              <KV k="Rate" v={o.feedRateMlPerHr ? `${o.feedRateMlPerHr} ml/hr` : "—"} />
                            </>
                          )}
                          <KV k="End date" v={fmtDate(o.endDate)} />
                        </div>
                        {o.holdReason && (
                          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
                            <span className="font-semibold">On hold:</span> {o.holdReason}
                          </div>
                        )}
                        {o.discontinuedReason && (
                          <div className="mt-3 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                            <span className="font-semibold">Discontinued {fmtDate(o.discontinuedAt)}:</span> {o.discontinuedReason}
                          </div>
                        )}
                        {o.notes && (
                          <div className="mt-3 rounded-md bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
                            <span className="font-semibold">Notes:</span> {o.notes}
                          </div>
                        )}
                        <div className="mt-4">
                          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Delivery log ({orderDeliveries.length})
                          </div>
                          {orderDeliveries.length === 0 ? (
                            <div className="text-xs text-slate-400">No meals logged.</div>
                          ) : (
                            <div className="overflow-hidden rounded-md ring-1 ring-slate-200">
                              <table className="w-full text-xs">
                                <thead className="bg-white text-[10px] uppercase tracking-wider text-slate-500">
                                  <tr>
                                    <th className="px-2 py-1.5 text-left">Time</th>
                                    <th className="px-2 py-1.5 text-left">Slot</th>
                                    <th className="px-2 py-1.5 text-left">Status</th>
                                    <th className="px-2 py-1.5 text-left">%</th>
                                    <th className="px-2 py-1.5 text-left">Served by</th>
                                    <th className="px-2 py-1.5 text-left">Notes</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {orderDeliveries.map((d) => (
                                    <tr key={d.id}>
                                      <td className="px-2 py-1.5 text-slate-600">{new Date(d.servedAt).toLocaleString()}</td>
                                      <td className="px-2 py-1.5 text-slate-700">{MEALS.find((m) => m.v === d.slot)?.l}</td>
                                      <td className="px-2 py-1.5">
                                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${DLVY_STATUSES.find((s) => s.v === d.status)?.cls || ""}`}>
                                          {DLVY_STATUSES.find((s) => s.v === d.status)?.l}
                                        </span>
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-600">{d.percentConsumed != null ? `${d.percentConsumed}%` : "—"}</td>
                                      <td className="px-2 py-1.5 text-slate-600">{d.servedBy || "—"}</td>
                                      <td className="px-2 py-1.5 text-slate-600">{d.notes || "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .inp:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 2px rgb(224 231 255);
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "amber" | "emerald" }) {
  const tones: Record<string, string> = {
    slate: "text-slate-900", red: "text-red-600", amber: "text-amber-600", emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tones[tone]}`}>{value}</div>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium text-slate-600">{label}</div>
      {children}
    </label>
  );
}
function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
      <div className="mt-0.5 text-xs text-slate-700">{v}</div>
    </div>
  );
}
