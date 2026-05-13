"use client";

// Family Account console.
//
// Owner manages their dependents (kids, parents, spouse). Each card
// shows the dependent's medical-id, age, allergies, current meds, and
// has Edit / Switch-active / Remove actions.

import { useCallback, useEffect, useState } from "react";

type Relationship = "child" | "spouse" | "parent" | "sibling" | "grandparent" | "grandchild" | "in_law" | "ward" | "other";
type Sex = "male" | "female" | "other";

interface Dependent {
  id: string; ownerUserId: string; name: string;
  dateOfBirth?: string; sex?: Sex; relationship: Relationship;
  phone?: string; photoUrl?: string; medicalId: string;
  allergies?: string[]; currentMeds?: string[]; weightKg?: number;
  notes?: string; createdAt: string; updatedAt: string;
}

interface ActiveProfile { kind: "self" | "dependent"; dependentId?: string; dependentName?: string; medicalId?: string }

const REL_LABEL: Record<Relationship, string> = {
  child: "Child", spouse: "Spouse", parent: "Parent", sibling: "Sibling",
  grandparent: "Grandparent", grandchild: "Grandchild", in_law: "In-law",
  ward: "Ward / Guardian", other: "Other",
};

const RELATIONSHIPS: Relationship[] = ["child", "spouse", "parent", "sibling", "grandparent", "grandchild", "in_law", "ward", "other"];

const REL_GRADIENT: Record<Relationship, string> = {
  child: "from-pink-400 to-rose-500",
  spouse: "from-rose-400 to-fuchsia-500",
  parent: "from-amber-400 to-orange-500",
  sibling: "from-sky-400 to-blue-500",
  grandparent: "from-emerald-400 to-teal-500",
  grandchild: "from-violet-400 to-purple-500",
  in_law: "from-slate-400 to-slate-500",
  ward: "from-indigo-400 to-blue-500",
  other: "from-slate-400 to-slate-500",
};

