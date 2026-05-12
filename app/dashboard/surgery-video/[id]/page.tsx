"use client";

// Surgery video viewer.
//
// Authorized observers (patient + listed observerEmails + lead
// surgeon) load this page; /api/surgery-video?id= performs auth +
// audit logging server-side, so by the time we have a session in
// hand the viewer is already cleared.
//
// HLS playback uses the browser's native support when available
// (Safari, iOS) and falls back to hls.js loaded from CDN for
// everyone else — keeps the main bundle small for users who
// never visit this page.
//
// Watermark mirrors /dashboard/documents/view: diagonal repeating
// "OduDoc · userId · ip · time" so a screen-recorded leak traces
// back to the device that recorded it.

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SurgerySession {
  id: string;
  organizationId: string;
  surgeryId?: string;
  patientUserId: string;
  leadSurgeonEmail: string;
  observerEmails: string[];
  livePlaybackUrl?: string;
  recordingUrl?: string;
  durationSeconds?: number;
  status: "scheduled" | "live" | "completed" | "cancelled" | "failed";
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  notes?: string;
}

interface Resp {
  session: SurgerySession;
  configured: boolean;
  provider: string;
  watermark?: { patientUserId: string; ip?: string; viewedAt: string };
}

const STATUS_TONE: Record<SurgerySession["status"], string> = {
  scheduled: "bg-indigo-100 text-indigo-800",
  live: "bg-rose-600 text-white animate-pulse",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-200 text-slate-700 dark:text-slate-300",
  failed: "bg-amber-100 text-amber-800",
};

declare global {
  interface Window { Hls?: new (config?: unknown) => HlsLike; }
}
interface HlsLike {
  loadSource: (src: string) => void;
  attachMedia: (el: HTMLMediaElement) => void;
  destroy: () => void;
}

export default function SurgeryViewerPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsLike | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await fetch(`/api/surgery-video?id=${encodeURIComponent(String(id))}`, { cache: "no-store" });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        if (r.status === 403) setError("You're not authorized to view this surgery. Ask the hospital to add you as an observer.");
        else setError(e.error || `Failed (${r.status})`);
        return;
      }
      setData(await r.json());
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  // Poll while scheduled / live so the page flips to the player as
  // soon as the OT encoder starts streaming.
  useEffect(() => {
    if (!data) return;
    if (data.session.status !== "scheduled" && data.session.status !== "live") return;
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [data, load]);

  // Wire HLS playback when a URL is available + status is live or
  // completed. Native HLS first; lazy-load hls.js otherwise.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !data) return;
    const url = data.session.status === "completed"
      ? data.session.recordingUrl
      : data.session.livePlaybackUrl;
    if (!url) return;

    // Tear down any previous instance before re-attaching.
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      return;
    }
    let cancelled = false;
    const ensureHls = async () => {
      if (!window.Hls) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js";
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("hls.js failed to load"));
          document.head.appendChild(s);
        });
      }
      if (cancelled || !window.Hls || !videoRef.current) return;
      const hls = new window.Hls();
      hls.loadSource(url);
      hls.attachMedia(videoRef.current);
      hlsRef.current = hls;
    };
    ensureHls().catch((e) => setError(e.message));
    return () => { cancelled = true; if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [data]);

  if (error) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <p className="font-bold">Cannot load surgery video</p>
        <p className="mt-1">{error}</p>
        <Link href="/dashboard" className="mt-3 inline-block text-xs font-semibold underline">Back to dashboard</Link>
      </div>
    );
  }
  if (!data) return <p className="mx-auto mt-12 max-w-md rounded-xl bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>;

  const { session: s } = data;
  const playbackUrl = s.status === "completed" ? s.recordingUrl : s.livePlaybackUrl;
  const wmText = `OduDoc · ${s.patientUserId} · ${data.watermark?.ip || "no-ip"} · ${new Date(data.watermark?.viewedAt || Date.now()).toLocaleString()}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">← Dashboard</Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">Surgery video</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Lead: {s.leadSurgeonEmail}
            {s.surgeryId && <> · #{s.surgeryId}</>}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${STATUS_TONE[s.status]}`}>
          {s.status === "live" ? "● LIVE" : s.status}
        </span>
      </div>

      {/* Player or placeholder */}
      <div className="relative overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-slate-200 dark:ring-slate-800" style={{ aspectRatio: "16 / 9" }}>
        {playbackUrl ? (
          <>
            <video
              ref={videoRef}
              controls
              playsInline
              autoPlay={s.status === "live"}
              className="h-full w-full object-contain"
              onContextMenu={(e) => e.preventDefault()}
            />
            {/* Watermark overlay */}
            <div className="pointer-events-none absolute inset-0 select-none">
              {Array.from({ length: 10 }).map((_, row) => (
                <div key={row} className="absolute inset-x-0 -rotate-12" style={{ top: `${row * 12}%` }}>
                  <div className="flex justify-around whitespace-nowrap text-[9px] font-bold uppercase tracking-[0.3em] text-white/15">
                    {Array.from({ length: 3 }).map((__, col) => <span key={col}>{wmText}</span>)}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : s.status === "scheduled" ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <p className="text-3xl">⏳</p>
            <p className="mt-2 text-base font-bold">Stream hasn&apos;t started yet</p>
            <p className="mt-1 text-xs text-white/70">This page will refresh automatically when the OT encoder connects.</p>
          </div>
        ) : s.status === "live" ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <p className="text-3xl">📡</p>
            <p className="mt-2 text-base font-bold">Connecting to live feed…</p>
            <p className="mt-1 text-xs text-white/70">If this persists, the encoder may be offline.</p>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <p className="text-3xl">🚫</p>
            <p className="mt-2 text-base font-bold">{s.status === "cancelled" ? "Session cancelled" : s.status === "failed" ? "Session failed" : "No recording available"}</p>
            {s.notes && <p className="mt-1 text-xs text-white/70">{s.notes}</p>}
          </div>
        )}
      </div>

      {/* Compliance notice */}
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] text-amber-800">
        Every view of this video is logged with your account, IP, and timestamp on
        {" "}<Link href="/dashboard/audit" className="font-semibold underline">Audit log</Link>.
        Recording or redistributing surgical video may breach the consent agreement.
      </p>

      {/* Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        <Stat label="Status" value={s.status} />
        <Stat label="Started" value={s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"} />
        <Stat label="Ended" value={s.endedAt ? new Date(s.endedAt).toLocaleString() : "—"} />
        <Stat label="Duration" value={s.durationSeconds ? `${Math.round(s.durationSeconds / 60)} min` : "—"} />
      </div>

      {s.observerEmails.length > 0 && (
        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Observers: {s.observerEmails.length} authorized
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900 p-3 ring-1 ring-slate-200 dark:ring-slate-800">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
