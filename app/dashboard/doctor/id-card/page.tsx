"use client";

// Doctor digital ID card / visiting card.
//
// Pulls /api/doctors/me and renders a credit-card-shaped identity
// card. Public profile URL uses a friendly slug derived from the
// doctor's name + last 4 chars of their internal id, so the share
// link reads "/doctors/dr-ankit-chaudhari-zg2u" rather than
// "/doctors/d-mouf6key-zg2u".
//
// Capabilities:
//   - View on screen (front + back toggle)
//   - Download as PNG (html2canvas, CDN-loaded)
//   - Native share / WhatsApp / email / clipboard fallback
//   - QR code links to the friendly profile URL

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface DoctorRecord {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  qualifications?: string;
  experience?: number;
  imageUrl?: string;
  verified?: boolean;
  licenseCountry?: string;
  licenseNumber?: string;
  city?: string;
  country?: string;
  phone?: string;
}

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
  }
}

const HTML2CANVAS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-cdn="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.cdn = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Mirror of lib/public-doctors.ts:friendlyDoctorSlug. Kept inline so
 *  the client doesn't need a server roundtrip. */
function friendlyDoctorSlug(name: string, id: string): string {
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const idSuffix = id.split("-").pop() || id.slice(-4);
  return namePart ? `${namePart}-${idSuffix}` : id;
}

