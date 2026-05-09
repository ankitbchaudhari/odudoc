"use client";

// Privacy & Consent Vault.
//
// Single screen showing every consent the user has issued across the
// platform, plus right-to-export and right-to-erasure buttons. This
// is the DPDP §11/§12/§13 surface — what regulators expect a Data
// Fiduciary to provide; very few Indian healthtechs ship it.

import { useCallback, useEffect, useState } from "react";

type ConsentStatus = "granted" | "revoked" | "expired";
type ConsentPurpose =
  | "passport_share" | "inter_org_transfer" | "marketing_email"
  | "marketing_whatsapp" | "research" | "abdm_phr_push"
  | "doctor_review" | "ai_training" | "family_view"
  | "telemedicine_recording" | "insurance_claim";

interface VaultConsent {
  id: string; userId: string; dependentId?: string;
  purpose: ConsentPurpose; purposeStatement: string;
  recipientKind: string; recipientId: string; recipientName: string;
  dataCategories: string[];
  expiresAt: string | null; status: ConsentStatus;
  grantedAt: string; revokedAt?: string;
  signature: string;
  receiptDownloadedAt?: string;
}

type ErasureStatus = "pending_review" | "cooling_off" | "approved" | "completed" | "rejected" | "cancelled";
interface ErasureRequest {
  id: string; userId: string; filedAt: string; reason?: string;
  retainDependents: boolean; scopeCategories: string[];
  status: ErasureStatus;
  coolingOffEndsAt?: string; reviewedBy?: string; reviewedAt?: string;
  reviewNote?: string; completedAt?: string; cancelledAt?: string;
}

const PURPOSE_LABEL: Record<ConsentPurpose, { title: string; emoji: string; tone: string }> = {
  passport_share: { title: "Health Passport scan", emoji: "🪪", tone: "emerald" },
  inter_org_transfer: { title: "Hospital records transfer", emoji: "↔️", tone: "indigo" },
  marketing_email: { title: "Email marketing", emoji: "📧", tone: "sky" },
  marketing_whatsapp: { title: "WhatsApp marketing", emoji: "💬", tone: "lime" },
  research: { title: "Anonymised research", emoji: "🔬", tone: "violet" },
  abdm_phr_push: { title: "ABDM PHR push", emoji: "🇮🇳", tone: "amber" },
  doctor_review: { title: "Public doctor review", emoji: "⭐", tone: "yellow" },
  ai_training: { title: "AI model training (de-identified)", emoji: "🤖", tone: "fuchsia" },
  family_view: { title: "Family member view-access", emoji: "👨‍👩‍👧", tone: "pink" },
  telemedicine_recording: { title: "Visit audio recording", emoji: "🎙", tone: "rose" },
  insurance_claim: { title: "Insurance claim share", emoji: "🛡️", tone: "slate" },
};

const TONE_CLASSES: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50",
  indigo: "border-indigo-200 bg-indigo-50",
  sky: "border-sky-200 bg-sky-50",
  lime: "border-lime-200 bg-lime-50",
  violet: "border-violet-200 bg-violet-50",
  amber: "border-amber-200 bg-amber-50",
  yellow: "border-yellow-200 bg-yellow-50",
  fuchsia: "border-fuchsia-200 bg-fuchsia-50",
  pink: "border-pink-200 bg-pink-50",
  rose: "border-rose-200 bg-rose-50",
  slate: "border-slate-200 bg-slate-50",
};

