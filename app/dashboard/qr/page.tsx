"use client";

// V16 — My QR codes (patient view).
//
// Lists the patient's QRs grouped by kind. Each row shows:
//   - the QR image (rendered client-side from the token)
//   - the kind + label + validity window
//   - revoke button (active QRs)
//   - generate-new for consent QRs

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";

type QrKind = "appointment" | "emergency" | "identity" | "consent" | "wristband";

interface QrToken {
  token: string;
  kind: QrKind;
  patientId: string;
  contextKind?: string;
  contextId?: string;
  scope: { fields: string[]; scannerRoles: string[]; scannerDoctorId?: string; dataFromDate?: string; dataToDate?: string };
  usage: "single" | "multi";
  scanCount: number;
  firstScannedAt?: string;
  firstScannedBy?: string;
  status: "active" | "revoked" | "consumed" | "expired";
  validFromAt: string;
  validUntilAt: string;
  createdAt: string;
  label?: string;
}

const KIND_META: Record<QrKind, { label: string; emoji: string; tone: string; description: string }> = {
  identity: {
    label: "Identity card",
    emoji: "🪪",
    tone: "bg-[#0F6E56]/15 text-[#0F6E56] border-[#0F6E56]/30",
    description: "Walk into any OduDoc clinic, scan this at reception, you're registered. Returns only your name, DOB, phone, and photo — no clinical data.",
  },
  emergency: {
    label: "Emergency QR",
    emoji: "🆘",
    tone: "bg-rose-100 text-rose-800 border-rose-300",
    description: "Break-glass access for any clinician in a life-saving situation. Shows allergies, blood group, chronic conditions, current meds, ICE contacts. You're notified after every scan.",
  },
  appointment: {
    label: "Appointment QR",
    emoji: "📅",
    tone: "bg-sky-100 text-sky-800 border-sky-300",
    description: "Auto-generated when you book. Show it at reception to check in. Single-use, expires 2 hours after slot.",
  },
  consent: {
    label: "Consent QR",
    emoji: "🔗",
    tone: "bg-indigo-100 text-indigo-800 border-indigo-300",
    description: "Share specific records with a specific doctor for a specific window. You choose what they see and for how long.",
  },
  wristband: {
    label: "Wristband",
    emoji: "🏥",
    tone: "bg-amber-100 text-amber-800 border-amber-300",
    description: "Issued when you're admitted. Ward staff scan it before every medication / vitals check / lab draw.",
  },
};

function qrImageUrl(token: string): string {
  // Free public QR renderer — fine for the patient-side preview.
  // For production we'd self-host the renderer; this is a stop-gap.
  const verifyUrl = `https://www.odudoc.com/qr/${token}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(verifyUrl)}`;
}

