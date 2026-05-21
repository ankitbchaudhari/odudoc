"use client";

// Nurse dashboard — V5 §5.4 of the Master Spec.
//
// Layout follows the V5 dashboard principle: at-a-glance shift state
// at the top, then four working-day surfaces — MAR (medication
// administration), vitals due, observation timers, and the bell
// queue. Below the fold: handover summary, supplies/restock, and
// near-miss / report-issue shortcuts.
//
// Theme: V5 §4.1 nurse colour is #1E40AF (clinical blue) — calmer
// than the doctor's navy.

import { useSession } from "next-auth/react";
import Link from "next/link";

interface Tile {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
  tone: "ok" | "watch" | "alert" | "info";
}

const NURSE_PRIMARY = "#1E40AF";

function toneClass(tone: Tile["tone"]) {
  switch (tone) {
    case "ok":    return { ring: "ring-emerald-300/30", glow: "from-emerald-400 to-emerald-600", num: "text-emerald-300" };
    case "watch": return { ring: "ring-amber-300/30",   glow: "from-amber-400 to-amber-600",     num: "text-amber-300" };
    case "alert": return { ring: "ring-rose-300/40",    glow: "from-rose-400 to-rose-600",       num: "text-rose-300" };
    case "info":  return { ring: "ring-blue-300/30",    glow: "from-blue-400 to-blue-700",       num: "text-blue-300" };
  }
}

