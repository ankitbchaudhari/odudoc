"use client";

// Reusable admin-page chrome — gives the dozens of stat-grid pages
// (CTMS, Audit Log, AP, GL, AMSP, etc.) a consistent colourful look
// without touching the per-page table / form internals.
//
// Drop the existing page's title bar + stat cards and import these
// instead. Tone is opinionated: gradient hero, glass-morphism stat
// cards with per-tile colour accents, hover lift, animated empty
// state. Mobile-friendly (single-column at sm).

import Link from "next/link";

type Tone =
  | "indigo" | "emerald" | "rose" | "amber" | "violet"
  | "sky" | "teal" | "fuchsia" | "orange" | "slate";

const TONE: Record<Tone, { card: string; ring: string; numText: string; iconBg: string; }> = {
  indigo:   { card: "from-indigo-50 to-indigo-100/60",    ring: "ring-indigo-200/70",    numText: "text-indigo-700",    iconBg: "from-indigo-500 to-indigo-600" },
  emerald:  { card: "from-emerald-50 to-emerald-100/60",  ring: "ring-emerald-200/70",   numText: "text-emerald-700",   iconBg: "from-emerald-500 to-emerald-600" },
  rose:     { card: "from-rose-50 to-rose-100/60",        ring: "ring-rose-200/70",      numText: "text-rose-700",      iconBg: "from-rose-500 to-rose-600" },
  amber:    { card: "from-amber-50 to-amber-100/60",      ring: "ring-amber-200/70",     numText: "text-amber-700",     iconBg: "from-amber-500 to-orange-500" },
  violet:   { card: "from-violet-50 to-violet-100/60",    ring: "ring-violet-200/70",    numText: "text-violet-700",    iconBg: "from-violet-500 to-purple-600" },
  sky:      { card: "from-sky-50 to-sky-100/60",          ring: "ring-sky-200/70",       numText: "text-sky-700",       iconBg: "from-sky-500 to-cyan-500" },
  teal:     { card: "from-teal-50 to-teal-100/60",        ring: "ring-teal-200/70",      numText: "text-teal-700",      iconBg: "from-teal-500 to-emerald-500" },
  fuchsia:  { card: "from-fuchsia-50 to-fuchsia-100/60",  ring: "ring-fuchsia-200/70",   numText: "text-fuchsia-700",   iconBg: "from-fuchsia-500 to-pink-500" },
  orange:   { card: "from-orange-50 to-orange-100/60",    ring: "ring-orange-200/70",    numText: "text-orange-700",    iconBg: "from-orange-500 to-red-500" },
  slate:    { card: "from-slate-50 to-slate-100/60",      ring: "ring-slate-200/70",     numText: "text-slate-700",     iconBg: "from-slate-500 to-slate-600" },
};

interface PageHeroProps {
  /** Emoji or short icon string rendered in the gradient panel. */
  icon?: string;
  /** Eyebrow line above the title — usually one short word. */
  eyebrow?: string;
  title: string;
  /** Sub-heading line below the title — short bullet-style text. */
  subtitle?: string;
  /** Right-aligned primary action. Either a Link (href) or a button (onClick). */
  primaryAction?:
    | { label: string; href: string; onClick?: never }
    | { label: string; onClick: () => void; href?: never };
  /** Optional secondary action. */
  secondaryAction?:
    | { label: string; href: string; onClick?: never }
    | { label: string; onClick: () => void; href?: never };
  /** Background gradient — picks up the surrounding tone scheme. */
  tone?: "indigo" | "emerald" | "rose" | "amber" | "violet" | "fuchsia";
}

const HERO_GRADIENT: Record<NonNullable<PageHeroProps["tone"]>, string> = {
  indigo:  "from-indigo-600 via-purple-600 to-fuchsia-600",
  emerald: "from-emerald-600 via-teal-600 to-cyan-600",
  rose:    "from-rose-600 via-pink-600 to-fuchsia-600",
  amber:   "from-amber-500 via-orange-500 to-rose-500",
  violet:  "from-violet-600 via-purple-600 to-indigo-600",
  fuchsia: "from-fuchsia-600 via-pink-600 to-rose-600",
};

