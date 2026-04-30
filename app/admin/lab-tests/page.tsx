"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface LabTest {
  id: string;
  slug: string;
  name: string;
  description: string;
  parameters: number;
  price: number;
  originalPrice: number;
  popular: boolean;
  turnaround: string;
  active: boolean;
}

interface DoctorRow {
  id: string;
  name: string;
  email?: string;
  specialty: string;
  status: string;
}

interface RxLite {
  id: string;
  doctorEmail: string;
  patientEmail: string;
  data?: { patientName?: string; tests?: string[] };
  status: string;
  createdAt: string;
}

export default function AdminLabTests() {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<RxLite[]>([]);
  const [filterDoctorEmail, setFilterDoctorEmail] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    parameters: 0,
    price: 0,
    originalPrice: 0,
    popular: false,
    turnaround: "24-48 hours",
    active: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Catalogue + doctors + prescriptions are loaded together. The
      // doctor activity panel below the catalogue mines the
      // prescription store for `data.tests` arrays so we can show
      // which doctors are actually ordering lab tests for patients —
      // independent of who's curating the diagnostic catalogue.
      const [catRes, drRes, rxRes] = await Promise.all([
        fetch("/api/lab-tests?view=admin", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { tests: [] }
        ),
        fetch("/api/admin/doctors", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { doctors: [] }
        ),
        fetch("/api/prescriptions", { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : { prescriptions: [] }
        ),
      ]);
      setTests(catRes.tests || []);
      setDoctors(drRes.doctors || []);
      setPrescriptions(rxRes.prescriptions || []);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Per-doctor lab-test counts. We treat any prescription whose
   *  data.tests array is non-empty as "doctor ordered tests" and
   *  count individual test entries as well so admins can see both
   *  "5 prescriptions with tests" and "12 tests ordered total". */
  const labStatsByDoctor = useMemo(() => {
    const map = new Map<
      string,
      { prescriptionsWithTests: number; testsOrdered: number; lastOrderedAt?: string }
    >();
    for (const p of prescriptions) {
      const tests = p.data?.tests || [];
      if (!Array.isArray(tests) || tests.length === 0) continue;
      const k = (p.doctorEmail || "").toLowerCase();
      const cur = map.get(k) || { prescriptionsWithTests: 0, testsOrdered: 0 };
      cur.prescriptionsWithTests += 1;
      cur.testsOrdered += tests.length;
      if (!cur.lastOrderedAt || p.createdAt > cur.lastOrderedAt) {
        cur.lastOrderedAt = p.createdAt;
      }
      map.set(k, cur);
    }
    return map;
  }, [prescriptions]);

  /** Flat list of "lab order rows" — one per (prescription, test).
   *  This is what we show in the bottom table when an admin wants to
   *  audit specific tests rather than per-doctor totals. */
  const labOrderRows = useMemo(() => {
    const rows: Array<{
      key: string;
      doctorEmail: string;
      patientName: string;
      patientEmail: string;
      testName: string;
      orderedAt: string;
      prescriptionId: string;
      prescriptionStatus: string;
    }> = [];
    for (const p of prescriptions) {
      const tests = p.data?.tests || [];
      if (!Array.isArray(tests)) continue;
      tests.forEach((t, idx) => {
        if (!t?.trim()) return;
        rows.push({
          key: `${p.id}-${idx}`,
          doctorEmail: p.doctorEmail || "",
          patientName: p.data?.patientName || "—",
          patientEmail: p.patientEmail,
          testName: t,
          orderedAt: p.createdAt,
          prescriptionId: p.id,
          prescriptionStatus: p.status,
        });
      });
    }
    return rows
      .filter((r) =>
        filterDoctorEmail
          ? r.doctorEmail.toLowerCase() === filterDoctorEmail
          : true,
      )
      .sort((a, b) => (a.orderedAt < b.orderedAt ? 1 : -1));
  }, [prescriptions, filterDoctorEmail]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      parameters: 0,
      price: 0,
      originalPrice: 0,
      popular: false,
      turnaround: "24-48 hours",
      active: true,
    });
    setEditingId(null);
  };

  const handleEdit = (t: LabTest) => {
    setForm({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      price: t.price,
      originalPrice: t.originalPrice,
      popular: t.popular,
      turnaround: t.turnaround,
      active: t.active,
    });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price < 0) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch("/api/lab-tests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch("/api/lab-tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lab test?")) return;
    await fetch("/api/lab-tests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const toggleActive = async (t: LabTest) => {
    await fetch("/api/lab-tests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: t.id, active: !t.active }),
    });
    await load();
  };

  return (
    <div>
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-pink-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink-300 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-pink-400" />
              </span>
              Diagnostic catalogue
            </div>
            <h2 className="text-2xl font-bold">Lab Tests</h2>
            <p className="mt-1 text-sm text-violet-50/90">
              {tests.length} total · {tests.filter((t) => t.active).length} active · {tests.filter((t) => t.popular).length} popular
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Test
          </button>
        </div>
      </div>

      {/* Doctor activity panel — every doctor on the platform with
          their lab-test ordering activity, sourced from prescriptions
          that include a tests/investigations array. Click a card to
          filter the orders table below. */}
      {!loading && doctors.length > 0 && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-3">
            <div>
              <p className="text-sm font-bold text-slate-900">
                Doctors &amp; their lab-test orders · {doctors.length} doctor{doctors.length === 1 ? "" : "s"}
              </p>
              <p className="text-[11px] text-slate-500">
                Counts come from prescriptions that include investigations.
                Click a card to filter the orders table.
              </p>
            </div>
            {filterDoctorEmail && (
              <button
                onClick={() => setFilterDoctorEmail(null)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                ✕ Clear doctor filter
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d, i) => {
              const palettes = [
                "from-violet-500 to-fuchsia-500",
                "from-cyan-500 to-blue-500",
                "from-emerald-500 to-teal-500",
                "from-amber-500 to-orange-500",
                "from-rose-500 to-pink-500",
                "from-indigo-500 to-purple-500",
              ];
              const grad = palettes[i % palettes.length];
              const initials = (d.name || "?")
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const stats = labStatsByDoctor.get((d.email || "").toLowerCase()) || {
                prescriptionsWithTests: 0,
                testsOrdered: 0,
              };
              const selected = filterDoctorEmail === (d.email || "").toLowerCase();
              return (
                <button
                  key={d.id}
                  onClick={() =>
                    setFilterDoctorEmail(
                      selected ? null : (d.email || "").toLowerCase() || null,
                    )
                  }
                  disabled={!d.email}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? "border-violet-400 bg-violet-50 shadow-md ring-2 ring-violet-300/50"
                      : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                  }`}
                >
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-sm font-bold text-white shadow ring-2 ring-white`}>
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{d.name}</p>
                    <p className="truncate text-[11px] text-slate-500">{d.specialty}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${stats.testsOrdered > 0 ? "bg-violet-100 text-violet-800" : "bg-slate-100 text-slate-500"}`}>
                        {stats.testsOrdered} tests ordered
                      </span>
                      {stats.prescriptionsWithTests > 0 && (
                        <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                          {stats.prescriptionsWithTests} Rx
                        </span>
                      )}
                      {d.status !== "Active" && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                          {d.status}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Flat orders table — every doctor-ordered test, one row
              per test entry. Filtered by the selected doctor. */}
          <div className="border-t border-slate-100 bg-slate-50/30 px-5 py-3">
            <p className="text-sm font-bold text-slate-900">
              Recent lab tests ordered · {labOrderRows.length}
              {filterDoctorEmail ? " (filtered)" : ""}
            </p>
          </div>
          {labOrderRows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 text-2xl">
                🧪
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {filterDoctorEmail
                  ? "This doctor hasn't ordered any lab tests yet."
                  : "No lab tests ordered by any doctor yet."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Tests appear here automatically when a doctor adds investigations to a prescription.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-2">Ordered</th>
                    <th className="px-5 py-2">Patient</th>
                    <th className="px-5 py-2">Doctor</th>
                    <th className="px-5 py-2">Test</th>
                    <th className="px-5 py-2">Rx status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labOrderRows.slice(0, 100).map((r) => (
                    <tr key={r.key} className="transition hover:bg-violet-50/40">
                      <td className="px-5 py-2 text-slate-600 whitespace-nowrap">
                        {new Date(r.orderedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-2">
                        <div className="font-medium text-slate-900">{r.patientName}</div>
                        <div className="text-[11px] text-slate-500">{r.patientEmail}</div>
                      </td>
                      <td className="px-5 py-2 text-slate-600">{r.doctorEmail}</td>
                      <td className="px-5 py-2 font-medium text-violet-700">{r.testName}</td>
                      <td className="px-5 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.prescriptionStatus === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                          {r.prescriptionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {labOrderRows.length > 100 && (
                <p className="px-5 py-3 text-center text-xs text-slate-400">
                  Showing the most recent 100 of {labOrderRows.length}.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Lab Test" : "Add Lab Test"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Test Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Full Body Checkup"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Comprehensive health screening covering…"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Parameters</label>
              <input
                type="number"
                min={0}
                value={form.parameters}
                onChange={(e) => setForm({ ...form, parameters: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Turnaround</label>
              <input
                type="text"
                value={form.turnaround}
                onChange={(e) => setForm({ ...form, turnaround: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="24-48 hours"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Price (USD)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Original Price</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.originalPrice}
                onChange={(e) => setForm({ ...form, originalPrice: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.popular}
                onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mark as popular
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Active (visible on public /tests page)
            </label>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update" : "Save"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Parameters</th>
                <th className="px-4 py-3">Turnaround</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Popular</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t, i) => {
                const palettes = [
                  "from-violet-400 to-fuchsia-500",
                  "from-sky-400 to-blue-500",
                  "from-emerald-400 to-teal-500",
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-pink-500",
                  "from-indigo-400 to-violet-500",
                  "from-cyan-400 to-sky-500",
                  "from-yellow-400 to-amber-500",
                ];
                const grad = palettes[i % palettes.length];
                return (
                <tr key={t.id} className="border-b border-gray-50 transition hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-sm ring-2 ring-white`}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">{t.name}</p>
                        <p className="line-clamp-1 text-xs text-gray-400">{t.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                      {t.parameters}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.turnaround}</td>
                  <td className="px-4 py-3 text-gray-900">
                    <span className="font-semibold text-emerald-700">${t.price.toFixed(2)}</span>{" "}
                    <span className="text-xs text-gray-400 line-through">${t.originalPrice.toFixed(2)}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.popular ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        <svg className="h-3 w-3 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.447a1 1 0 00-1.175 0l-3.37 2.447c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" /></svg>
                        Popular
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(t)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 ${
                        t.active
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-600 ring-slate-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${t.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                      {t.active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEdit(t)}
                        className="rounded-lg bg-blue-50 p-1.5 text-blue-600 ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-lg bg-red-50 p-1.5 text-red-600 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100 hover:shadow"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );})}
            </tbody>
          </table>
        </div>
        {!loading && tests.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No lab tests yet.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
