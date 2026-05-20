"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
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

  // Spec: Header_Footer_Final Section 4 / Cowork_Complete Section 4.
  // Three informational columns (Company, Resources, Legal). Feature
  // navigation has moved into header dropdowns — the footer is brand
  // + informational only. Zero auth buttons.
  const footerSections = [
    {
      title: "Company",
      links: [
        { label: t("nav.about"), href: "/about" },
        { label: t("nav.blog"), href: "/blog" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
        { label: t("nav.contact"), href: "/contact" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Help centre", href: "/help" },
        { label: "Documentation", href: "/docs" },
        { label: "Health wiki", href: "/wiki" },
        { label: "Healthcare directory", href: "/directory" },
        { label: "OduDoc AI", href: "/features" },
        { label: "Changelog", href: "/changelog" },
        { label: "Status", href: "/status" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy policy", href: "/privacy" },
        { label: "Terms of service", href: "/terms" },
        { label: "Compliance", href: "/legal" },
        { label: "Refund policy", href: "/refund-policy" },
        { label: "Cookie settings", href: "/legal/cookies" },
        { label: "Data processing", href: "/legal/dpa" },
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

      {/* Link columns — spec layout: Brand (wider) + Company + Resources + Legal.
          Feature navigation lives in header dropdowns now; footer is
          informational only. */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          {/* Brand column — wider on lg+ per spec. */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            {/* Canonical logo component. Footer sits on a dark slate
                background so we force the "dark" variant (white
                wordmark) — auto-mode would pick light because the
                document root may still be in light mode. */}
            <Logo size="md" variant="dark" />
            <p className="mt-4 max-w-xs text-sm text-gray-400">
              The worldwide healthcare operating system. One patient record across
              doctors, hospitals, labs, pharmacies, and insurance.
            </p>
            <div className="mt-5 flex gap-3">
              {SOCIALS.map(({ name, url, Icon, brand }) => (
                <a
                  key={name}
                  href={url}
                  target={url === "#" ? undefined : "_blank"}
                  rel={url === "#" ? undefined : "noopener noreferrer"}
                  aria-label={name}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition hover:-translate-y-0.5 hover:text-white ${brand}`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

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
                      className="group inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
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

        {/* Legal strip — copyright on the left, status pill on the right.
            Socials moved into the Brand column above, per spec. */}
        <div className="relative mt-14 pt-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
          />
          <div className="flex flex-col items-center justify-between gap-3 text-xs text-gray-500 md:flex-row">
            <div>
              <p>
                &copy; {new Date().getFullYear()} Sarjudas Digital Trading and Escrow Services LLC.{" "}
                <span className="text-gray-400">{t("footer.rights")}</span>
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                OduDoc is a brand operated by Sarjudas Digital Trading and Escrow Services LLC.
              </p>
            </div>
            <a
              href="/status"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-gray-300 transition hover:text-white"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              All systems operational
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