export function PageHero({ icon, eyebrow, title, subtitle, primaryAction, secondaryAction, tone = "indigo" }: PageHeroProps) {
  const grad = HERO_GRADIENT[tone];
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${grad} p-7 text-white shadow-xl shadow-slate-900/10`}>
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-black/10 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {(icon || eyebrow) && (
            <div className="flex items-center gap-2">
              {icon && <span className="text-2xl">{icon}</span>}
              {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/80">{eyebrow}</p>}
            </div>
          )}
          <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">{subtitle}</p>}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryAction && renderAction(secondaryAction, "secondary")}
            {primaryAction && renderAction(primaryAction, "primary")}
          </div>
        )}
      </div>
    </div>
  );
}

function renderAction(a: { label: string; href?: string; onClick?: () => void }, kind: "primary" | "secondary") {
  const cls = kind === "primary"
    ? "rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-900 shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
    : "rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-sm font-bold text-white backdrop-blur transition-colors hover:bg-white/20";
  if (a.href) return <Link href={a.href} className={cls}>{a.label}</Link>;
  return <button onClick={a.onClick} className={cls}>{a.label}</button>;
}

interface StatGridProps {
  /** Optional eyebrow above the grid — appears as a soft section header. */
  label?: string;
  children: React.ReactNode;
  /** Default 4-up; flips to flex-fit + scroll on small screens. */
  cols?: 3 | 4 | 5 | 6 | 7;
}

const COL_CLASS: Record<NonNullable<StatGridProps["cols"]>, string> = {
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-5",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  7: "sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7",
};

export function StatGrid({ label, children, cols = 4 }: StatGridProps) {
  return (
    <section>
      {label && (
        <div className="mb-3 flex items-baseline justify-between">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        </div>
      )}
      <div className={`grid grid-cols-1 gap-3 ${COL_CLASS[cols]}`}>{children}</div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  /** Tiny supplementary line under the value. */
  hint?: string;
  /** Color accent — picks the gradient + ring + value text colour. */
  tone?: Tone;
  /** Optional emoji-or-icon-string rendered in the corner puck. */
  icon?: string;
  /** Make the card a clickable Link. */
  href?: string;
  /** Or hand a click handler when it's not a navigation. */
  onClick?: () => void;
  /** Trend chip — green up / red down / amber flat. */
  trend?: { value: string; direction?: "up" | "down" | "flat" };
}

export function StatCard({ label, value, hint, tone = "indigo", icon, href, onClick, trend }: StatCardProps) {
  const t = TONE[tone];
  const inner = (
    <article className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.card} p-4 ring-1 ${t.ring} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}>
      {/* Decorative blob */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${t.iconBg} opacity-15 blur-xl transition-opacity group-hover:opacity-30`} />
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-600">{label}</p>
          {icon && (
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${t.iconBg} text-[13px] text-white shadow-sm`}>
              {icon}
            </span>
          )}
        </div>
        <p className={`mt-2 text-3xl font-extrabold tabular-nums ${t.numText}`}>{value}</p>
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          {hint && <span className="text-slate-500">{hint}</span>}
          {trend && (
            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              trend.direction === "up" ? "bg-emerald-100 text-emerald-700"
              : trend.direction === "down" ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700"
            }`}>
              {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "→"} {trend.value}
            </span>
          )}
        </div>
      </div>
    </article>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  if (onClick) return <button onClick={onClick} className="block w-full text-left">{inner}</button>;
  return inner;
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  body?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}

export function EmptyState({ icon = "📭", title, body, cta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-white to-slate-50/50 p-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 text-base font-bold text-slate-800">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {cta && (
        cta.href ? (
          <Link href={cta.href} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5">
            {cta.label}
          </Link>
        ) : (
          <button onClick={cta.onClick} className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5">
            {cta.label}
          </button>
        )
      )}
    </div>
  );
}

interface FilterChipProps {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  count?: number;
}

export function FilterChip({ active, onClick, children, count }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
        active
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30"
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300"
      }`}
    >
      {children}
      {count !== undefined && (
        <span className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
          {count}
        </span>
      )}
    </button>
  );
}

/** Sticky tab-style switcher used at the top of CTMS / AP / GL pages. */
interface TabSwitchProps {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onSelect: (key: string) => void;
}

export function TabSwitch({ tabs, active, onSelect }: TabSwitchProps) {
  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              isActive
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`rounded-full px-1.5 text-[10px] font-bold tabular-nums ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-600"}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
