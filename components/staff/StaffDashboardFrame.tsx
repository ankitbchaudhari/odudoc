"use client";

// Shared scaffold for every V5 §5 staff dashboard.
//
// Each role's page.tsx invokes <StaffDashboardFrame> with role-
// specific config. This keeps branding consistent (V4 logo +
// wordmark + V5 §4.1 role colour) and means one bug-fix or visual
// tweak propagates to every dashboard at once.
//
// Layout (matches the Nurse dashboard at /dashboard/nurse, the
// reference V5 §5.4 ship):
//
//   ┌──────────────────────────────────────────────────────┐
//   │ [logo] OduDoc Pro · <Role>           <shift label>   │  ← chrome
//   ├──────────────────────────────────────────────────────┤
//   │ Welcome, <name>. <hero one-liner>                    │  ← hero
//   │ <hero sub>                                            │
//   │ [CTA buttons]                                         │
//   ├──────────────────────────────────────────────────────┤
//   │ <tile> <tile> <tile>                                  │  ← KPI tiles
//   │ <tile> <tile> <tile>                                  │
//   ├──────────────────────────────────────────────────────┤
//   │ Timeline (2/3) | Sidebar (1/3)                        │  ← working content
//   ├──────────────────────────────────────────────────────┤
//   │ Wallet · Scorecard · Near-miss                        │  ← V13 callouts
//   └──────────────────────────────────────────────────────┘
//
// The timeline + sidebar sections are role-defined. The chrome,
// hero shell, tile grid, and bottom callouts are shared.

import Link from "next/link";
import { useSession } from "next-auth/react";

export interface StaffTile {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone: "ok" | "watch" | "alert" | "info" | "premium";
}

export interface StaffDashboardConfig {
  /** V5 §5.x role label shown in the chrome and the hero greeting. */
  roleLabel: string;
  /** Solid hex from V5 §4.1 role colour table. */
  themeHex: string;
  /** Optional secondary hex for the hero gradient sweep. */
  accentHex?: string;
  /** Greeting line under "Welcome". */
  heroTitle: string;
  /** Two-line description shown under the hero title. */
  heroSub: string;
  /** Primary + secondary CTAs in the hero strip. */
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  /** KPI tiles — 6 is the sweet spot; the grid wraps at 3 per row. */
  tiles: StaffTile[];
  /** Two-column lower fold: timeline (2/3) + sidebar (1/3).
   *  Either can be omitted. */
  timeline?: React.ReactNode;
  sidebar?: React.ReactNode;
  /** Anything to render below the bottom callouts. */
  extra?: React.ReactNode;
}

const TONE_CLASSES = {
  ok:      { ring: "ring-emerald-300/30", glow: "from-emerald-400 to-emerald-600", num: "text-emerald-300" },
  watch:   { ring: "ring-amber-300/30",   glow: "from-amber-400 to-amber-600",     num: "text-amber-300" },
  alert:   { ring: "ring-rose-300/40",    glow: "from-rose-400 to-rose-600",       num: "text-rose-300" },
  info:    { ring: "ring-blue-300/30",    glow: "from-blue-400 to-blue-700",       num: "text-blue-300" },
  premium: { ring: "ring-amber-200/40",   glow: "from-[#C9A84C] to-[#854D0E]",     num: "text-amber-200" },
} as const;