function ageYears(dob?: string): number | null {
  if (!dob) return null;
  const t = new Date(dob).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function FamilyPage() {
  const [list, setList] = useState<Dependent[]>([]);
  const [active, setActive] = useState<ActiveProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState<{
    name: string; relationship: Relationship; dateOfBirth: string; sex: Sex;
    phone: string; weightKg: string; allergies: string; currentMeds: string; notes: string;
  }>({
    name: "", relationship: "child", dateOfBirth: "", sex: "male",
    phone: "", weightKg: "", allergies: "", currentMeds: "", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([
        fetch("/api/family", { cache: "no-store" }),
        fetch("/api/family/active", { cache: "no-store" }),
      ]);
      if (r.ok) setList((await r.json()).dependents || []);
      if (a.ok) setActive((await a.json()).active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setForm({ name: "", relationship: "child", dateOfBirth: "", sex: "male", phone: "", weightKg: "", allergies: "", currentMeds: "", notes: "" });
    setEditing(null);
  };
  const open = (d?: Dependent) => {
    if (d) {
      setEditing(d);
      setForm({
        name: d.name,
        relationship: d.relationship,
        dateOfBirth: d.dateOfBirth?.slice(0, 10) || "",
        sex: d.sex || "male",
        phone: d.phone || "",
        weightKg: d.weightKg ? String(d.weightKg) : "",
        allergies: (d.allergies || []).join("\n"),
        currentMeds: (d.currentMeds || []).join("\n"),
        notes: d.notes || "",
      });
    } else { reset(); }
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setToast({ kind: "err", text: "Name is required." }); return; }
    const payload = {
      name: form.name.trim(),
      relationship: form.relationship,
      dateOfBirth: form.dateOfBirth || undefined,
      sex: form.sex,
      phone: form.phone || undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      allergies: form.allergies.split("\n").map((s) => s.trim()).filter(Boolean),
      currentMeds: form.currentMeds.split("\n").map((s) => s.trim()).filter(Boolean),
      notes: form.notes || undefined,
    };
    const r = editing
      ? await fetch(`/api/family/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/family", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (r.ok) {
      setToast({ kind: "ok", text: editing ? "Dependent updated." : "Dependent added." });
      setShowForm(false);
      reset();
      await load();
    } else {
      const body = await r.json().catch(() => ({}));
      setToast({ kind: "err", text: `Failed: ${body.error || r.statusText}` });
    }
  };

  const remove = async (d: Dependent) => {
    if (!confirm(`Remove ${d.name} from your family?\n\nThis hides their profile from your account. Bookings and records they made stay accessible to the clinics that hold them.`)) return;
    const r = await fetch(`/api/family/${d.id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: `${d.name} removed.` }); await load(); }
    else { setToast({ kind: "err", text: "Remove failed." }); }
  };

  const switchTo = async (depId: string | null) => {
    const r = await fetch("/api/family/active", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependentId: depId }),
    });
    if (r.ok) {
      const data = await r.json();
      setActive(data.active);
      const name = depId ? list.find((x) => x.id === depId)?.name : "yourself";
      setToast({ kind: "ok", text: `Now booking for ${name}.` });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <div className="mx-auto max-w-5xl px-4 py-8">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 text-white p-3 rounded-2xl shadow-lg shadow-pink-500/30 text-2xl">👨‍👩‍👧‍👦</div>
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-pink-600 to-rose-600 dark:from-pink-300 dark:to-rose-300 bg-clip-text text-transparent">Family</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              One account, every member of your family. Add kids, parents, or a spouse — book consults and store records for each, all from your phone.
            </p>
          </div>
        </div>
        <button onClick={() => open()} className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/20 rounded-xl px-5 py-2.5 text-sm font-bold transition">
          + Add family member
        </button>
      </div>

      {/* Self card pinned at top */}
      <div className={`mb-4 rounded-2xl p-1 shadow-md ${active?.kind === "self" ? "bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 shadow-pink-500/30" : "bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700"}`}>
        <div className="flex items-center justify-between rounded-[0.95rem] bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-600 font-extrabold text-white shadow-lg shadow-pink-500/30">You</div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-extrabold text-slate-900 dark:text-slate-100">Yourself</p>
                <span className="rounded-full bg-gradient-to-r from-pink-600 to-rose-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white shadow-sm">Primary</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Primary account — bookings & records default here when no one else is selected.</p>
            </div>
          </div>
          {active?.kind === "self" ? (
            <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">✓ Active</span>
          ) : (
            <button onClick={() => switchTo(null)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition">Switch to self</button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-10 text-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-950/40 dark:to-rose-950/40 flex items-center justify-center text-4xl">👨‍👩‍👧‍👦</div>
          <p className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">No family members added yet</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add your kids, spouse, or parents to manage their healthcare from one account.</p>
          <button onClick={() => open()} className="mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/20 rounded-xl px-5 py-2.5 text-sm font-bold transition">+ Add first member</button>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((d) => {
            const isActive = active?.kind === "dependent" && active.dependentId === d.id;
            const age = ageYears(d.dateOfBirth);
            const initials = d.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
            return (
              <li key={d.id} className={`rounded-2xl p-4 shadow-sm hover:shadow-md transition ring-1 ${isActive ? "ring-emerald-300 dark:ring-emerald-700 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-900" : "ring-slate-200 dark:ring-slate-800 bg-white dark:bg-slate-900"}`}>
                <div className="flex items-start gap-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${REL_GRADIENT[d.relationship]} text-lg font-extrabold text-white shadow-lg`}>
                    {initials}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{d.name}</p>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300">{REL_LABEL[d.relationship]}</span>
                      {age !== null && <span className="text-xs text-slate-500 dark:text-slate-400">{age} yrs</span>}
                      {d.sex && <span className="text-xs text-slate-400">· {d.sex}</span>}
                      {isActive && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">✓ Active</span>}
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">Medical ID: {d.medicalId.match(/.{1,4}/g)?.join("-")}</p>
                    {(d.allergies?.length || d.currentMeds?.length) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {d.allergies?.map((a, i) => <span key={`a${i}`} className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">⚠ {a}</span>)}
                        {d.currentMeds?.map((m, i) => <span key={`m${i}`} className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">💊 {m}</span>)}
                      </div>
                    )}
                    {d.notes && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 italic">&ldquo;{d.notes}&rdquo;</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {!isActive && (
                      <button onClick={() => switchTo(d.id)} className="rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/20 transition">Book for {d.name.split(" ")[0]}</button>
                    )}
                    <button onClick={() => open(d)} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-800 transition">Edit</button>
                    <button onClick={() => remove(d)} className="rounded-lg border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">Remove</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Form dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => { setShowForm(false); reset(); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-pink-200 dark:ring-pink-900/40" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editing ? `Edit ${editing.name}` : "Add a family member"}</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Their healthcare profile will be managed from your account. You can switch back at any time.</p>
            <div className="mt-4 space-y-3">
              <Row>
                <F label="Full name"><input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aarav Sharma" /></F>
                <F label="Relationship">
                  <select className="form-input" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value as Relationship })}>
                    {RELATIONSHIPS.map((r) => <option key={r} value={r}>{REL_LABEL[r]}</option>)}
                  </select>
                </F>
              </Row>
              <Row>
                <F label="Date of birth"><input type="date" className="form-input" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></F>
                <F label="Sex">
                  <select className="form-input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                </F>
                <F label="Weight (kg)"><input className="form-input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} placeholder="optional" /></F>
              </Row>
              <F label="Phone (optional — defaults to yours)"><input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
              <F label="Allergies (one per line)"><textarea rows={2} className="form-input font-mono text-xs" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="penicillin&#10;peanuts" /></F>
              <F label="Current medications (one per line)"><textarea rows={2} className="form-input font-mono text-xs" value={form.currentMeds} onChange={(e) => setForm({ ...form, currentMeds: e.target.value })} placeholder="amlodipine 5mg&#10;metformin 500mg" /></F>
              <F label="Notes"><textarea rows={2} className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. anaphylactic reaction to peanuts" /></F>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); reset(); }} className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">Cancel</button>
              <button onClick={save} className="bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white shadow-lg shadow-pink-500/20 rounded-xl px-5 py-2 text-sm font-bold transition">{editing ? "Save changes" : "Add to family"}</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :global(.form-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          background: #fff;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #0f172a;
        }
        :global(.form-input:focus) {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99,102,241,0.2);
        }
      `}</style>
    </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}
