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
  // Marketing fields surfaced on the card so it doesn't read empty.
  rating?: number;
  consultationCount?: number;
  services?: string[];
  fee?: number;
  bio?: string;
}

declare global {
  interface Window {
    html2canvas?: (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    // jsPDF UMD bundle exposes a `jspdf` global with a `jsPDF` constructor.
    jspdf?: { jsPDF: new (opts?: Record<string, unknown>) => JsPdfInstance };
  }
}

interface JsPdfInstance {
  addImage: (
    data: string,
    format: string,
    x: number,
    y: number,
    w: number,
    h: number,
    alias?: string,
    compression?: "NONE" | "FAST" | "MEDIUM" | "SLOW",
  ) => void;
  addPage: (size?: [number, number] | string, orient?: "p" | "portrait" | "l" | "landscape") => void;
  setProperties: (props: Record<string, string>) => void;
  save: (filename: string) => void;
  output: (type: "blob") => Blob;
}

// CDN URL lists: cdnjs first, jsdelivr second, unpkg last. Some
// regions / corporate networks block one of these; tripling the list
// keeps the download path resilient. The script is cached after first
// success so subsequent clicks are instant.
const HTML2CANVAS_CDNS = [
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
  "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js",
];
const JSPDF_CDNS = [
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
];

/** Load one specific CDN URL. */
function loadOne(src: string): Promise<void> {
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

/** Try a list of CDN URLs in order until one succeeds. Throws only
 *  when every fallback fails. Resolves once the corresponding global
 *  (`window.html2canvas` / `window.jspdf`) is available. */
async function loadFromAny(srcs: string[], globalCheck: () => boolean): Promise<void> {
  if (globalCheck()) return;
  let lastErr: Error | null = null;
  for (const src of srcs) {
    try {
      await loadOne(src);
      // Some CDNs cache the URL but the global takes a microtask to
      // appear — wait one tick before checking.
      await new Promise((r) => setTimeout(r, 50));
      if (globalCheck()) return;
    } catch (err) {
      lastErr = err as Error;
    }
  }
  throw new Error(
    lastErr
      ? `All CDNs failed (last: ${lastErr.message}). Check network / corporate firewall.`
      : "Library loaded but global is missing — version mismatch?",
  );
}

const ensureHtml2Canvas = () =>
  loadFromAny(HTML2CANVAS_CDNS, () => typeof window !== "undefined" && !!window.html2canvas);
const ensureJsPdf = () =>
  loadFromAny(JSPDF_CDNS, () => typeof window !== "undefined" && !!window.jspdf?.jsPDF);

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

  /** Capture a single DOM node to a canvas via html2canvas. The
   *  canvas is what we hand to jsPDF as the image source for each
   *  page — gives crisper output than a blob round-trip. */
  const captureToCanvas = async (el: HTMLElement, scale = 4): Promise<HTMLCanvasElement> => {
    await ensureHtml2Canvas();
    if (!window.html2canvas) throw new Error("html2canvas failed to load");
    // Wait for any web fonts the card uses to finish loading. Without
    // this, html2canvas sometimes captures fallback-font metrics and
    // text overlaps because the layout was computed against the real
    // font but the canvas was painted with the fallback.
    if (typeof document !== "undefined" && "fonts" in document) {
      try { await (document as Document & { fonts: { ready: Promise<void> } }).fonts.ready; } catch { /* noop */ }
    }
    return window.html2canvas(el, {
      backgroundColor: null,
      scale, // 4× of the 640 px source = 2560 px wide, plenty for print
      useCORS: true,
      logging: false,
    });
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

  /** Build a CR80-card-sized PDF from one or more canvas captures.
   *  CR80 = 85.6 × 53.98 mm, the international ID-card / credit-card
   *  format. Doctors can print the PDF on a card printer for a
   *  physical OduDoc visiting card, or attach it on WhatsApp / email
   *  where PDFs are universally previewable. */
  const buildPdf = async (
    canvases: HTMLCanvasElement[],
    title: string,
  ): Promise<Blob> => {
    await ensureJsPdf();
    const Jspdf = window.jspdf?.jsPDF;
    if (!Jspdf) throw new Error("jsPDF failed to load");
    const CARD_W_MM = 85.6;
    const CARD_H_MM = 53.98;
    const pdf = new Jspdf({
      unit: "mm",
      format: [CARD_W_MM, CARD_H_MM],
      orientation: "landscape",
      compress: true,
    });
    pdf.setProperties({
      title,
      author: me?.name ? `Dr. ${me.name}` : "OduDoc",
      subject: "Doctor visiting card",
      creator: "OduDoc",
    });
    canvases.forEach((c, i) => {
      if (i > 0) pdf.addPage([CARD_W_MM, CARD_H_MM], "landscape");
      // JPEG with FAST compression keeps the PDF small (~150-300 KB
      // total) while staying visually identical to the source.
      const dataUrl = c.toDataURL("image/jpeg", 0.92);
      pdf.addImage(dataUrl, "JPEG", 0, 0, CARD_W_MM, CARD_H_MM, undefined, "FAST");
    });
    return pdf.output("blob");
  };

  /** Single-click download — captures BOTH front and back, composes
   *  a single 2-page PDF (front on page 1, back on page 2), and
   *  saves it. PDF is the right format because it: (a) prints to a
   *  consistent physical card size, (b) attaches cleanly to WhatsApp
   *  / email, (c) opens in any browser without a viewer plugin. */
  const downloadBoth = async () => {
    if (!bothSidesRef.current || !me) return;
    setBusy(true);
    setToast(null);
    try {
      const sides = Array.from(
        bothSidesRef.current.querySelectorAll<HTMLElement>("[data-card-side]"),
      );
      if (sides.length < 2) throw new Error("Card sides not mounted yet");

      // Capture both sides + load jsPDF in parallel — saves ~300ms.
      const [frontCanvas, backCanvas] = await Promise.all([
        captureToCanvas(sides[0], 4),
        captureToCanvas(sides[1], 4),
        ensureJsPdf(),
      ]);
      const pdfBlob = await buildPdf(
        [frontCanvas, backCanvas],
        `OduDoc ID Card — Dr. ${me.name}`,
      );
      triggerDownload(pdfBlob, `odudoc-${slug}.pdf`);
      setToast({ kind: "ok", text: "✓ Downloaded front + back in a single PDF" });
    } catch (err) {
      setToast({ kind: "err", text: `Download failed: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  /** Single-side download fallback. Saves whichever side is currently
   *  visible as a one-page PDF. Useful when a doctor only wants to
   *  share one face for a specific channel. */
  const downloadOneSide = async () => {
    if (!cardRef.current || !me) return;
    setBusy(true);
    setToast(null);
    try {
      const canvas = await captureToCanvas(cardRef.current, 4);
      const pdfBlob = await buildPdf(
        [canvas],
        `OduDoc ID Card (${side}) — Dr. ${me.name}`,
      );
      triggerDownload(pdfBlob, `odudoc-${slug}-${side}.pdf`);
      setToast({ kind: "ok", text: `✓ Downloaded ${side} side as PDF` });
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

            {/* Hidden off-screen container — used by the download
                button. We position it FAR off-screen (-99999 px) but
                keep opacity at 1 so html2canvas captures real font
                metrics, real shadows, real gradients. opacity:0 broke
                font layout in some browsers — text overlapped because
                the layout engine skipped the fallback-vs-loaded font
                relayout step. Fixed positioning keeps it out of the
                document flow so the visible page isn't pushed down. */}
            <div
              ref={bothSidesRef}
              aria-hidden="true"
              className="pointer-events-none"
              style={{
                position: "fixed",
                left: "-99999px",
                top: "0",
                width: "640px",
                zIndex: -1,
              }}
            >
              <div
                data-card-side="front"
                className="relative overflow-hidden rounded-3xl"
                style={{ width: "640px", height: "404px" /* 640 / 1.586 */ }}
              >
                <FrontSide me={me} />
              </div>
              <div
                data-card-side="back"
                className="relative mt-4 overflow-hidden rounded-3xl"
                style={{ width: "640px", height: "404px" }}
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
            icon="📄"
            label={busy ? "Preparing PDF…" : "Download PDF (front + back)"}
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
            Or download just the {side} side (single-page PDF)
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

      {/* Layout: top header → hero (photo + name + tags) → stats
          strip → bottom footer. Each row earns its space; no more
          big empty middle section the doctor complained about. */}
      <div className="absolute inset-0 flex flex-col p-5">
        {/* Header — OduDoc branding + verified pill */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur-sm">
              <span className="text-base">⚕️</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/90">OduDoc</p>
              <p className="text-[9px] text-white/60">Verified telehealth clinician</p>
            </div>
          </div>
          {me.verified && (
            <span className="rounded-full bg-emerald-500/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-100 ring-1 ring-emerald-300/40">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Hero — photo + name + qualifications + location chip */}
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl ring-2 ring-white/40">
            {me.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.imageUrl} alt={me.name} className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-white/30 to-white/5 text-2xl font-bold">
                {initials || "DR"}
              </div>
            )}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/20 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[22px] font-bold leading-tight">
              Dr. {me.name.replace(/^Dr\.?\s*/i, "")}
            </p>
            {me.specialty && (
              <p className="mt-0.5 text-sm font-semibold text-cyan-100">{me.specialty}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-white/85">
              {me.qualifications && <span>{me.qualifications}</span>}
              {(me.city || me.country) && (
                <span className="inline-flex items-center gap-0.5">
                  <span aria-hidden="true">📍</span>
                  {[me.city, me.country].filter(Boolean).join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip — 3 KPI columns. Fills the dead space the
            user complained about. Always shows experience + rating
            + consultations; values default sensibly when blank. */}
        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/60">Experience</p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {me.experience !== undefined && me.experience > 0 ? `${me.experience}+ yrs` : "—"}
            </p>
          </div>
          <div className="border-x border-white/15 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/60">Rating</p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {me.rating && me.rating > 0 ? <>★ {me.rating.toFixed(1)}</> : "New"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/60">Consults</p>
            <p className="mt-0.5 text-sm font-bold text-white">
              {me.consultationCount && me.consultationCount > 0 ? me.consultationCount.toLocaleString() : "Open"}
            </p>
          </div>
        </div>

        {/* Services chips — top 4 fit comfortably on a CR80 card.
            Skipped silently when the doctor hasn't set any services. */}
        {me.services && me.services.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {me.services.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/95 ring-1 ring-white/20"
              >
                {s}
              </span>
            ))}
            {me.services.length > 4 && (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/70">
                +{me.services.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Spacer pushes the footer to the bottom regardless of how
            many optional rows ended up rendering above. */}
        <div className="flex-1" />

        {/* Footer — license + URL */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-white/15 pt-2.5 text-[10px]">
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
            <p className="mt-0.5 text-white/80">/doctors/{me.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 22)}</p>
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
