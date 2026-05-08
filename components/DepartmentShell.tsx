// Shared dashboard shell for department-specific consoles
// (radiology, laboratory, biomedical, inventory, etc).
//
// Wraps the gradient hero + KPI tile row + content area in one
// reusable component so each department page can be lean and
// visually consistent.

import Link from "next/link";

interface DepartmentShellProps {
  /** Eyebrow label shown above the title, e.g. "Hospital · Radiology". */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Tailwind gradient class names — pass like "from-X via-Y to-Z". */
  gradient: string;
  /** Optional emoji glyph stamped inside the hero. */
  glyph?: string;
  /** Right-side actions in the hero (refresh button, primary CTA). */
  actions?: React.ReactNode;
  /** Quick links rendered as small chips beneath the hero. */
  quickLinks?: Array<{ label: string; href: string; emoji?: string }>;
  children: React.ReactNode;
}

export default function DepartmentShell({
  eyebrow,
  title,
  subtitle,
  gradient,
  glyph,
  actions,
  quickLinks,
  children,
}: DepartmentShellProps) {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-white`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className={`relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 text-white shadow-xl`}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
                {glyph && <span className="mr-1.5">{glyph}</span>}
                {eyebrow}
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
              <p className="mt-2 max-w-xl text-sm text-white/90">{subtitle}</p>
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
          </div>
        </div>

        {quickLinks && quickLinks.length > 0 && (
          <nav className="mb-6 flex flex-wrap gap-2">
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
              >
                {l.emoji && <span>{l.emoji}</span>}
                {l.label}
              </Link>
            ))}
          </nav>
        )}

        {children}
      </div>
    </div>
  );
}

/** Single KPI tile used inside DepartmentShell content areas. */
export function StatTile({
  label,
  value,
  emoji,
  tone = "indigo",
  hint,
}: {
  label: string;
  value: string | number;
  emoji?: string;
  tone?: "indigo" | "sky" | "violet" | "fuchsia" | "amber" | "emerald" | "rose" | "cyan" | "teal";
  hint?: string;
}) {
  const palette: Record<string, { ring: string; bg: string; text: string }> = {
    indigo:  { ring: "ring-indigo-100",  bg: "bg-gradient-to-br from-indigo-50 to-white",   text: "text-indigo-700" },
    sky:     { ring: "ring-sky-100",     bg: "bg-gradient-to-br from-sky-50 to-white",      text: "text-sky-700" },
    violet:  { ring: "ring-violet-100",  bg: "bg-gradient-to-br from-violet-50 to-white",   text: "text-violet-700" },
    fuchsia: { ring: "ring-fuchsia-100", bg: "bg-gradient-to-br from-fuchsia-50 to-white",  text: "text-fuchsia-700" },
    amber:   { ring: "ring-amber-100",   bg: "bg-gradient-to-br from-amber-50 to-white",    text: "text-amber-700" },
    emerald: { ring: "ring-emerald-100", bg: "bg-gradient-to-br from-emerald-50 to-white",  text: "text-emerald-700" },
    rose:    { ring: "ring-rose-100",    bg: "bg-gradient-to-br from-rose-50 to-white",     text: "text-rose-700" },
    cyan:    { ring: "ring-cyan-100",    bg: "bg-gradient-to-br from-cyan-50 to-white",     text: "text-cyan-700" },
    teal:    { ring: "ring-teal-100",    bg: "bg-gradient-to-br from-teal-50 to-white",     text: "text-teal-700" },
  };
  const t = palette[tone];
  return (
    <div className={`rounded-2xl p-5 shadow-sm ring-1 ${t.ring} ${t.bg}`}>
      <div className="flex items-center justify-between">
        {emoji && <span className="text-lg">{emoji}</span>}
        <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${t.text}`}>{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
