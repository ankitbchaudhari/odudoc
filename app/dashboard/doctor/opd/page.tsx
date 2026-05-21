"use client";

// V17 — doctor's OPD queue. Three things on one screen:
//   1. The current in-consult patient with auto-filled context
//   2. The waiting line
//   3. Today's footfall counter

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface OpdToken {
  id: string; displayNumber: string; patientId: string; patientName: string; patientPhone?: string;
  status: "waiting" | "called" | "in_consult" | "completed" | "no_show" | "cancelled";
  queuePosition: number; arrivedAt: string; calledAt?: string; consultStartedAt?: string;
  patientAbhaId?: string; linkedAppointmentId?: string;
  doctorId: string; doctorName: string;
}

interface AutoFillEnvelope {
  token: OpdToken;
  patient: {
    id: string; name: string; email?: string; phone?: string; dob?: string;
    gender?: string; country?: string; abhaId?: string; photoUrl?: string; medicalId?: string;
  } | null;
  emergencyProfile: Record<string, unknown> | null;
  recentConsults: Array<{ id: string; doctorName: string; specialty: string; dateLabel: string; status: string; diagnosis?: string }>;
  linkedAppointmentId?: string;
}

interface FootfallRow {
  date: string; doctorName: string; completed: number; noShows: number;
  cancelled: number; avgWaitMin?: number; avgConsultMin?: number;
}

