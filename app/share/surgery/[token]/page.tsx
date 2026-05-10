"use client";

// Public surgery video viewer via share token.
//
// Token is in the URL path; we redeem it on load. No auth required.
// Same watermark + HLS player shape as /dashboard/surgery-video/[id].

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface Resp {
  session: { id: string; status: string; startedAt?: string; endedAt?: string; durationSeconds?: number };
  playbackUrl?: string;
  watermark: { patientUserId: string; ip?: string; viewedAt: string };
}

declare global {
  interface Window { Hls?: new (config?: unknown) => HlsLike; }
}
interface HlsLike { loadSource: (src: string) => void; attachMedia: (el: HTMLMediaElement) => void; destroy: () => void; }

export default function SharedSurgeryViewerPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [data, setData] = useState<Resp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<HlsLike | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await fetch(`/api/share/surgery?token=${encodeURIComponent(String(token))}`, { cache: "no-store" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error === "expired" ? "This link has expired." :
                 d.error === "revoked" ? "This link was revoked by the hospital." :
                 d.error === "ip_limit_reached" ? "This link's view limit has been reached." :
                 d.error === "not_found" || d.error === "invalid" ? "Invalid link." :
                 d.error || `Failed (${r.status})`);
        return;
      }
      setData(d);
    } catch (e) { setError((e as Error).message); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !data?.playbackUrl) return;
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    const url = data.playbackUrl;
    if (video.canPlayType("application/vnd.apple.mpegurl")) { video.src = url; return; }
    let cancelled = false;
    (async () => {
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
    })().catch((e) => setError(e.message));
    return () => { cancelled = true; if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
  }, [data]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-3xl">🔒</p>
          <p className="mt-2 font-bold text-rose-900">{error}</p>
          <p className="mt-1 text-xs text-rose-700">Ask whoever shared the link to mint a new one.</p>
        </div>
      </main>
    );
  }
  if (!data) return <p className="mx-auto mt-12 max-w-md rounded-xl bg-white p-8 text-center text-sm text-slate-400 shadow-sm">Loading…</p>;

  const wmText = `OduDoc · ${data.watermark.patientUserId} · ${data.watermark.ip || "no-ip"} · ${new Date(data.watermark.viewedAt).toLocaleString()}`;

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Shared via secure link · OduDoc</p>
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-slate-200" style={{ aspectRatio: "16 / 9" }}>
          {data.playbackUrl ? (
            <>
              <video
                ref={videoRef}
                controls playsInline
                className="h-full w-full object-contain"
                onContextMenu={(e) => e.preventDefault()}
              />
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
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white text-sm">
              {data.session.status === "scheduled" ? "Stream hasn't started yet — refresh shortly." : "No playback available."}
            </div>
          )}
        </div>
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[10px] text-amber-800">
          This view is logged with your IP. Recording or redistributing surgical video may breach the consent agreement under which the link was shared.
        </p>
      </div>
    </main>
  );
}
