import Link from "next/link";

const footerSections = [
  {
    title: "OduDoc",
    links: [
      { label: "About", href: "/about" },
      { label: "Blog", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "For Patients",
    links: [
      { label: "Find Doctors", href: "/doctors" },
      { label: "Video Consult", href: "/consult" },
      { label: "Lab Tests", href: "/tests" },
      { label: "Surgeries", href: "#" },
      { label: "Health Articles", href: "#" },
    ],
  },
  {
    title: "For Doctors",
    links: [
      { label: "OduDoc Profile", href: "#" },
      { label: "For Clinics", href: "#" },
      { label: "Ray by OduDoc", href: "#" },
      { label: "OduDoc Reach", href: "#" },
      { label: "OduDoc Drive", href: "#" },
    ],
  },
  {
    title: "More",
    links: [
      { label: "Help", href: "#" },
      { label: "Privacy Policy", href: "#" },
      { label: "Terms & Conditions", href: "#" },
      { label: "Healthcare Directory", href: "#" },
      { label: "OduDoc Health Wiki", href: "#" },
    ],
  },
];

export default function Footer() {
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
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white">
              O
            </span>
            <span className="text-lg font-bold text-white">
              Odu<span className="text-primary-400">Doc</span>
            </span>
          </div>

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
            &copy; {new Date().getFullYear()} OduDoc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
