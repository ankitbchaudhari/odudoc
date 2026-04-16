"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import Logo from "@/components/Logo";

export default function Footer() {
  const { t } = useLanguage();

  const footerSections = [
    {
      title: "OduDoc",
      links: [
        { label: t("nav.about"), href: "/about" },
        { label: t("nav.blog"), href: "/blog" },
        { label: "Careers", href: "/careers" },
        { label: "Press", href: "/press" },
        { label: t("nav.contact"), href: "/contact" },
      ],
    },
    {
      title: t("footer.forPatients"),
      links: [
        { label: t("footer.findDoctors"), href: "/doctors" },
        { label: t("footer.videoConsult"), href: "/consult" },
        { label: t("footer.labTests"), href: "/tests" },
        { label: t("footer.surgeries"), href: "/surgeries" },
        { label: t("footer.healthArticles"), href: "/blog" },
        { label: t("nav.gallery"), href: "/gallery" },
      ],
    },
    {
      title: t("footer.forDoctors"),
      links: [
        { label: "OduDoc Profile", href: "/for-doctors" },
        { label: "For Clinics", href: "/for-clinics" },
        { label: "Ray by OduDoc", href: "/ray" },
        { label: "OduDoc Reach", href: "/reach" },
        { label: "OduDoc Drive", href: "/drive" },
      ],
    },
    {
      title: t("footer.more"),
      links: [
        { label: t("footer.help"), href: "/help" },
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
        { label: t("footer.directory"), href: "/directory" },
        { label: t("footer.wiki"), href: "/wiki" },
      ],
    },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
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
          <Logo size="md" />

          <div className="flex gap-4">
            {["Facebook", "Twitter", "Instagram", "LinkedIn"].map((s) => (
              <a
                key={s}
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-xs text-gray-400 transition-colors hover:bg-primary-600 hover:text-white"
                aria-label={s}
              >
                {s[0]}
              </a>
            ))}
          </div>

          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} OduDoc. {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
