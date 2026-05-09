"use client";

// Doctor digital ID card / visiting card.
//
// Pulls the signed-in doctor's record from /api/doctors/me and
// renders a credit-card-shaped, gradient-backed identity card with
// photo, name, specialty, qualifications, license number, OduDoc
// branding, and a QR code linking to their public profile.
//
// Capabilities:
//   - View the card on screen (front + back)
//   - Download as PNG (html2canvas, CDN-loaded — no package.json change)
//   - Share via the Web Share API; falls back to WhatsApp, email,
//     and copy-to-clipboard
//
// QR code uses qrserver.com's free API (no client library needed,
// just an <img src="...?data=...">). Falls back to a "click the link"
// hint if the network call fails.

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

export default function DoctorIdCardPage() {
  const [me, setMe] = useState<DoctorRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/doctors/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setMe(j?.doctor || null))
      .finally(() => setLoading(false));
  }, []);

  const profileUrl = me ? `https://www.odudoc.com/doctors/${me.id}` : "";
  const qrUrl = profileUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(profileUrl)}`
    : "";

  /** Download whichever side is currently visible as a PNG. */
  const downloadPng = async () => {
    if (!cardRef.current || !me) return;
    setBusy(true);
    setToast(null);
    try {
      await loadScriptOnce(HTML2CANVAS_CDN);
      if (!window.html2canvas) throw new Error("html2canvas failed to load");
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3, // high-res for printing / WhatsApp
        useCORS: true,
        logging: false,
      });
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      if (!blob) throw new Error("Could not encode PNG");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `odudoc-${me.name.replace(/\s+/g, "-").toLowerCase()}-${side}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast(`Downloaded ${side} side`);
    } catch (err) {
      setToast(`Download failed: ${(err as Error).message}`);
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
        setToast("Shared.");
        return;
      } catch {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast("Profile link copied to clipboard.");
    } catch {
      setToast("Copy failed. Long-press the link below to copy manually.");
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-sky-50/40 p-12 text-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/40 to-sky-50/40">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <Link href="/dashboard/doctor" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-cyan-700">
          ← Back to dashboard
        </Link>

        <div className="mt-4 mb-6">
          <h1 className="text-3xl font-bold text-slate-900">My ID card</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your digital visiting card. Download as a high-res image or share
            the link directly with patients via WhatsApp, email, or any
            messenger.
          </p>
        </div>

        {/* Front / back toggle */}
        <div className="mb-4 inline-flex gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200">
          <button
            onClick={() => setSide("front")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${side === "front" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Front · Identity
          </button>
          <button
            onClick={() => setSide("back")}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${side === "back" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            Back · Booking
          </button>
        </div>

        {/* Card preview */}
        <div className="flex justify-center">
          <div
            ref={cardRef}
            className="relative aspect-[1.586/1] w-full max-w-[640px] overflow-hidden rounded-3xl shadow-2xl"
            style={{ aspectRatio: "1.586 / 1" /* CR80 ID-card ratio */ }}
          >
            {side === "front" ? <FrontSide me={me} /> : <BackSide me={me} qrUrl={qrUrl} profileUrl={profileUrl} />}
          </div>
        </div>

        {/* Action row */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ActionBtn onClick={downloadPng} disabled={busy} icon="📥" label={busy ? "Preparing…" : `Download ${side}`} tone="primary" />
          <ActionBtn onClick={shareCard} icon="🔗" label="Share / Copy link" tone="default" />
          <ActionBtn onClick={shareWhatsApp} icon="💬" label="Share to WhatsApp" tone="green" />
          <ActionBtn onClick={shareEmail} icon="✉" label="Share via email" tone="default" />
        </div>

        {toast && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {toast}
          </div>
        )}

        {/* Public profile link */}
        <div className="mt-8 rounded-2xl border border-white/60 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            Your public profile
          </p>
          <p className="mt-1 break-all text-sm text-slate-800">{profileUrl}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            Patients land here when they scan your QR. Keep your bio, services,
            and time slots fresh on{" "}
            <Link href="/dashboard/doctor/profile" className="font-semibold text-cyan-700 hover:underline">
              your profile page
            </Link>{" "}
            for the best conversion.
          </p>
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
      {/* Glow accents */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />

      <div className="absolute inset-0 flex flex-col p-6">
        {/* Header — OduDoc branding */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm ring-1 ring-white/30">
              <span className="text-base">⚕️</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                OduDoc
              </p>
              <p className="text-[9px] text-white/60">Verified clinician</p>
            </div>
          </div>
          {me.verified && (
            <span className="rounded-full bg-emerald-500/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-300/40">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Body — photo + name */}
        <div className="mt-3 flex flex-1 items-center gap-4">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/40">
            {me.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.imageUrl} alt={me.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/20 to-white/5 text-2xl font-bold">
                {initials || "DR"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold leading-tight">Dr. {me.name.replace(/^Dr\.?\s*/i, "")}</p>
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

        {/* Footer — license */}
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
            <p className="mt-0.5 text-white/80">/doctors/{me.id.slice(0, 14)}…</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Back side — QR code + booking call to action. */
function BackSide({ me, qrUrl, profileUrl }: { me: DoctorRecord; qrUrl: string; profileUrl: string }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 h-52 w-52 rounded-full bg-fuchsia-400/15 blur-3xl" />

      <div className="absolute inset-0 flex items-center gap-6 p-6">
        {/* QR code */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="rounded-2xl bg-white p-2.5 ring-2 ring-white/30">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="Profile QR" width={140} height={140} className="block" crossOrigin="anonymous" />
            ) : (
              <div className="h-[140px] w-[140px] bg-slate-100" />
            )}
          </div>
          <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
            Scan to book
          </p>
        </div>

        {/* Booking CTA + contact */}
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
            <li className="flex items-center gap-2 break-all"><span>🔗</span>{profileUrl}</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({
  onClick, disabled, icon, label, tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: string;
  label: string;
  tone?: "primary" | "default" | "green";
}) {
  const cls = tone === "primary"
    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md hover:-translate-y-0.5 hover:shadow-lg"
    : tone === "green"
      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md hover:-translate-y-0.5"
      : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      <span>{icon}</span>{label}
    </button>
  );
}
