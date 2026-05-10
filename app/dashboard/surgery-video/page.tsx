"use client";

// "My surgeries" — list of surgery video sessions the signed-in
// patient is a viewer of. Tile click opens the watermarked viewer.

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface SurgerySession {
  id: string;
  surgeryId?: string;
  patientUserId: string;
  leadSurgeonEmail: string;
  livePlaybackUrl?: string;
  recordingUrl?: string;
  durationSeconds?: number;
  status: "scheduled" | "live" | "completed" | "cancelled" | "failed";
  startedAt?: string; endedAt?: string; createdAt: string;
}

const STATUS_TONE: Record<string, string> = {
  scheduled: "bg-indigo-100 text-indigo-800",
  live: "bg-rose-600 text-white animate-pulse",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700",
  failed: "bg-amber-100 text-amber-800",
};

export default function MySurgeriesPage() {
  const { data: auth } = useSession();
  const userId = (auth?.user as { id?: string } | undefined)?.id;
  const [sessions, setSessions] = useState<SurgerySession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const r = await fetch(`/api/surgery-video?patientUserId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setSessions(d.sessions || []);
      }
    } finally { setLoading(false); }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My surgery videos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live and recorded sessions where you&apos;re an authorized viewer. Every play is audit-logged.
        </p>
      </div>

      {loading ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-3xl">🎥</p>
          <p className="mt-2 text-base font-bold text-slate-700">No surgery videos yet</p>
          <p className="mt-1 text-sm text-slate-500">When you consent to OT video on a surgery, the session shows up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/dashboard/surgery-video/${s.id}`}
                className="block rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">
                        {s.surgeryId ? `Surgery ${s.surgeryId}` : "Surgery session"}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_TONE[s.status] || ""}`}>
                        {s.status === "live" ? "● LIVE" : s.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">Lead: {s.leadSurgeonEmail}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.startedAt ? `Started ${new Date(s.startedAt).toLocaleString()}` : `Scheduled ${new Date(s.createdAt).toLocaleString()}`}
                      {s.durationSeconds ? ` · ${Math.round(s.durationSeconds / 60)} min` : ""}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600">
                    {s.status === "live" ? "Watch live →" : s.status === "completed" ? "View recording →" : "Open →"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
