"use client";

// Patient consent-grant page.
//
// Reached via deep-link from a clinic scanner: /dashboard/health-passport/grant?token=...&org=...
// The token confirms the patient identity. The org is the clinic the
// patient is being asked to grant access to. Patient picks scopes +
// duration → POSTs to /api/passport/consents → done.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface OrgPreview { id: string; name: string; country?: string }

const SCOPE_OPTS: Array<{ id: string; label: string; default: boolean; locked?: boolean; help: string }> = [
  { id: "allergies", label: "Allergies", default: true, locked: true, help: "Always shared so the clinic can run drug-safety checks." },
  { id: "current_meds", label: "Current medications", default: true, help: "What you're already taking — for interaction screening." },
  { id: "diagnoses", label: "Recent diagnoses", default: false, help: "Last few diagnoses with ICD-10 codes." },
  { id: "prescriptions", label: "Recent prescriptions", default: false, help: "Last few Rx items, doses, and dates." },
  { id: "vaccinations", label: "Vaccinations", default: false, help: "Immunisation record." },
  { id: "vitals", label: "Recent vitals", default: false, help: "Last BP, HR, weight readings." },
];
const TTL_OPTS: Array<{ label: string; hours: number | null }> = [
  { label: "1 hour", hours: 1 },
  { label: "24 hours (this visit)", hours: 24 },
  { label: "7 days", hours: 24 * 7 },
  { label: "30 days", hours: 24 * 30 },
  { label: "Until I revoke", hours: null },
];

function GrantInner() {
  const router = useRouter();
  const search = useSearchParams();
  const orgId = search.get("org");
  const token = search.get("token");

  const [org, setOrg] = useState<OrgPreview | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [scopes, setScopes] = useState<Set<string>>(new Set(SCOPE_OPTS.filter((s) => s.default).map((s) => s.id)));
  const [ttlHours, setTtlHours] = useState<number | null>(24);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgId) { setLoadingOrg(false); return; }
    // Lightweight org lookup — list org shapes via the network
    // directory endpoint which is open to authenticated users.
    fetch("/api/inter-org/network", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) { setLoadingOrg(false); return; }
      const data = await r.json();
      const all: OrgPreview[] = [
        ...(data.connections || []).map((c: { partner: OrgPreview }) => c.partner),
        ...(data.directory || []),
      ];
      setOrg(all.find((o) => o.id === orgId) || { id: orgId, name: "Requesting clinic" });
      setLoadingOrg(false);
    });
  }, [orgId]);

  const toggle = (id: string) => {
    const opt = SCOPE_OPTS.find((o) => o.id === id);
    if (opt?.locked) return;
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const save = async () => {
    if (!orgId) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/passport/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantedToOrgId: orgId,
          scopes: Array.from(scopes),
          ttlHours: ttlHours || undefined,
          note: note || undefined,
        }),
      });
      if (r.ok) {
        setDone(true);
      } else {
        const body = await r.json().catch(() => ({}));
        setError(body.error || `Failed (${r.status})`);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!orgId || !token) {
    return <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">Invalid consent link. Ask the clinic to scan again.</p>;
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-3xl">✓</p>
        <p className="mt-2 text-lg font-bold text-emerald-900">Consent granted</p>
        <p className="mt-1 text-sm text-emerald-800">
          {org?.name || "The clinic"} can now scan your passport again to read the sections you selected.
          {ttlHours ? ` Access expires in ${ttlHours < 24 ? `${ttlHours}h` : `${Math.round(ttlHours / 24)}d`}.` : " Access stays until you revoke it."}
        </p>
        <button onClick={() => router.push("/dashboard/health-passport")} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
          Back to Health Passport
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">A clinic is requesting access</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{loadingOrg ? "…" : org?.name || "Requesting clinic"}</p>
        {org?.country && <p className="text-sm text-slate-600 dark:text-slate-300">{org.country}</p>}
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          They want to read your health passport. You choose what to share and for how long.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">What to share</p>
        <ul className="space-y-2">
          {SCOPE_OPTS.map((s) => {
            const on = scopes.has(s.id);
            return (
              <li key={s.id} className={`flex items-start gap-3 rounded-lg border p-3 ${s.locked ? "border-emerald-200 bg-emerald-50" : on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"}`}>
                <input type="checkbox" checked={on} disabled={s.locked} onChange={() => toggle(s.id)} className="mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {s.label}{s.locked && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Always</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.help}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 mb-2 text-sm font-bold text-slate-900 dark:text-slate-100">For how long</p>
        <div className="flex flex-wrap gap-2">
          {TTL_OPTS.map((o) => (
            <button
              key={o.label}
              onClick={() => setTtlHours(o.hours)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${ttlHours === o.hours ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"}`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <p className="mt-5 mb-1 text-sm font-bold text-slate-900 dark:text-slate-100">Note (optional)</p>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder='e.g. "Annual checkup"'
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />

        {error && <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => router.push("/dashboard/health-passport")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Granting…" : "Grant access"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GrantPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Grant access to your Health Passport</h1>
      <Suspense fallback={<p className="text-sm text-slate-500 dark:text-slate-400">Loading…</p>}>
        <GrantInner />
      </Suspense>
    </div>
  );
}
