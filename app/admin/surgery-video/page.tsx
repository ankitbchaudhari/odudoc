"use client";

// Surgery video admin — schedule sessions + provision Cloudflare
// Stream live input or upload URL + monitor lifecycle.

import { useCallback, useEffect, useState } from "react";

interface Session {
  id: string; organizationId: string;
  surgeryId?: string; consentRecordId: string;
  patientUserId: string; leadSurgeonEmail: string;
  observerEmails: string[];
  livePlaybackUrl?: string; recordingUrl?: string;
  providerVideoId?: string; ingestUrl?: string; ingestKey?: string;
  durationSeconds?: number; bytes?: number;
  status: "scheduled" | "live" | "completed" | "cancelled" | "failed";
  startedAt?: string; endedAt?: string; createdAt: string; notes?: string;
}

export default function SurgeryVideoAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [provisioning, setProvisioning] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState<{ id: string; rtmpsUrl?: string; rtmpsKey?: string; uploadURL?: string } | null>(null);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/surgery-video?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSessions(d.sessions || []);
      setConfigured(!!d.configured);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const provision = async (sessionId: string, mode: "upload" | "live") => {
    setProvisioning(sessionId); setProvisioned(null);
    try {
      const r = await fetch("/api/surgery-video/cloudflare/provision", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, organizationId: orgId, mode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(d.error || `Provision failed (${r.status})`);
        return;
      }
      setProvisioned({ id: sessionId, rtmpsUrl: d.rtmpsUrl, rtmpsKey: d.rtmpsKey, uploadURL: d.uploadURL });
      load();
    } finally { setProvisioning(null); }
  };

  const cancel = async (id: string) => {
    if (!confirm("Cancel this session?")) return;
    await fetch("/api/surgery-video", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", id, organizationId: orgId }),
    });
    load();
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Surgery video</h2>
          <p className="mt-1 text-sm text-gray-500">
            Schedule + provision live OT video. Streams ingest to Cloudflare; viewers watch via signed HLS.
          </p>
          {!configured && (
            <p className="mt-1 inline-block rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800 ring-1 ring-amber-200">
              Cloudflare Stream not configured. Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_STREAM_API_TOKEN to enable.
            </p>
          )}
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white">
          {showForm ? "Cancel" : "+ Schedule session"}
        </button>
      </div>

      {showForm && <ScheduleForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}

      {provisioned && (
        <div className="my-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-bold text-emerald-900">Encoder credentials — show only to the lead surgeon / OT tech</p>
          {provisioned.rtmpsUrl && (
            <div className="mt-2 space-y-1 text-xs">
              <p><b>RTMPS URL:</b> <code className="rounded bg-white px-1.5 py-0.5">{provisioned.rtmpsUrl}</code></p>
              <p><b>Stream key:</b> <code className="rounded bg-white px-1.5 py-0.5">{provisioned.rtmpsKey}</code></p>
              <p className="text-emerald-800">Configure your in-OT encoder (OBS / hardware) with these. Streaming will auto-record.</p>
            </div>
          )}
          {provisioned.uploadURL && (
            <div className="mt-2 text-xs">
              <p><b>One-shot upload URL:</b></p>
              <code className="block break-all rounded bg-white px-1.5 py-0.5 mt-1">{provisioned.uploadURL}</code>
              <p className="mt-2 text-emerald-800">Have the encoder PUT the recording file to this URL. Expires in 1 hour.</p>
            </div>
          )}
          <button onClick={() => setProvisioned(null)} className="mt-3 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-300">
            Dismiss
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No surgery sessions scheduled.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => (
            <li key={s.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">Patient {s.patientUserId}</p>
                    <StatusBadge status={s.status} />
                    {s.surgeryId && <span className="text-[10px] text-slate-400">#{s.surgeryId}</span>}
                  </div>
                  <p className="text-xs text-slate-500">Lead: {s.leadSurgeonEmail}{s.observerEmails.length > 0 ? ` · ${s.observerEmails.length} observer${s.observerEmails.length === 1 ? "" : "s"}` : ""}</p>
                  <p className="text-[10px] text-slate-400">Consent {s.consentRecordId} · created {new Date(s.createdAt).toLocaleString()}</p>
                  {s.providerVideoId && <p className="text-[10px] text-slate-400">Cloudflare video id: <code>{s.providerVideoId}</code></p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {s.status === "scheduled" && configured && (
                    <>
                      <button disabled={provisioning === s.id} onClick={() => provision(s.id, "live")} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                        {provisioning === s.id ? "…" : "Provision live"}
                      </button>
                      <button disabled={provisioning === s.id} onClick={() => provision(s.id, "upload")} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300 disabled:opacity-50">
                        Upload-only
                      </button>
                    </>
                  )}
                  {s.status !== "completed" && s.status !== "cancelled" && (
                    <button onClick={() => cancel(s.id)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-rose-600 ring-1 ring-rose-200">Cancel</button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  const cls = status === "live" ? "bg-rose-600 text-white animate-pulse"
    : status === "completed" ? "bg-emerald-100 text-emerald-800"
    : status === "scheduled" ? "bg-indigo-100 text-indigo-800"
    : status === "cancelled" ? "bg-slate-100 text-slate-700"
    : "bg-amber-100 text-amber-800";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls}`}>{status}</span>;
}

function ScheduleForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [s, setS] = useState({
    surgeryId: "", consentRecordId: "", patientUserId: "",
    leadSurgeonEmail: "", observerEmails: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!s.consentRecordId.trim() || !s.patientUserId.trim() || !s.leadSurgeonEmail.trim()) {
      setError("Consent record id, patient userId, and lead surgeon email are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/surgery-video", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          organizationId: orgId,
          surgeryId: s.surgeryId.trim() || undefined,
          consentRecordId: s.consentRecordId.trim(),
          patientUserId: s.patientUserId.trim(),
          leadSurgeonEmail: s.leadSurgeonEmail.trim(),
          observerEmails: s.observerEmails.split(",").map((e) => e.trim()).filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error || `Failed (${res.status})`); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">Schedule surgery session</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <I label="Patient userId" v={s.patientUserId} on={(v) => setS({ ...s, patientUserId: v })} />
        <I label="Consent record id" v={s.consentRecordId} on={(v) => setS({ ...s, consentRecordId: v })} />
        <I label="Lead surgeon email" v={s.leadSurgeonEmail} on={(v) => setS({ ...s, leadSurgeonEmail: v })} />
        <I label="Surgery id (optional)" v={s.surgeryId} on={(v) => setS({ ...s, surgeryId: v })} />
        <I label="Observer emails (comma-separated)" v={s.observerEmails} on={(v) => setS({ ...s, observerEmails: v })} className="sm:col-span-2" />
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Schedule"}
        </button>
      </div>
    </div>
  );
}

function I({ label, v, on, className = "" }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