function timeUntil(iso: string | null): string {
  if (!iso) return "until revoked";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms < 0) return "expired";
  const h = Math.floor(ms / 3600000);
  if (h < 1) return `${Math.floor(ms / 60000)}m`;
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function PrivacyPage() {
  const [consents, setConsents] = useState<VaultConsent[]>([]);
  const [erasures, setErasures] = useState<ErasureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showErasure, setShowErasure] = useState(false);
  const [erasureForm, setErasureForm] = useState({ reason: "", retainDependents: false });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/privacy/consents", { cache: "no-store" }),
        fetch("/api/privacy/erasure", { cache: "no-store" }),
      ]);
      if (r1.ok) setConsents((await r1.json()).consents || []);
      if (r2.ok) setErasures((await r2.json()).requests || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const revoke = async (c: VaultConsent) => {
    const reason = window.prompt(`Revoke "${c.purposeStatement.slice(0, 60)}…"?\n\nOptional: tell us why (helps us improve consent prompts).`, "");
    if (reason === null) return;
    const r = await fetch(`/api/privacy/consents/${c.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (r.ok) { setToast({ kind: "ok", text: "Consent revoked." }); await load(); }
    else { setToast({ kind: "err", text: "Revoke failed." }); }
  };

  const downloadReceipt = async (c: VaultConsent) => {
    window.open(`/api/privacy/consents/${c.id}/receipt`, "_blank");
  };

  const exportData = () => { window.open("/api/privacy/export", "_blank"); };

  const fileErasure = async () => {
    const r = await fetch("/api/privacy/erasure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: erasureForm.reason || undefined,
        retainDependents: erasureForm.retainDependents,
      }),
    });
    if (r.ok) {
      setToast({ kind: "ok", text: "Erasure request filed. You have 14 days to cancel before processing begins." });
      setShowErasure(false);
      setErasureForm({ reason: "", retainDependents: false });
      await load();
    } else {
      setToast({ kind: "err", text: "File failed." });
    }
  };

  const cancelErasure = async (e: ErasureRequest) => {
    if (!confirm("Cancel this erasure request? Your data stays.")) return;
    const r = await fetch(`/api/privacy/erasure/${e.id}`, { method: "DELETE" });
    if (r.ok) { setToast({ kind: "ok", text: "Erasure cancelled." }); await load(); }
    else { setToast({ kind: "err", text: "Cancel failed." }); }
  };

  // Group consents by purpose for the section view.
  const grouped = new Map<ConsentPurpose, VaultConsent[]>();
  for (const c of consents) {
    if (!grouped.has(c.purpose)) grouped.set(c.purpose, []);
    grouped.get(c.purpose)!.push(c);
  }
  const activeCount = consents.filter((c) => c.status === "granted").length;
  const openErasure = erasures.find((e) => ["pending_review", "cooling_off", "approved"].includes(e.status));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {toast && (
        <div className={`mb-4 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${toast.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Privacy & Consent</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every consent you&apos;ve issued, in one place. Revoke any time, download signed receipts as legal proof, export your data, or file a deletion request — your rights under the DPDP Act 2023.
        </p>
      </div>

      {openErasure && (
        <div className="mb-6 rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-rose-700">Erasure request in progress</p>
          <p className="mt-1 text-slate-800">
            You filed an erasure request on <strong>{new Date(openErasure.filedAt).toLocaleDateString()}</strong>.
            {openErasure.coolingOffEndsAt && (
              <> Cooling-off ends <strong>{new Date(openErasure.coolingOffEndsAt).toLocaleDateString()}</strong>; you can cancel until then.</>
            )}
          </p>
          {openErasure.reason && <p className="mt-1 text-xs text-rose-700 italic">&ldquo;{openErasure.reason}&rdquo;</p>}
          <button onClick={() => cancelErasure(openErasure)} className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-700 ring-1 ring-rose-300 hover:bg-rose-100">
            Cancel erasure request
          </button>
        </div>
      )}

      {/* Quick stats + actions */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">Active consents</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-600">{activeCount}</p>
          <p className="text-xs text-slate-400">{consents.length - activeCount} revoked or expired</p>
        </div>
        <button onClick={exportData} className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left transition hover:bg-indigo-100">
          <p className="text-[11px] uppercase tracking-wider text-indigo-700">Right to data portability</p>
          <p className="mt-1 text-sm font-bold text-indigo-900">Download all my data (JSON)</p>
          <p className="text-xs text-indigo-700">A complete export, signed receipts included.</p>
        </button>
        <button onClick={() => setShowErasure(true)} disabled={!!openErasure} className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-left transition hover:bg-rose-100 disabled:opacity-60">
          <p className="text-[11px] uppercase tracking-wider text-rose-700">Right to erasure</p>
          <p className="mt-1 text-sm font-bold text-rose-900">Delete my account & data</p>
          <p className="text-xs text-rose-700">14-day cooling-off; you can cancel any time.</p>
        </button>
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
      ) : consents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <p className="text-3xl">📋</p>
          <p className="mt-2 text-lg font-bold text-slate-700">No consents on file</p>
          <p className="mt-1 text-sm text-slate-500">When you grant a clinic access, opt in to marketing, or join research, the consent appears here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([purpose, list]) => {
            const meta = PURPOSE_LABEL[purpose];
            return (
              <section key={purpose} className={`rounded-2xl border p-4 ${TONE_CLASSES[meta.tone]}`}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xl">{meta.emoji}</span>
                  <p className="text-sm font-bold text-slate-900">{meta.title}</p>
                  <span className="ml-auto text-[11px] font-semibold text-slate-500">{list.length} consent{list.length === 1 ? "" : "s"}</span>
                </div>
                <ul className="space-y-2">
                  {list.map((c) => {
                    const expired = c.status === "expired" || (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now());
                    const inactive = c.status === "revoked" || expired;
                    return (
                      <li key={c.id} className={`rounded-lg border bg-white p-3 ${inactive ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-slate-900">{c.recipientName}</p>
                            <p className="mt-0.5 text-xs text-slate-700">{c.purposeStatement}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                              {c.dataCategories.slice(0, 6).map((d) => (
                                <span key={d} className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">{d}</span>
                              ))}
                              <span className="text-slate-500">·</span>
                              <span className={`font-bold ${c.status === "granted" ? "text-emerald-700" : c.status === "revoked" ? "text-rose-700" : "text-slate-500"}`}>
                                {c.status} · {timeUntil(c.expiresAt)}
                              </span>
                              <span className="text-slate-400">· granted {new Date(c.grantedAt).toLocaleDateString()}</span>
                              {c.dependentId && <span className="rounded-full bg-pink-100 px-2 py-0.5 font-bold uppercase text-pink-700">dependent</span>}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => downloadReceipt(c)} className="rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                              📄 Receipt
                            </button>
                            {c.status === "granted" && (
                              <button onClick={() => revoke(c)} className="rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-600 shadow-sm">
        <p className="text-sm font-bold text-slate-900">Your rights as a Data Principal</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Access</strong> — see every consent you&apos;ve issued (this page).</li>
          <li><strong>Correction</strong> — edit profile / dependents / allergies / meds inline anywhere they appear.</li>
          <li><strong>Portability</strong> — download a complete JSON export with signed receipts.</li>
          <li><strong>Erasure</strong> — file a deletion request; 14-day cooling-off before processing.</li>
          <li><strong>Grievance</strong> — email <a href="mailto:grievance@odudoc.com" className="text-indigo-600 underline">grievance@odudoc.com</a>; we respond within 7 days.</li>
        </ul>
      </div>

      {/* Erasure dialog */}
      {showErasure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowErasure(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">File erasure request</h3>
            <p className="mt-1 text-xs text-slate-500">
              Under DPDP §13(2)(b) you have the right to ask us to delete your data. Filing this starts a 14-day cooling-off window — you can cancel any time. After that, a super-admin reviews for legal-hold conflicts (active billing disputes, etc.) and your data is purged.
            </p>
            <p className="mt-3 mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Reason (optional)</p>
            <textarea
              rows={3}
              value={erasureForm.reason}
              onChange={(e) => setErasureForm({ ...erasureForm, reason: e.target.value })}
              placeholder="Helps us understand and improve. Not required."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={erasureForm.retainDependents} onChange={(e) => setErasureForm({ ...erasureForm, retainDependents: e.target.checked })} className="mt-0.5" />
              <span>Keep my family members&apos; profiles. Useful when leaving an account but wanting kids&apos; / parents&apos; records to stay accessible to a co-parent who&apos;ll re-create the family link.</span>
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowErasure(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={fileErasure} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700">File erasure request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
