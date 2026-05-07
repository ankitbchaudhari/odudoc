"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import Logo from "@/components/Logo";
import { SPECIALTIES } from "@/lib/seo/specialties";
import { CITIES } from "@/lib/seo/cities";
import { SYMPTOMS } from "@/lib/seo/symptoms";

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
        { label: "Legal & Compliance", href: "/legal" },
        { label: t("footer.directory"), href: "/directory" },
        { label: t("footer.wiki"), href: "/wiki" },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* SEO internal-link rails — top specialties + cities. Cheap, boring,
          and enormously effective for long-tail rankings. */}
      <div className="border-b border-gray-800 bg-gray-950/60">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Popular specialties
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {SPECIALTIES.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/specialty/${s.slug}`}
                    className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-primary-600 hover:text-white"
                  >
                    {s.displayName}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Common symptoms
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {SYMPTOMS.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/symptoms/${s.slug}`}
                    className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-primary-600 hover:text-white"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Popular cities
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {CITIES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/doctors-in/${c.slug}`}
                    className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300 transition-colors hover:bg-primary-600 hover:text-white"
                  >
                    {c.displayName}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm transition-colors hover:text-primary-400"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social & Bottom */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 md:flex-row">
          <div className="inline-flex items-center rounded-xl bg-white px-4 py-2 shadow-sm">
            <Logo size="md" />
          </div>

          <div className="flex gap-4">
            {[
              { name: "Facebook", url: "#", letter: "f" },
              { name: "Twitter", url: "#", letter: "X" },
              { name: "Instagram", url: "#", letter: "i" },
              { name: "LinkedIn", url: "https://www.linkedin.com/company/115797909/", letter: "in" },
            ].map((s) => (
              <a
                key={s.name}
                href={s.url}
                target={s.url === "#" ? undefined : "_blank"}
                rel={s.url === "#" ? undefined : "noopener noreferrer"}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xs font-bold text-gray-400 transition-colors hover:bg-primary-600 hover:text-white"
                aria-label={s.name}
              >
                {s.letter}
              </a>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} OduDoc. {t("footer.rights")}
          </p>
        </div>

        {/* Merchant disclosure — required by Indian payment gateways
            (Razorpay / IndusPays / PayU / Cashfree) for KYC sign-off.
            Keep this visible site-wide; the /legal page has the full
            statutory listing. */}
        <div className="mt-8 border-t border-gray-800 pt-6 text-center text-xs leading-5 text-gray-500">
          <p>
            Payments processed by{" "}
            <span className="font-medium text-gray-300">
              SARJUDAS DIGITAL TRADING AND ESCROW SERVICES PRIVATE LIMITED
            </span>
            {" "}· CIN U52520GJ2019PTC109503 · GSTIN 24ABCCS4962M1ZY
          </p>
          <p className="mt-1">
            Registered office: A-1002, 10th Floor, Aakash Pruthhvi, Vadod, Majura, Pandesara, Surat, Gujarat 394221, India ·{" "}
            <Link href="/legal" className="text-primary-400 hover:underline">
              Full legal details
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
