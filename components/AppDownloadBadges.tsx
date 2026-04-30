// App Store / Play Store badges.
//
// We point at the canonical public URLs using the Android package
// names already configured in app.json + the website's universal-link
// short paths. Until both apps are live in the stores, the Play
// Store URL will 404 and iOS uses /p or /d fallback. After publish:
//   - Drop the real Apple App Store IDs into APP_STORE_IDS below.
//   - Bump the badge state to "live".

import Link from "next/link";

type Variant = "patient" | "doctor";

interface Props {
  variant: Variant;
  /** "compact" hides the heading + subtitle and just renders the badges. */
  layout?: "default" | "compact";
  /** Optional override for the surrounding heading copy. */
  title?: string;
  subtitle?: string;
  /** Tailwind colour token used for the gradient backdrop. */
  tone?: "primary" | "indigo" | "slate";
  className?: string;
}

const PACKAGES: Record<Variant, { android: string; ios: string }> = {
  patient: {
    android: "https://play.google.com/store/apps/details?id=com.odudoc.patient",
    // TODO: replace with the live App Store URL once the app is approved.
    ios: "https://apps.apple.com/app/odudoc-patient/id0000000000",
  },
  doctor: {
    android: "https://play.google.com/store/apps/details?id=com.odudoc.doctor",
    // TODO: replace with the live App Store URL once the app is approved.
    ios: "https://apps.apple.com/app/odudoc-doctor/id0000000000",
  },
};

const DEFAULT_TITLES: Record<Variant, { title: string; subtitle: string }> = {
  patient: {
    title: "Get the OduDoc app",
    subtitle:
      "Book consultations, video-call your doctor, and read prescriptions on the go.",
  },
  doctor: {
    title: "Practice on the go with OduDoc for Doctors",
    subtitle:
      "Run consultations, write prescriptions with AI, and manage your schedule from your phone.",
  },
};

export default function AppDownloadBadges({
  variant,
  layout = "default",
  title,
  subtitle,
  tone = "primary",
  className = "",
}: Props) {
  const links = PACKAGES[variant];
  const copy = DEFAULT_TITLES[variant];
  const heading = title ?? copy.title;
  const sub = subtitle ?? copy.subtitle;

  const toneGradient =
    tone === "indigo"
      ? "from-indigo-600 via-violet-600 to-fuchsia-600"
      : tone === "slate"
        ? "from-slate-700 via-slate-800 to-slate-900"
        : "from-primary-600 via-teal-600 to-emerald-600";

  const Badges = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link
        href={links.ios}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download OduDoc ${variant} app on the App Store`}
        className="group flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.564 12.553c-.022-2.404 1.965-3.557 2.054-3.613-1.118-1.635-2.857-1.858-3.476-1.884-1.48-.15-2.886.871-3.638.871-.751 0-1.91-.849-3.139-.825-1.616.024-3.106.943-3.937 2.392-1.677 2.91-.428 7.215 1.21 9.578.802 1.156 1.76 2.453 3.013 2.407 1.21-.049 1.668-.781 3.131-.781 1.464 0 1.875.781 3.155.755 1.302-.024 2.128-1.18 2.927-2.34.92-1.345 1.299-2.65 1.323-2.717-.029-.013-2.541-.975-2.563-3.843zm-2.396-7.062c.667-.81 1.117-1.93.994-3.05-.961.04-2.124.64-2.812 1.45-.617.717-1.156 1.86-1.011 2.957 1.07.084 2.16-.547 2.829-1.357z" />
        </svg>
        <div className="leading-tight">
          <p className="text-[10px] uppercase tracking-wider text-white/70">Download on the</p>
          <p className="text-base font-semibold">App Store</p>
        </div>
      </Link>

      <Link
        href={links.android}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Get OduDoc ${variant} app on Google Play`}
        className="group flex items-center gap-3 rounded-xl bg-black px-5 py-3 text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
      >
        <svg className="h-7 w-7" viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id="gp1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00C3FF" />
              <stop offset="1" stopColor="#1A73E8" />
            </linearGradient>
            <linearGradient id="gp2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFE000" />
              <stop offset="1" stopColor="#FFBD00" />
            </linearGradient>
            <linearGradient id="gp3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FF3A44" />
              <stop offset="1" stopColor="#C31162" />
            </linearGradient>
            <linearGradient id="gp4" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#00A170" />
              <stop offset="1" stopColor="#00F076" />
            </linearGradient>
          </defs>
          <path d="M3.6 1.5c-.3.3-.5.8-.5 1.4v18.2c0 .6.2 1.1.5 1.4l11-11-11-10z" fill="url(#gp1)" />
          <path d="M14.6 12.5l3.4-3.4 4.4 2.5c.9.5.9 1.8 0 2.4l-4.4 2.5-3.4-3.4z" fill="url(#gp2)" />
          <path d="M14.6 12.5l-11 11c.4.4 1 .4 1.7 0l13.7-7.6-4.4-3.4z" fill="url(#gp3)" />
          <path d="M14.6 12.5l-11-11c.4-.3 1-.4 1.7 0l13.7 7.6-4.4 3.4z" fill="url(#gp4)" />
        </svg>
        <div className="leading-tight">
          <p className="text-[10px] uppercase tracking-wider text-white/70">Get it on</p>
          <p className="text-base font-semibold">Google Play</p>
        </div>
      </Link>
    </div>
  );

  if (layout === "compact") {
    return <div className={className}>{Badges}</div>;
  }

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${toneGradient} px-6 py-10 text-white shadow-xl sm:px-10 ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-white/20">
          📱 Mobile app
        </span>
        <h3 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h3>
        <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">{sub}</p>
        <div className="mt-6">{Badges}</div>
      </div>
    </section>
  );
}
