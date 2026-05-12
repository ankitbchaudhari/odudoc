"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { SYMPTOMS } from "@/lib/seo/symptoms";

/* Inline icon set so we don't pull a heavy icon lib just for four social
   glyphs. All 24x24 viewBox, currentColor-driven for hover transitions. */
function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7.5h2.55l.39-3h-2.94V8.55c0-.87.24-1.47 1.5-1.47H16.5V4.41C16.05 4.35 15.18 4.2 14.16 4.2c-2.13 0-3.6 1.29-3.6 3.69v2.61H8v3h2.55V21h2.95Z"/>
    </svg>
  );
}
function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M17.7 3h3.05l-6.66 7.61L22 21h-6.14l-4.81-6.29L5.55 21H2.5l7.13-8.14L2 3h6.3l4.35 5.75L17.7 3Zm-1.07 16.2h1.69L7.46 4.7H5.65l10.98 14.5Z"/>
    </svg>
  );
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.83v1.65h.05c.53-1 1.84-2.05 3.79-2.05 4.05 0 4.8 2.66 4.8 6.13V21h-4v-5.7c0-1.36-.03-3.1-1.9-3.1-1.9 0-2.19 1.48-2.19 3v5.8h-4V9Z"/>
    </svg>
  );
}

const SOCIALS = [
  { name: "Facebook", url: "#", Icon: FacebookIcon, brand: "hover:bg-[#1877F2]" },
  { name: "Twitter", url: "#", Icon: TwitterIcon, brand: "hover:bg-black" },
  { name: "Instagram", url: "#", Icon: InstagramIcon, brand: "hover:bg-gradient-to-tr hover:from-[#feda75] hover:via-[#d62976] hover:to-[#4f5bd5]" },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/company/115797909/",
    Icon: LinkedInIcon,
    brand: "hover:bg-[#0A66C2]",
  },
];

export default function Footer() {
  const { t } = useLanguage();

  const footerSections = [
    {
      title: "OduDoc",
      links: [
        { label: t("nav.about"), href: "/about" },
        { label: t("nav.blog"), href: "/blog" },
        { label: "Careers", href: "/careers" },
        { label: t("nav.contact"), href: "/contact" },
      ],
    },
    {
      title: t("footer.forPatients"),
      links: [
        { label: t("footer.findDoctors"), href: "/doctors" },
        { label: "Doctors A–Z", href: "/doctors-az" },
        { label: t("footer.videoConsult"), href: "/consult" },
        { label: "Symptoms A–Z", href: "/symptoms" },
        { label: "Conditions A–Z", href: "/conditions" },
        { label: "Medical Glossary", href: "/glossary" },
        { label: "Compare", href: "/compare" },
        { label: t("footer.surgeries"), href: "/surgeries" },
        { label: t("footer.healthArticles"), href: "/blog" },
        { label: t("nav.gallery"), href: "/gallery" },
      ],
    },
    {
      title: t("footer.forDoctors"),
      links: [
        { label: "OduDoc Profile", href: "/for-doctors" },
        { label: "Doctor's guide", href: "/for-doctors/guide" },
        { label: "For Corporates", href: "/corporate" },
        { label: "Your Pharmacy on OduDoc", href: "/sell" },
        { label: "OduDoc AI", href: "/ray" },
      ],
    },
    {
      title: t("footer.more"),
      links: [
        { label: t("footer.help"), href: "/help" },
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
        { label: "Refund & Cancellation", href: "/refund-policy" },
        { label: "Legal & Compliance", href: "/legal" },
        { label: t("footer.directory"), href: "/directory" },
        { label: t("footer.wiki"), href: "/wiki" },
      ],
    },
  ];

  return (
    <footer className="relative isolate overflow-hidden bg-gray-950 text-gray-300">
      {/* Soft glow accents in the background — subtle, brand-aligned, no
          performance cost (pure CSS gradients). Adds the "modern dark
          dashboard" feel without screaming. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -top-40 left-1/2 h-[420px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-gradient-to-tl from-emerald-500/10 to-transparent blur-3xl" />
      </div>

      {/* SEO internal-link rails — top specialties + cities. Now in
          glassy "chip" tiles with a header divider so they don't
          collide visually with the link columns below. */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            {[
              {
                heading: "Popular specialties",
                items: SPECIALTIES.map((s) => ({
                  label: s.displayName,
                  href: `/specialty/${s.slug}`,
                })),
              },
              {
                heading: "Common symptoms",
                items: SYMPTOMS.map((s) => ({
                  label: s.name,
                  href: `/symptoms/${s.slug}`,
                })),
              },
              {
                heading: "Popular cities",
                items: CITIES.map((c) => ({
                  label: c.displayName,
                  href: `/doctors-in/${c.slug}`,
                })),
              },
            ].map((col) => (
              <div key={col.heading}>
                <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                  <span className="h-1 w-6 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                  {col.heading}
                </h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {col.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA strip — a quick "talk to a doctor / list your practice" rail
          that gives the dark band visual weight and a clear call-to-action
          without dominating the footer. */}
      <div className="border-b border-white/5">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:px-8">
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 p-6 transition hover:border-cyan-400/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              For patients
            </p>
            <h4 className="mt-1 text-xl font-bold text-white">
              Talk to a doctor in minutes
            </h4>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
              Verified specialists. Secure video. Prescriptions delivered.
            </p>
            <Link
              href="/doctors"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:shadow-cyan-500/30"
            >
              Find a doctor
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 p-6 transition hover:border-emerald-400/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              For doctors
            </p>
            <h4 className="mt-1 text-xl font-bold text-white">
              Grow your practice on OduDoc
            </h4>
            <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
              Free profile. Smart scheduling. Stripe payouts worldwide.
            </p>
            <Link
              href="/for-doctors"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:shadow-emerald-500/30"
            >
              List your practice
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Link columns. Tighter typography + accent dot on hover gives
          the columns a "modern dashboard" rather than "wall of text"
          feel. */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                <span className="h-1 w-5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500 transition-colors hover:text-white"
                    >
                      <span className="h-px w-0 bg-cyan-400 transition-all group-hover:w-3" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom rail — socials + copyright with subtle gradient divider. */}
        <div className="relative mt-14 pt-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex gap-3">
              {SOCIALS.map(({ name, url, Icon, brand }) => (
                <a
                  key={name}
                  href={url}
                  target={url === "#" ? undefined : "_blank"}
                  rel={url === "#" ? undefined : "noopener noreferrer"}
                  aria-label={name}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 dark:text-slate-500 transition hover:-translate-y-0.5 hover:text-white ${brand}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-slate-400">
              &copy; {new Date().getFullYear()} OduDoc.{" "}
              <span className="text-gray-400 dark:text-slate-500">{t("footer.rights")}</span>
              <span className="mx-2 text-gray-700 dark:text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                All systems operational
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