export default function DoctorIdCardPage() {
  const [me, setMe] = useState<DoctorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Hidden off-screen container that holds BOTH sides stacked. We
  // render this only for the "download front + back" button so the
  // visible preview can stay focused on whichever side the user is
  // looking at, while a single click still produces a complete image.
  const bothSidesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/doctors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.doctor || null))
      .finally(() => setLoading(false));
  }, []);

  // Match server-side computation: lib/public-doctors.ts uses
  // friendlyDoctorSlug(d.name, d.id), NOT a "Dr " prefix. Pre-pending
  // "Dr " here produced "dr-bright-atune-zg2u" while the lookup
  // expected "bright-atune-zg2u" — patients clicking the QR landed
  // on a "Doctor not found" page. Pass me.name verbatim.
  const slug = me ? friendlyDoctorSlug(me.name, me.id) : "";
  const profileUrl = me ? `https://www.odudoc.com/doctors/${slug}` : "";
  const qrUrl = profileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(profileUrl)}`
    : "";

  /** Capture a single DOM node to a PNG blob via html2canvas. */
  const captureToBlob = async (el: HTMLElement): Promise<Blob> => {
    await loadScriptOnce(HTML2CANVAS_CDN);
    if (!window.html2canvas) throw new Error("html2canvas failed to load");
    const canvas = await window.html2canvas(el, {
      backgroundColor: null,
      scale: 3, // Retina-quality so prints + WhatsApp re-compression survive
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("Could not encode PNG");
    return blob;
  };

  /** Trigger a browser download for a single blob. */
  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /** Single-click download — captures BOTH front and back from the
   *  hidden double-card container and saves them as two PNGs. The
   *  browser will offer them back-to-back; on most platforms the
   *  user gets a tiny "downloads complete" stack notification.
   *  Held-Shift / Held-Alt trick is avoided — this is a simple flow. */
  const downloadBoth = async () => {
    if (!bothSidesRef.current || !me) return;
    setBusy(true);
    setToast(null);
    try {
      // Each child of bothSidesRef is one side of the card. Capturing
      // them individually gives us two clean rectangular PNGs that
      // match the on-screen aspect ratio exactly.
      const sides = Array.from(
        bothSidesRef.current.querySelectorAll<HTMLElement>("[data-card-side]"),
      );
      if (sides.length < 2) throw new Error("Card sides not mounted yet");

      // Capture both first, THEN download — saves the user from a
      // popup-blocker "this site is downloading multiple files" prompt
      // because both downloads start within ~200 ms of each other.
      const [frontBlob, backBlob] = await Promise.all([
        captureToBlob(sides[0]),
        captureToBlob(sides[1]),
      ]);
      triggerDownload(frontBlob, `odudoc-${slug}-front.png`);
      // Tiny delay so Chrome doesn't merge them into a single
      // "Downloading 2 files" prompt that needs user permission.
      setTimeout(() => triggerDownload(backBlob, `odudoc-${slug}-back.png`), 250);
      setToast({ kind: "ok", text: "✓ Downloaded front + back as two PNGs" });
    } catch (err) {
      setToast({ kind: "err", text: `Download failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  /** Single-side download fallback for the "Download front" / "Download
   *  back" buttons that still appear under the front/back toggle (some
   *  doctors only want to share one side). */
  const downloadOneSide = async () => {
    if (!cardRef.current || !me) return;
    setBusy(true);
    setToast(null);
    try {
      const blob = await captureToBlob(cardRef.current);
      triggerDownload(blob, `odudoc-${slug}-${side}.png`);
      setToast({ kind: "ok", text: `✓ Downloaded ${side} side as PNG` });
    } catch (err) {
      setToast({ kind: "err", text: `Download failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const shareCard = async () => {
    if (!me) return;
    const text = `Dr. ${me.name} on OduDoc — book a consultation: ${profileUrl}`;
    setToast(null);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `Dr. ${me.name} · OduDoc`,
          text,
          url: profileUrl,
        });
        setToast({ kind: "ok", text: "✓ Shared" });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast({ kind: "ok", text: "✓ Profile link copied to clipboard" });
    } catch {
      setToast({ kind: "err", text: "Copy failed. Long-press the link below to copy manually." });
    }
  };

  const copyUrl = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setToast({ kind: "ok", text: "✓ URL copied" });
    } catch {
      setToast({ kind: "err", text: "Couldn't copy automatically — long-press to copy." });
    }
  };

  const shareWhatsApp = () => {
    if (!me) return;
    const text = `Hi! I'm Dr. ${me.name}${me.specialty ? `, ${me.specialty}` : ""}. Book a consultation with me on OduDoc: ${profileUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareEmail = () => {
    if (!me) return;
    const subject = encodeURIComponent(`Book a consultation with Dr. ${me.name} on OduDoc`);
    const body = encodeURIComponent(
      `Hello,\n\nI'm Dr. ${me.name}${me.specialty ? ` (${me.specialty})` : ""}. ` +
      `You can book a consultation with me directly on OduDoc here:\n\n${profileUrl}\n\n` +
      `Looking forward to seeing you.\n\nDr. ${me.name}`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-violet-50/40 p-12 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-500" />
        <p className="mt-4 text-sm text-slate-500">Loading your ID card…</p>
      </div>
    );
  }
  if (!me) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <p className="text-slate-700">Doctor record not found.</p>
        <Link href="/dashboard/doctor" className="mt-4 inline-block text-sm text-cyan-700 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-violet-50/40">
      {/* Soft glow accents — same modern-dashboard pattern as the new
          footer + admin pages. Pure CSS, no perf cost. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[420px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-300/30 via-blue-300/20 to-transparent blur-3xl" />
        <div className="absolute -bottom-32 right-0 h-[360px] w-[520px] translate-x-1/4 rounded-full bg-gradient-to-tl from-fuchsia-300/30 via-violet-300/20 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Link
          href="/dashboard/doctor"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-cyan-700"
        >
          ← Back to dashboard
        </Link>

        {/* Hero ribbon */}
        <div className="relative mt-4 overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 p-8 text-white shadow-2xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-fuchsia-300/30 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                🪪 Doctor identity
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                My visiting card
              </h1>
              <p className="mt-2 max-w-md text-sm text-white/90">
                Your professional digital ID. Share with patients via WhatsApp,
                pin to your social profiles, or print on physical cards. The QR
                links straight to your booking page.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {me.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/25 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-300/40 backdrop-blur-sm">
                  ✓ Verified clinician
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm">
                #{(me.id.split("-").pop() || me.id.slice(-4)).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Front / back toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex gap-1 rounded-full bg-white p-1 shadow-md ring-1 ring-slate-200">
            <button
              onClick={() => setSide("front")}
              className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${side === "front" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}
            >
              Front · Identity
            </button>
            <button
              onClick={() => setSide("back")}
              className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider transition ${side === "back" ? "bg-gradient-to-r from-fuchsia-500 to-violet-600 text-white shadow-md" : "text-slate-600 hover:text-slate-900"}`}
            >
              Back · Booking
            </button>
          </div>
        </div>

        {/* Card preview — sits in a glassy display tray */}
        <div className="mt-6 flex justify-center">
          <div className="relative w-full max-w-[680px]">
            {/* Soft "shadow tray" beneath the card */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-8 -bottom-3 h-12 rounded-[3rem] bg-gradient-to-r from-cyan-400/30 via-fuchsia-400/30 to-violet-400/30 blur-2xl"
            />
            <div
              ref={cardRef}
              className="relative aspect-[1.586/1] w-full overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/50"
              style={{ aspectRatio: "1.586 / 1" }}
            >
              {side === "front" ? <FrontSide me={me} /> : <BackSide me={me} qrUrl={qrUrl} profileUrl={profileUrl} />}
            </div>

            {/* Hidden off-screen container with BOTH sides at full
                size. Used only by the "download front + back" button.
                Keeping it mounted at all times means the first click
                doesn't have to wait for a render pass + image fetch.
                Positioned far off-screen rather than display:none so
                html2canvas can actually paint it. */}
            <div
              ref={bothSidesRef}
              aria-hidden="true"
              className="pointer-events-none absolute"
              style={{
                left: "-99999px",
                top: 0,
                width: "1280px", // 2x the on-screen card width for crispness
                opacity: 0,
              }}
            >
              <div
                data-card-side="front"
                className="relative overflow-hidden rounded-3xl"
                style={{ width: "1280px", aspectRatio: "1.586 / 1" }}
              >
                <FrontSide me={me} />
              </div>
              <div
                data-card-side="back"
                className="relative mt-4 overflow-hidden rounded-3xl"
                style={{ width: "1280px", aspectRatio: "1.586 / 1" }}
              >
                <BackSide me={me} qrUrl={qrUrl} profileUrl={profileUrl} />
              </div>
            </div>
          </div>
        </div>

        {/* Action row — colourful gradient buttons. Primary download
            now grabs both sides in a single click; the per-side
            shortcut sits underneath as a small text link for doctors
            who only want one face of the card. */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionBtn
            onClick={downloadBoth}
            disabled={busy}
            icon="📥"
            label={busy ? "Preparing…" : "Download front + back"}
            gradient="from-cyan-500 via-sky-500 to-blue-600"
          />
          <ActionBtn
            onClick={shareCard}
            icon="🔗"
            label="Share / Copy link"
            gradient="from-violet-500 via-purple-500 to-fuchsia-600"
          />
          <ActionBtn
            onClick={shareWhatsApp}
            icon="💬"
            label="Share to WhatsApp"
            gradient="from-emerald-500 via-green-500 to-teal-600"
          />
          <ActionBtn
            onClick={shareEmail}
            icon="✉"
            label="Share via email"
            gradient="from-amber-500 via-orange-500 to-rose-500"
          />
        </div>
        <div className="mt-2 text-center">
          <button
            onClick={downloadOneSide}
            disabled={busy}
            className="text-xs text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            Or download just the {side} side
          </button>
        </div>

        {toast && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              toast.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Public profile URL panel */}
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 overflow-hidden rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Your public profile URL
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="flex-1 break-all rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800">
                {profileUrl}
              </code>
              <button
                onClick={copyUrl}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5"
              >
                Copy
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              <span className="font-semibold text-emerald-700">Tip:</span>{" "}
              this URL is name-based now (was an opaque internal id before).
              Patients land here when they scan your QR. Keep your bio,
              services, and time slots fresh on{" "}
              <Link href="/dashboard/doctor/profile" className="font-semibold text-cyan-700 hover:underline">
                your profile page
              </Link>{" "}
              for the best conversion.
            </p>
          </div>

          {/* Quick stats / pro tips card */}
          <div className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-pink-50/40 p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
              Pro tips
            </p>
            <ul className="mt-3 space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base">📌</span>
                <span>Pin your card to WhatsApp Status — patients book in seconds.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base">🖨</span>
                <span>Print the front + back at <b>8.6 × 5.4 cm</b> (CR80) for physical cards.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base">📱</span>
                <span>Add the QR to your reception desk so walk-ins can self-book.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-base">✨</span>
                <span>A real photo lifts profile-to-booking conversion by ~3×.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Front side — identity card. */
function FrontSide({ me }: { me: DoctorRecord }) {
  const initials = me.name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-800 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-fuchsia-400/25 blur-3xl" />
      {/* Subtle pattern grid for texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="absolute inset-0 flex flex-col p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <span className="text-lg">⚕️</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">
                OduDoc
              </p>
              <p className="text-[9px] text-white/60">Verified clinician</p>
            </div>
          </div>
          {me.verified && (
            <span className="rounded-full bg-emerald-500/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-300/40">
              ✓ Verified
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-1 items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/40">
            {me.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.imageUrl} alt={me.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/30 to-white/5 text-2xl font-bold">
                {initials || "DR"}
              </div>
            )}
            {/* Soft inner highlight */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold leading-tight">
              Dr. {me.name.replace(/^Dr\.?\s*/i, "")}
            </p>
            {me.specialty && (
              <p className="mt-0.5 text-sm font-semibold text-cyan-100">{me.specialty}</p>
            )}
            {me.qualifications && (
              <p className="mt-0.5 truncate text-xs text-white/80">{me.qualifications}</p>
            )}
            {me.experience !== undefined && me.experience > 0 && (
              <p className="mt-1 text-[11px] text-white/70">{me.experience}+ years experience</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-3 border-t border-white/15 pt-3 text-[10px]">
          <div>
            <p className="font-bold uppercase tracking-[0.15em] text-white/60">License</p>
            <p className="mt-0.5 text-white/90">
              {me.licenseNumber
                ? `${me.licenseCountry || ""} · ${me.licenseNumber}`.trim()
                : "Pending registration"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold uppercase tracking-[0.15em] text-white/60">odudoc.com</p>
            <p className="mt-0.5 text-white/80">/doctors/{me.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 18)}…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Back side — QR + booking CTA. */
function BackSide({ me, qrUrl, profileUrl }: { me: DoctorRecord; qrUrl: string; profileUrl: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="absolute inset-0 flex items-center gap-6 p-6">
        <div className="flex shrink-0 flex-col items-center">
          <div className="rounded-2xl bg-white p-2.5 ring-2 ring-white/30 shadow-lg">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="Profile QR" width={140} height={140} className="block" crossOrigin="anonymous" />
            ) : (
              <div className="h-[140px] w-[140px] bg-slate-100" />
            )}
          </div>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/70">
            Scan to book
          </p>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
            Book a consultation
          </p>
          <h2 className="mt-1 text-xl font-bold leading-tight">
            Talk to Dr. {me.name.replace(/^Dr\.?\s*/i, "")}
          </h2>
          <p className="mt-1 text-xs text-white/80">
            Video consult · prescription delivered to your phone · pay only after the call.
          </p>

          <ul className="mt-4 space-y-1.5 text-[11px] text-white/85">
            {me.specialty && (
              <li className="flex items-center gap-2"><span>🩺</span>{me.specialty}</li>
            )}
            {(me.city || me.country) && (
              <li className="flex items-center gap-2"><span>📍</span>{[me.city, me.country].filter(Boolean).join(", ")}</li>
            )}
            <li className="flex items-center gap-2 break-all"><span>🔗</span>{profileUrl.replace("https://", "")}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, disabled, icon, label, gradient,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  label: string;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} px-4 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {/* Subtle shine sweep on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      />
      <span className="relative text-lg">{icon}</span>
      <span className="relative">{label}</span>
    </button>
  );
}