export default function MyQrsPage() {
  const [tokens, setTokens] = useState<QrToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConsent, setShowConsent] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/qr/me", { cache: "no-store" });
    if (r.ok) setTokens((await r.json()).tokens || []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const revoke = async (token: string) => {
    if (!confirm("Revoke this QR? Anyone holding a copy will no longer be able to scan it.")) return;
    const r = await fetch(`/api/qr/${token}/revoke`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    if (r.ok) load();
  };

  return (
    <DashboardShell role="patient">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] bg-clip-text text-transparent">My QR codes</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            You hold the QR. You grant the access. Every scan is logged
            and visible to you within seconds. Revoke any code at any time.
          </p>
        </div>
        <button
          onClick={() => setShowConsent(true)}
          className="rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5942]"
        >
          + New consent QR
        </button>
      </div>

      {loading ? (
        <GlassCard><div className="py-10 text-center"><svg className="mx-auto h-8 w-8 animate-spin text-[#1D9E75]" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" fill="none"/></svg></div></GlassCard>
      ) : tokens.length === 0 ? (
        <GlassCard><p className="py-10 text-center text-white/70">No QR codes yet. Your identity + emergency QRs are being provisioned.</p></GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {tokens.map((t) => {
            const meta = KIND_META[t.kind];
            const isActive = t.status === "active";
            const expired = !isActive || new Date(t.validUntilAt) < new Date();
            return (
              <GlassCard key={t.token}>
                <div className="flex gap-4">
                  <div className="shrink-0">
                    {isActive ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrImageUrl(t.token)} alt={`QR for ${meta.label}`} className="h-44 w-44 rounded-xl bg-white p-2" />
                    ) : (
                      <div className="flex h-44 w-44 items-center justify-center rounded-xl bg-white/5 text-3xl text-white/30">
                        ✕
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${meta.tone}`}>
                          <span>{meta.emoji}</span>
                          {meta.label}
                        </span>
                        {t.label && <p className="mt-1 text-sm font-semibold text-white">{t.label}</p>}
                      </div>
                      {isActive && t.kind !== "wristband" && (
                        <button onClick={() => revoke(t.token)} className="rounded-md border border-rose-300/40 px-2 py-0.5 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/10">Revoke</button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-white/60">{meta.description}</p>
                    <dl className="mt-3 space-y-0.5 text-xs">
                      <Detail label="Status" value={
                        <span className={
                          t.status === "active" ? "font-semibold text-emerald-300"
                          : t.status === "revoked" ? "font-semibold text-rose-300"
                          : t.status === "consumed" ? "font-semibold text-amber-300"
                          : "font-semibold text-white/50"
                        }>{t.status}{expired && t.status === "active" ? " (expired)" : ""}</span>
                      } />
                      <Detail label="Valid until" value={new Date(t.validUntilAt).toLocaleString()} />
                      <Detail label="Scans" value={`${t.scanCount} ${t.usage === "single" ? "(single-use)" : ""}`} />
                      {t.scope.fields.length > 0 && (
                        <Detail label="Reveals" value={t.scope.fields.join(", ")} />
                      )}
                    </dl>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {showConsent && <NewConsentModal onClose={() => setShowConsent(false)} onIssued={() => { setShowConsent(false); load(); }} />}
    </DashboardShell>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-white/50">{label}</dt>
      <dd className="text-right text-white/80">{value}</dd>
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  identity: "Name + DOB + phone",
  allergies: "Allergies",
  blood_group: "Blood group",
  chronic_conditions: "Chronic conditions",
  current_medications: "Current medications",
  ice_contacts: "Emergency contacts",
  abha_id: "ABHA / national health ID",
  recent_consultations: "Last 5 consultations",
  recent_prescriptions: "Last 5 prescriptions",
  recent_lab_results: "Recent lab results",
  active_admission: "Active admission",
  vital_signs_24h: "Vital signs (last 24 h)",
  vaccinations: "Vaccinations",
  discharge_summaries: "Discharge summaries",
};

function NewConsentModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [label, setLabel] = useState("");
  const [fields, setFields] = useState<string[]>(["identity", "recent_consultations"]);
  const [validityHours, setValidityHours] = useState(24);
  const [usage, setUsage] = useState<"single" | "multi">("multi");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (f: string) => setFields((cur) => cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/qr/issue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "consent", label, fields, validityHours, usage }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Failed"); return; }
    onIssued();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 p-6 text-white shadow-2xl">
        <h2 className="text-lg font-bold">Create a consent QR</h2>
        <p className="mt-1 text-xs text-white/60">You choose what the doctor sees and for how long. Revoke any time.</p>

        <label className="mt-4 block text-xs font-semibold text-white/80">
          Label (for your records)
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Dr Patel · 2nd opinion" className="mt-1 w-full rounded border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm" />
        </label>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-white/80">Reveal these fields</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(FIELD_LABELS).map(([k, lbl]) => {
              const on = fields.includes(k);
              return (
                <button key={k} type="button" onClick={() => toggle(k)} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-[#1D9E75] bg-[#1D9E75]/20 text-[#1D9E75]" : "border-white/15 text-white/60 hover:border-white/30"}`}>
                  {lbl}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-white/80">
            Validity
            <select value={validityHours} onChange={(e) => setValidityHours(Number(e.target.value))} className="mt-1 w-full rounded border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm">
              <option value={1}>1 hour</option>
              <option value={4}>4 hours</option>
              <option value={24}>24 hours</option>
              <option value={24 * 7}>7 days</option>
              <option value={24 * 30}>30 days</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-white/80">
            Usage
            <select value={usage} onChange={(e) => setUsage(e.target.value as "single" | "multi")} className="mt-1 w-full rounded border border-white/15 bg-white/[0.06] px-3 py-1.5 text-sm">
              <option value="multi">Multiple scans</option>
              <option value="single">Single use (one scan only)</option>
            </select>
          </label>
        </div>

        {err && <p className="mt-3 rounded bg-rose-500/20 px-3 py-2 text-xs text-rose-200">{err}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-white/15 px-4 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy || fields.length === 0} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold disabled:opacity-60">{busy ? "Creating…" : "Generate QR"}</button>
        </div>
      </div>
    </div>
  );
}
