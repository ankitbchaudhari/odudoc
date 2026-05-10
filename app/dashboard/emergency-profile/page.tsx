"use client";

// Emergency profile editor.
//
// Patient curates the limited record a hospital may read when they
// arrive unconscious: blood group, allergies, current Rx, chronic
// conditions, advance directive, primary doctor + phone, NOK,
// organ-donor flag. Biometric enrollments listed below — patient
// can deactivate any enrollment without losing the audit trail.

import { useCallback, useEffect, useState } from "react";

interface Profile {
  bloodGroup?: string; allergies?: string;
  currentMedications?: string; chronicConditions?: string;
  advanceDirective?: string;
  primaryDoctorName?: string; primaryDoctorPhone?: string;
  kinName?: string; kinRelation?: string; kinPhone?: string;
  organDonor?: boolean; notes?: string;
  updatedAt?: string;
}
interface Enrollment {
  id: string; kind: "fingerprint" | "face";
  enrolledAt: string; active: boolean; enrolledByOrgId: string;
}

export default function EmergencyProfilePage() {
  const [p, setP] = useState<Profile>({});
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/emergency-profile", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setP(d.profile || {});
      setEnrollments(d.biometrics || []);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch("/api/emergency-profile", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!r.ok) { setMsg({ kind: "err", text: "Save failed" }); return; }
      setMsg({ kind: "ok", text: "Saved." });
      load();
    } finally { setBusy(false); }
  };

  const deactivate = async (kind?: "fingerprint" | "face") => {
    if (!confirm("Deactivate this biometric? Hospitals can no longer use it for emergency lookup.")) return;
    await fetch(`/api/emergency-profile?target=biometric${kind ? `&kind=${kind}` : ""}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Emergency profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          What a hospital can read about you in an emergency. Curate this carefully — incomplete information delays care, oversharing exposes you needlessly.
        </p>
      </div>

      {msg && (
        <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Critical facts</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Blood group" value={p.bloodGroup} onChange={(v) => setP({ ...p, bloodGroup: v })} placeholder="A+, O−, Bombay…" />
          <Field label="Allergies" value={p.allergies} onChange={(v) => setP({ ...p, allergies: v })} placeholder="Penicillin, peanuts…" />
          <Field label="Current medications" value={p.currentMedications} onChange={(v) => setP({ ...p, currentMedications: v })} placeholder="Metformin 500mg BD, Atorvastatin 10mg HS" textarea />
          <Field label="Chronic conditions" value={p.chronicConditions} onChange={(v) => setP({ ...p, chronicConditions: v })} placeholder="Diabetes T2, Hypertension" textarea />
          <Field label="Advance directive" value={p.advanceDirective} onChange={(v) => setP({ ...p, advanceDirective: v })} placeholder="DNAR — no CPR. See hospital file." textarea />
          <CheckboxField label="Organ donor" checked={!!p.organDonor} onChange={(b) => setP({ ...p, organDonor: b })} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Care contacts</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Primary doctor name" value={p.primaryDoctorName} onChange={(v) => setP({ ...p, primaryDoctorName: v })} />
          <Field label="Primary doctor phone" value={p.primaryDoctorPhone} onChange={(v) => setP({ ...p, primaryDoctorPhone: v })} />
          <Field label="Next of kin name" value={p.kinName} onChange={(v) => setP({ ...p, kinName: v })} />
          <Field label="Relation" value={p.kinRelation} onChange={(v) => setP({ ...p, kinRelation: v })} placeholder="Spouse, Parent…" />
          <Field label="Next of kin phone" value={p.kinPhone} onChange={(v) => setP({ ...p, kinPhone: v })} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Notes</p>
        <Field label="" value={p.notes} onChange={(v) => setP({ ...p, notes: v })} placeholder="Anything else a hospital should know" textarea />
      </section>

      {/* Biometric enrollments */}
      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900">Biometric enrollments</p>
          {enrollments.some((e) => e.active) && (
            <button onClick={() => deactivate()} className="text-[11px] font-semibold text-rose-600 hover:underline">Deactivate all</button>
          )}
        </div>
        {enrollments.length === 0 ? (
          <p className="text-xs text-slate-500">
            No biometric enrollments yet. Hospitals can offer to enroll you at a kiosk during your next visit — your consent is required and only an opaque hash is stored, never the raw fingerprint or face data.
          </p>
        ) : (
          <ul className="space-y-2">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900">{e.kind === "fingerprint" ? "🔒 Fingerprint" : "👤 Face"}</span>
                  <span className="ml-2 text-slate-500">{new Date(e.enrolledAt).toLocaleDateString()}{!e.active && " · paused"}</span>
                </div>
                {e.active && (
                  <button onClick={() => deactivate(e.kind)} className="text-[10px] font-semibold text-rose-600">Deactivate</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="sticky bottom-0 mt-6 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-end gap-2">
          {p.updatedAt && <span className="mr-auto text-[10px] text-slate-400">Last updated {new Date(p.updatedAt).toLocaleString()}</span>}
          <button onClick={save} disabled={busy} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea }: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean }) {
  return (
    <label className={`text-xs font-semibold text-slate-700 ${textarea ? "sm:col-span-2" : ""}`}>
      {label}
      {textarea ? (
        <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
      ) : (
        <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
      )}
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-rose-600" />
      {label}
    </label>
  );
}
