"use client";

// Health Passport — patient-side QR + consent vault.
//
// Top: the QR for the active profile. Show it at the front desk and
// the clinic scans it.
// Bottom: every consent grant the patient has issued, with one-click
// revoke.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface PassportProfile {
  name: string; medicalId: string; formattedMedicalId: string; isDependent: boolean;
}
interface QrResp { token: string; qrUrl: string; profile: PassportProfile }

interface ConsentRow {
  id: string; ownerUserId: string; dependentId?: string;
  grantedToOrgId: string; scopes: string[];
  expiresAt: string | null; createdAt: string; revokedAt?: string;
  note?: string; scanCount: number; lastScanAt?: string;
  orgName: string; orgCountry?: string; isExpired: boolean;
}

const SCOPE_LABEL: Record<string, string> = {
  allergies: "Allergies",
  current_meds: "Current meds",
  diagnoses: "Diagnoses",
  prescriptions: "Prescriptions",
  vaccinations: "Vaccinations",
  vitals: "Vitals",
};

function timeUntil(iso: string | null): string {
  if (!iso) return "until revoked";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "expired";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)} min`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function HealthPassportPage() {
  const [qr, setQr] = useState<QrResp | null>(null);
  const [consents, setConsents] = useState<ConsentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/passport/qr", { cache: "no-store" }),
        fetch("/api/passport/consents", { cache: "no-store" }),
      ]);
      if (r1.ok) setQr(await r1.json()); else setQr(null);
      if (r2.ok) setConsents((await r2.json()).consents || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (c: ConsentRow) => {
    if (!confirm(`Revoke ${c.orgName}'s access to ${c.dependentId ? "this dependent's" : "your"} health passport?\n\nFuture scans by this clinic will be denied. Past scans stay in the audit log.`)) return;
    const r = await fetch(`/api/passport/consents/${c.id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Access revoked." }); await load(); }
    else { setToast({ kind: "err", text: "Revoke failed." }); }
  };

  const active = consents.filter((c) => !c.revokedAt && !c.isExpired);
  const inactive = consents.filter((c) => c.revokedAt || c.isExpired);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Health Passport</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          One QR — every clinic on OduDoc can scan it to read your allergies, current meds, and recent records, but only after you grant consent. You stay in control of who sees what.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* QR */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm text-center">
          {loading || !qr ? (
            <div className="flex h-[300px] w-[300px] items-center justify-center text-sm text-slate-400">{loading ? "Loading…" : "No medical ID yet."}</div>
          ) : (
            <>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Health Passport for</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{qr.profile.name}</p>
              {qr.profile.isDependent && <span className="inline-block rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-pink-700">Dependent profile</span>}
              <div className="my-4 inline-block rounded-xl bg-white dark:bg-slate-900 p-3 ring-2 ring-indigo-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr.qrUrl} alt="Health Passport QR" width={300} height={300} className="block" />
              </div>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{qr.profile.formattedMedicalId}</p>
              <p className="mt-3 max-w-[300px] text-xs text-slate-500 dark:text-slate-400">
                Show this QR at any partner clinic. The scanner will identify you and request your consent before reading your records.
              </p>
            </>
          )}
        </div>

        {/* Consent vault */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Consent vault</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Every clinic you&apos;ve granted access to. Revoke any time — the change takes effect on the next scan.
            </p>

            {active.length === 0 && (
              <p className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
                No active grants. When a clinic scans your QR for the first time, you&apos;ll be prompted to choose what to share and for how long.
              </p>
            )}

            {active.length > 0 && (
              <ul className="mt-4 space-y-2">
                {active.map((c) => (
                  <li key={c.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{c.orgName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {c.orgCountry ? `${c.orgCountry} · ` : ""}
                          {c.dependentId ? "Dependent profile · " : ""}
                          Expires in {timeUntil(c.expiresAt)} · {c.scanCount} scan{c.scanCount === 1 ? "" : "s"}
                          {c.lastScanAt ? ` · last ${new Date(c.lastScanAt).toLocaleDateString()}` : ""}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {c.scopes.map((s) => (
                            <span key={s} className="rounded-full bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                              {SCOPE_LABEL[s] || s}
                            </span>
                          ))}
                        </div>
                        {c.note && <p className="mt-1 text-[11px] italic text-slate-500 dark:text-slate-400">&ldquo;{c.note}&rdquo;</p>}
                      </div>
                      <button onClick={() => revoke(c)} className="rounded-md border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50">
                        Revoke
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {inactive.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Past grants ({inactive.length})</p>
              <ul className="mt-3 space-y-1">
                {inactive.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs">
                    <span className="text-slate-700 dark:text-slate-300">
                      <strong>{c.orgName}</strong> · {c.revokedAt ? `revoked ${new Date(c.revokedAt).toLocaleDateString()}` : "expired"} · {c.scanCount} scan{c.scanCount === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
            <p className="font-semibold">Privacy guarantee</p>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Allergies are always shared on a successful scan so the clinic can run drug-safety checks safely.</li>
              <li>Other sections (current meds, diagnoses, prescriptions) only appear when you grant them in the consent dialog.</li>
              <li>Every scan is audit-logged. You can see <Link href="/dashboard/health-passport" className="underline">scan counts above</Link>.</li>
              <li>Revoke any time. Past scans stay in the audit log; future scans return &ldquo;consent revoked&rdquo;.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
