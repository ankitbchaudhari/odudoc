"use client";

// Patient ABHA hub.
//
//   Top:    linking ceremony — mobile + optional ABHA address →
//           OTP from mock NHA → verified link
//   Middle: linked accounts list with revoke
//   Bottom: care contexts the patient's PHR can discover, with
//           per-row "Register with NHA" / "Withdraw" buttons.

import { useCallback, useEffect, useState } from "react";

interface AbhaLink {
  id: string; abhaNumber: string; abhaAddress: string;
  status: "unverified" | "linked" | "revoked" | "kyc_pending";
  kycSource?: string; linkedAt?: string; revokedAt?: string;
}
interface CareContext {
  id: string; abhaNumber: string; type: string; display: string;
  internalRef: string; recordDate: string;
  status: "draft" | "registered" | "linked" | "withdrawn";
  nhaContextId?: string;
  registeredAt?: string;
}

const STATUS_PILL: Record<string, string> = {
  unverified: "bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/40 text-amber-800 dark:text-amber-200",
  linked: "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-800 dark:text-emerald-200",
  revoked: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  kyc_pending: "bg-gradient-to-r from-sky-100 to-cyan-100 dark:from-sky-900/40 dark:to-cyan-900/40 text-sky-800 dark:text-sky-200",
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
  registered: "bg-gradient-to-r from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 text-emerald-800 dark:text-emerald-200",
  withdrawn: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
};

export default function AbhaPage() {
  const [links, setLinks] = useState<AbhaLink[]>([]);
  const [contexts, setContexts] = useState<CareContext[]>([]);
  const [showStart, setShowStart] = useState(false);
  const [phase, setPhase] = useState<"start" | "verify">("start");
  const [mobile, setMobile] = useState("");
  const [abhaAddress, setAbhaAddress] = useState("");
  const [txnId, setTxnId] = useState("");
  const [linkId, setLinkId] = useState("");
  const [otp, setOtp] = useState("");
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [r1, r2] = await Promise.all([
      fetch("/api/abdm/abha", { cache: "no-store" }),
      fetch("/api/abdm/contexts?scope=patient", { cache: "no-store" }),
    ]);
    if (r1.ok) setLinks((await r1.json()).links || []);
    if (r2.ok) setContexts((await r2.json()).contexts || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const reset = () => { setPhase("start"); setMobile(""); setAbhaAddress(""); setTxnId(""); setLinkId(""); setOtp(""); setMockOtp(null); };

  const startLink = async () => {
    if (!mobile.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/abdm/abha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", mobile, abhaAddress: abhaAddress || undefined }),
      });
      if (r.ok) {
        const d = await r.json();
        setTxnId(d.txnId);
        setLinkId(d.link.id);
        setMockOtp(d.mockOtp || null);
        setPhase("verify");
        await load();
      }
    } finally { setBusy(false); }
  };

  const verifyLink = async () => {
    if (!otp || !txnId || !linkId) return;
    setBusy(true);
    try {
      const r = await fetch("/api/abdm/abha", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", txnId, otp, linkId }),
      });
      if (r.ok) {
        setToast({ kind: "ok", text: "ABHA linked." });
        setShowStart(false);
        reset();
        await load();
      } else {
        const body = await r.json().catch(() => ({}));
        setToast({ kind: "err", text: `Verify failed: ${body.error || "unknown"}` });
      }
    } finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this ABHA link? Existing care contexts stay registered with NHA but no new ones will be pushed.")) return;
    const r = await fetch(`/api/abdm/abha?id=${id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Revoked." }); await load(); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
    <div className="mx-auto max-w-4xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${toast.kind === "ok" ? "ring-emerald-200 dark:ring-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200" : "ring-rose-200 dark:ring-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-start gap-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 text-2xl text-white shadow-lg shadow-orange-500/30">
            🇮🇳
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">ABHA / ABDM</h1>
            <p className="mt-1 text-slate-600 dark:text-slate-400">
              Link your Ayushman Bharat Health Account so your OduDoc records are discoverable by any PHR app on the ABDM network. You stay in control — every HIE share asks for your consent.
            </p>
          </div>
        </div>
        <button onClick={() => setShowStart(true)} className="shrink-0 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20">+ Link ABHA</button>
      </div>

      {/* Linked accounts */}
      <section className="mb-6 rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-5 shadow-sm">
        <p className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">Linked accounts ({links.length})</p>
        {links.length === 0 ? (
          <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 ring-1 ring-yellow-100 dark:ring-yellow-900/30 p-6 text-center">
            <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 grid place-items-center text-3xl">🔗</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">No ABHA linked yet. Press &ldquo;+ Link ABHA&rdquo; — we&apos;ll send a one-time code to your mobile.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 p-3">
                <div>
                  <p className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">{l.abhaNumber}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{l.abhaAddress}{l.kycSource ? ` · KYC: ${l.kycSource}` : ""}</p>
                  {l.linkedAt && <p className="text-[10px] text-slate-400 dark:text-slate-500">Linked {new Date(l.linkedAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[l.status]}`}>{l.status.replace("_", " ")}</span>
                  {l.status === "linked" && <button onClick={() => revoke(l.id)} className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:underline">Revoke</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Care contexts */}
      <section className="rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Discoverable records ({contexts.length})</p>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Care contexts other PHR apps can request via consent</span>
        </div>
        {contexts.length === 0 ? (
          <div className="rounded-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 ring-1 ring-yellow-100 dark:ring-yellow-900/30 p-6 text-center">
            <div className="mx-auto mb-3 h-20 w-20 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 grid place-items-center text-3xl">📄</div>
            <p className="text-sm text-slate-600 dark:text-slate-400">No care contexts yet. Once you have an encounter / Rx / lab report at any OduDoc-connected hospital, it appears here as a discoverable record.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {contexts.map((c) => (
              <li key={c.id} className="rounded-xl ring-1 ring-slate-200 dark:ring-slate-800 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{c.display}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{c.type} · {new Date(c.recordDate).toLocaleDateString()}{c.nhaContextId ? ` · NHA ${c.nhaContextId.slice(0, 14)}…` : ""}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PILL[c.status]}`}>{c.status}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Linking dialog */}
      {showStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setShowStart(false); reset(); }}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-800 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 text-xl text-white shadow-md shadow-orange-500/30">🇮🇳</div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Link your ABHA</h3>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Mock NHA mode is on for the demo — the OTP will appear on screen. In production this routes to the real NHA gateway.
            </p>
            {phase === "start" ? (
              <div className="mt-4 space-y-3">
                <input className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="Mobile number" value={mobile} onChange={(e) => setMobile(e.target.value)} />
                <input className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="ABHA address (optional)" value={abhaAddress} onChange={(e) => setAbhaAddress(e.target.value)} />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">e.g. ankit.chaudhari@abdm — leave blank to auto-generate.</p>
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setShowStart(false); reset(); }} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
                  <button onClick={startLink} disabled={busy || !mobile.trim()} className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">{busy ? "Sending…" : "Send OTP"}</button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {mockOtp && (
                  <div className="rounded-xl ring-1 ring-amber-300 dark:ring-amber-900/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
                    Mock NHA OTP: <strong className="font-mono text-base">{mockOtp}</strong>
                  </div>
                )}
                <input className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-slate-100 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="••••••" value={otp} onChange={(e) => setOtp(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setPhase("start")} className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Back</button>
                  <button onClick={verifyLink} disabled={busy || !otp.trim()} className="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50">{busy ? "Verifying…" : "Verify"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