export default function StaffDashboardFrame({ config }: { config: StaffDashboardConfig }) {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] || config.roleLabel.split(" ")[0];
  const shiftLabel = computeShiftLabel();
  const heroGradient = config.accentHex
    ? `linear-gradient(135deg, #020617 0%, #0c1532 60%, ${config.themeHex}33 100%)`
    : `linear-gradient(135deg, #020617 0%, #0c1532 60%, ${config.themeHex}33 100%)`;

  return (
    <div className="min-h-screen text-white" style={{ background: heroGradient }}>
      {/* Chrome — V4 cross logo + OduDoc Pro wordmark + role + shift */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="relative flex h-8 w-8 items-center justify-center rounded-xl shadow-lg"
              style={{ backgroundColor: config.themeHex }}
              aria-hidden
            >
              <span className="absolute h-[60%] w-[22%] rounded-sm bg-white" />
              <span className="absolute h-[22%] w-[60%] rounded-sm bg-white" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">
              OduDoc Pro <span className="font-medium text-white/50">· {config.roleLabel}</span>
            </span>
          </Link>
          <span className="text-xs font-semibold text-white/70">{shiftLabel}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-sm font-medium" style={{ color: `${config.themeHex}cc` }}>
            Welcome to your shift, {firstName}.
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{config.heroTitle}</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">{config.heroSub}</p>
          {(config.primaryCta || config.secondaryCta) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {config.primaryCta && (
                <Link
                  href={config.primaryCta.href}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${config.themeHex}, ${config.accentHex || config.themeHex})` }}
                >
                  {config.primaryCta.label}
                </Link>
              )}
              {config.secondaryCta && (
                <Link href={config.secondaryCta.href} className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15">
                  {config.secondaryCta.label}
                </Link>
              )}
              <Link href="/dashboard/near-miss" className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15">
                🛡️ Report near-miss
              </Link>
            </div>
          )}
        </section>

        {/* Tiles */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {config.tiles.map((t) => {
            const c = TONE_CLASSES[t.tone];
            const content = (
              <div className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 ring-1 ${c.ring} backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white/25`}>
                <div className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br ${c.glow} opacity-25 blur-2xl group-hover:opacity-50`} />
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">{t.label}</p>
                <p className={`mt-2 text-3xl font-extrabold ${c.num}`}>{t.value}</p>
                {t.sub && <p className="mt-1 text-xs text-white/60">{t.sub}</p>}
              </div>
            );
            return t.href ? <Link key={t.label} href={t.href}>{content}</Link> : <div key={t.label}>{content}</div>;
          })}
        </section>

        {/* Lower fold */}
        {(config.timeline || config.sidebar) && (
          <div className="grid gap-6 lg:grid-cols-3">
            {config.timeline && <section className="space-y-3 lg:col-span-2">{config.timeline}</section>}
            {config.sidebar && <section className="space-y-3">{config.sidebar}</section>}
          </div>
        )}

        {/* V13 callouts */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <ShortcutCard href="/dashboard/finance" icon="📊" title="Your wallet" sub="Pay, bonuses, deductions." />
          <ShortcutCard href="/api/scorecards" icon="📈" title="My scorecard" sub="Last 30 days · protocol adherence." />
          <ShortcutCard href="/dashboard/near-miss" icon="🛡️" title="Report near-miss" sub="No-blame · won't affect your score." />
        </section>

        {config.extra && <section className="mt-8">{config.extra}</section>}
      </main>
    </div>
  );
}

// ── Reusable building blocks for the timeline + sidebar slots ────

export function StaffPanel({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">{title}</h2>
        {right}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
        {children}
      </div>
    </>
  );
}

export function StaffRow({ time, who, what, tag }: { time?: string; who: string; what: string; tag?: { label: string; tone: "high" | "due" | "info" | "ok" | "watch" } }) {
  const TAG_PILL: Record<string, string> = {
    high:  "bg-rose-500/25 text-rose-200 border-rose-300/40",
    due:   "bg-amber-500/20 text-amber-200 border-amber-300/30",
    info:  "bg-blue-500/20 text-blue-200 border-blue-300/30",
    ok:    "bg-emerald-500/20 text-emerald-200 border-emerald-300/30",
    watch: "bg-purple-500/20 text-purple-200 border-purple-300/30",
  };
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]">
      {time && <span className="w-14 shrink-0 text-sm font-mono font-semibold text-white/80">{time}</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{who}</p>
        <p className="truncate text-xs text-white/60">{what}</p>
      </div>
      {tag && (
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG_PILL[tag.tone]}`}>
          {tag.label}
        </span>
      )}
    </li>
  );
}

export function StaffNote({ priority, body }: { priority: "alert" | "watch" | "info" | "ok"; body: string }) {
  const c = priority === "alert" ? "border-rose-300/60 bg-rose-500/10 text-rose-100"
    : priority === "watch" ? "border-amber-300/60 bg-amber-500/10 text-amber-100"
    : priority === "ok"    ? "border-emerald-300/60 bg-emerald-500/10 text-emerald-100"
    : "border-blue-300/40 bg-blue-500/10 text-blue-100";
  return <div className={`rounded-xl border px-3 py-2 text-sm ${c}`}>{body}</div>;
}

function ShortcutCard({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white/25">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="text-xs text-white/60">{sub}</p>
        </div>
      </div>
    </Link>
  );
}

function computeShiftLabel(): string {
  const h = new Date().getHours();
  if (h >= 7  && h < 14) return "Morning shift · 07:00–14:00";
  if (h >= 14 && h < 21) return "Evening shift · 14:00–21:00";
  return "Night shift · 21:00–07:00";
}