export default function DoctorOpdPage() {
  const { data: session } = useSession();
  const doctorId = session?.user?.id || "doc-001";
  const [queue, setQueue] = useState<OpdToken[]>([]);
  const [autoFill, setAutoFill] = useState<AutoFillEnvelope | null>(null);
  const [footfall, setFootfall] = useState<FootfallRow[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [qr, fr] = await Promise.all([
      fetch(`/api/opd/queue?doctorId=${encodeURIComponent(doctorId)}`, { cache: "no-store" }),
      fetch(`/api/opd/footfall?days=7`, { cache: "no-store" }),
    ]);
    if (qr.ok) setQueue((await qr.json()).tokens || []);
    if (fr.ok) setFootfall((await fr.json()).footfall || []);
  }, [doctorId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const id = setInterval(load, 8000); return () => clearInterval(id); }, [load]);

  const callNext = async () => {
    setBusy(true);
    try {
      await fetch("/api/opd/call-next", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ doctorId }) });
      load();
    } finally { setBusy(false); }
  };

  const startConsult = async (id: string) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/opd/${id}/start-consult`, { method: "POST" });
      if (r.ok) setAutoFill(await r.json());
      load();
    } finally { setBusy(false); }
  };

  const complete = async () => {
    if (!autoFill) return;
    setBusy(true);
    try {
      await fetch(`/api/opd/${autoFill.token.id}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      setAutoFill(null);
      load();
    } finally { setBusy(false); }
  };

  const current = queue.find((t) => t.status === "in_consult" || t.status === "called");
  const waiting = queue.filter((t) => t.status === "waiting");
  const todayCompleted = footfall.find((f) => f.date === new Date().toISOString().slice(0, 10))?.completed || 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My OPD queue</h1>
          <p className="mt-1 text-sm text-gray-600">
            V17 — call next patient → scan their chit (or click Start) →
            their data auto-fills the encounter form. Footfall logs on
            complete.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label="Waiting" value={waiting.length} tone="amber" />
          <Stat label="Today" value={todayCompleted} tone="emerald" />
        </div>
      </div>

      {/* Current consult */}
      {autoFill && autoFill.patient ? (
        <div className="rounded-2xl border border-[#0F6E56]/40 bg-[#0F6E56]/5 p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              {autoFill.patient.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={autoFill.patient.photoUrl} alt={autoFill.patient.name} className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0F6E56] text-2xl font-bold text-white">
                  {autoFill.patient.name.charAt(0)}
                </div>
              )}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#0F6E56]">Now consulting · {autoFill.token.displayNumber}</p>
                <h2 className="text-2xl font-bold text-gray-900">{autoFill.patient.name}</h2>
                <p className="text-sm text-gray-600">
                  {autoFill.patient.gender ? `${autoFill.patient.gender} · ` : ""}
                  {autoFill.patient.dob ? `DOB ${autoFill.patient.dob.slice(0, 10)} · ` : ""}
                  {autoFill.patient.phone || "—"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] font-semibold">
                  {autoFill.patient.medicalId && <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">{autoFill.patient.medicalId}</span>}
                  {autoFill.patient.abhaId && <span className="rounded bg-indigo-100 px-2 py-0.5 text-indigo-800">ABHA {autoFill.patient.abhaId}</span>}
                  {autoFill.linkedAppointmentId && <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-800">Pre-booked</span>}
                </div>
              </div>
            </div>
            <button onClick={complete} disabled={busy} className="rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60">
              {busy ? "Closing…" : "Complete consult"}
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Section title="Emergency profile">
              <ProfileLine emoji="🩸" label="Blood group" value={(autoFill.emergencyProfile?.bloodGroup as string) || "Not recorded"} />
              <ProfileLine emoji="⚠️" label="Allergies" value={fmtArr(autoFill.emergencyProfile?.allergies)} />
              <ProfileLine emoji="📜" label="Chronic conditions" value={fmtArr(autoFill.emergencyProfile?.chronicConditions)} />
              <ProfileLine emoji="💊" label="Current medications" value={fmtArr(autoFill.emergencyProfile?.currentMedications)} />
            </Section>
            <Section title="Recent visits (last 5)">
              {autoFill.recentConsults.length === 0 ? (
                <p className="text-sm text-gray-500">First visit on OduDoc.</p>
              ) : (
                <ul className="space-y-1.5">
                  {autoFill.recentConsults.map((c) => (
                    <li key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{c.specialty} · {c.dateLabel}</span>
                        <span className="text-gray-500">{c.status}</span>
                      </div>
                      {c.diagnosis && <div className="mt-0.5 text-gray-600">Chief complaint: {c.diagnosis}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      ) : current ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Called · awaiting scan</p>
          <p className="mt-1 font-mono text-5xl font-extrabold text-sky-900">{current.displayNumber}</p>
          <p className="mt-1 text-lg text-sky-900">{current.patientName}</p>
          <button onClick={() => startConsult(current.id)} disabled={busy} className="mt-4 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-60">
            {busy ? "Opening…" : "Start consultation"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-600">No active consult. {waiting.length > 0 ? "Call the next patient." : "Queue is empty."}</p>
          {waiting.length > 0 && (
            <button onClick={callNext} disabled={busy} className="mt-3 rounded-xl bg-[#0F6E56] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60">
              {busy ? "Calling…" : `Call next (${waiting[0].displayNumber} · ${waiting[0].patientName})`}
            </button>
          )}
        </div>
      )}

      {/* Waiting queue */}
      {waiting.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-bold text-gray-900">Waiting ({waiting.length})</h2></div>
          <ul className="divide-y divide-gray-100">
            {waiting.map((t, i) => (
              <li key={t.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold text-[#0F6E56]">{t.displayNumber}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.patientName}</p>
                    <p className="text-xs text-gray-500">Arrived {new Date(t.arrivedAt).toLocaleTimeString()} · #{i + 1} in line</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7-day footfall mini-chart */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3"><h2 className="text-sm font-bold text-gray-900">Footfall (last 7 days)</h2></div>
        {footfall.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">No completed tokens yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Completed</th>
                <th className="px-4 py-2 text-right">No-shows</th>
                <th className="px-4 py-2 text-right">Avg wait</th>
                <th className="px-4 py-2 text-right">Avg consult</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {footfall.map((f) => (
                <tr key={f.date}>
                  <td className="px-4 py-2 font-medium">{f.date}</td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-700">{f.completed}</td>
                  <td className="px-4 py-2 text-right text-rose-700">{f.noShows}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{f.avgWaitMin ?? "—"} min</td>
                  <td className="px-4 py-2 text-right text-gray-600">{f.avgConsultMin ?? "—"} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" }) {
  const c = tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900";
  return (
    <div className={`rounded-xl border px-3 py-2 ${c}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function ProfileLine({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <p className="text-sm">
      <span className="mr-2">{emoji}</span>
      <span className="font-semibold text-gray-700">{label}:</span>{" "}
      <span className="text-gray-900">{value || "—"}</span>
    </p>
  );
}

function fmtArr(v: unknown): string {
  if (!v) return "None recorded";
  if (Array.isArray(v)) {
    if (v.length === 0) return "None recorded";
    return v.map((x) => typeof x === "object" && x !== null ? (x as { name?: string }).name || JSON.stringify(x) : String(x)).join(", ");
  }
  return String(v);
}