export default function NurseDashboardPage() {
  const { data: session } = useSession();
  const name = session?.user?.name?.split(" ")[0] || "Nurse";
  const shiftLabel = computeShiftLabel();

  // V5 §5.4 numbers are mock for the dashboard scaffold; each tile
  // links to its real backing surface. Once a tenant goes live, these
  // tiles read from the MAR / vitals / bell stores already in lib/.
  const tiles: Tile[] = [
    { label: "Doses due in 30 min", value: 4, tone: "watch", href: "/dashboard/nurse/mar", sub: "Tap to scan + administer" },
    { label: "Doses missed",        value: 0, tone: "ok",    href: "/dashboard/nurse/mar", sub: "Last shift's run-out" },
    { label: "Vitals overdue",      value: 2, tone: "alert", href: "/dashboard/nurse/vitals", sub: "Beyond interval" },
    { label: "Bells unanswered",    value: 1, tone: "alert", href: "/dashboard/nurse/bells", sub: "Bed 12 · 4 min" },
    { label: "Observation timers",  value: 3, tone: "info",  href: "/dashboard/nurse/observation", sub: "1 review due" },
    { label: "Patients on ward",    value: 18, tone: "info", href: "/dashboard/nurse/ward", sub: "Capacity 22" },
  ];

  return (
    <div className="min-h-screen text-white" style={{ background: `linear-gradient(135deg, #020617 0%, #0c1532 60%, ${NURSE_PRIMARY}33 100%)` }}>
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-xl shadow-lg" style={{ backgroundColor: NURSE_PRIMARY }} aria-hidden>
              <span className="absolute h-[60%] w-[22%] rounded-sm bg-white" />
              <span className="absolute h-[22%] w-[60%] rounded-sm bg-white" />
            </span>
            <span className="text-sm font-bold tracking-tight text-white">
              OduDoc Pro <span className="font-medium text-white/50">· Nurse</span>
            </span>
          </Link>
          <span className="text-xs font-semibold text-white/70">{shiftLabel}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero — greeting + shift summary */}
        <section className="mb-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-sm font-medium text-blue-200/90">Welcome to your shift, {name}.</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
            Ward 3B · 18 patients · 2 critical
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70">
            Hand-over received 06:55. Next medication round 08:00 · Next vitals
            sweep 09:00 · Pattern review meeting Friday 14:00.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/nurse/mar" className="rounded-xl bg-gradient-to-r from-[#1E40AF] to-[#5B21B6] px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5 transition-transform">
              Open MAR
            </Link>
            <Link href="/dashboard/near-miss" className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15">
              🛡️ Report near-miss
            </Link>
            <Link href="/dashboard/nurse/handover" className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15">
              Hand-over notes
            </Link>
          </div>
        </section>

        {/* Tiles */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {tiles.map((t) => {
            const c = toneClass(t.tone);
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

        {/* Two-column lower fold */}
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-3 lg:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Next 60 minutes</h2>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <ul className="divide-y divide-white/5">
                <RoundRow time="07:50" who="Bed 4 — Mrs Mehta" what="Insulin 8u s/c (Lantus)" tag="high-alert" />
                <RoundRow time="08:00" who="Bed 7 — Mr Patel" what="Ceftriaxone 1g IV" tag="due" />
                <RoundRow time="08:00" who="Bed 12 — Ms Khan" what="Atorvastatin 20 mg PO" tag="due" />
                <RoundRow time="08:15" who="Bed 2 — Mr Iyer" what="BP + HR + temp" tag="vitals" />
                <RoundRow time="08:30" who="Bed 15 — Mrs Rao" what="Tramadol 50 mg PO PRN (last dose 04:30)" tag="prn" />
                <RoundRow time="09:00" who="Bed 6 — Master Verma" what="Paracetamol 250 mg PO" tag="due" />
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Hand-over from previous shift</h2>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
              <HandoverNote priority="alert" body="Bed 12 — Mrs Khan post-op day 1. Watch for bleeding. Drainage 30 ml at 06:00." />
              <HandoverNote priority="watch" body="Bed 4 — Mrs Mehta morning glucose 168 mg/dL. Cover with sliding scale." />
              <HandoverNote priority="info"  body="Bed 18 awaiting transfer to ICU after morning round. Stable." />
            </div>
            <Link href="/dashboard/nurse/handover" className="block text-center text-xs font-semibold text-blue-300 hover:underline">
              View full hand-over →
            </Link>
          </section>
        </div>

        {/* Compliance / V13 callouts */}
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <ShortcutCard
            href="/dashboard/finance"
            icon="📊"
            title="Your wallet"
            sub="Shift pay, bonuses, deductions."
          />
          <ShortcutCard
            href="/api/scorecards"
            icon="📈"
            title="My scorecard"
            sub="Last 30 days · protocol adherence."
          />
          <ShortcutCard
            href="/dashboard/near-miss"
            icon="🛡️"
            title="Report near-miss"
            sub="No-blame · won't affect your score."
          />
        </section>
      </main>
    </div>
  );
}

function computeShiftLabel(): string {
  const h = new Date().getHours();
  if (h >= 7  && h < 14) return "Morning shift · 07:00–14:00";
  if (h >= 14 && h < 21) return "Evening shift · 14:00–21:00";
  return "Night shift · 21:00–07:00";
}

const TAG_PILL: Record<string, string> = {
  "high-alert": "bg-rose-500/25 text-rose-200 border-rose-300/40",
  due:          "bg-amber-500/20 text-amber-200 border-amber-300/30",
  vitals:       "bg-blue-500/20 text-blue-200 border-blue-300/30",
  prn:          "bg-purple-500/20 text-purple-200 border-purple-300/30",
};

function RoundRow({ time, who, what, tag }: { time: string; who: string; what: string; tag: keyof typeof TAG_PILL }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.04]">
      <span className="w-14 shrink-0 text-sm font-mono font-semibold text-white/80">{time}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{who}</p>
        <p className="truncate text-xs text-white/60">{what}</p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG_PILL[tag]}`}>
        {tag.replace("-", " ")}
      </span>
    </li>
  );
}

function HandoverNote({ priority, body }: { priority: "alert" | "watch" | "info"; body: string }) {
  const color = priority === "alert" ? "border-rose-300/60 bg-rose-500/10 text-rose-100"
    : priority === "watch" ? "border-amber-300/60 bg-amber-500/10 text-amber-100"
    : "border-blue-300/40 bg-blue-500/10 text-blue-100";
  return <div className={`rounded-xl border px-3 py-2 ${color}`}>{body}</div>;
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
