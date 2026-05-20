"use client";

// Diet plan dashboard — patient view.
//
// Lists the patient's active diet plan (one at a time) and lets them
// log meals against it. The plan itself is authored by the treating
// doctor or in-house nutritionist on the doctor side (Treatment
// Templates → "Diet" type) and pulled in here.
//
// Until the diet-plan store ships on the doctor side, this page reads
// from /api/diet-plan (which falls back to a sensible empty payload)
// and renders a "no plan yet" CTA that points the patient at their
// last consult so they can request one.

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";

interface MacroTarget {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fibreG: number;
  waterL: number;
}
interface MealSlot {
  id: string;
  name: "Breakfast" | "Mid-morning" | "Lunch" | "Tea" | "Dinner" | "Bedtime";
  time: string;
  items: string[];
}
interface DietPlan {
  id: string;
  title: string;
  condition?: string;
  authoredBy?: string;
  startedOn: string;
  notes?: string;
  targets: MacroTarget;
  meals: MealSlot[];
}

interface MealLog {
  slotName: string;
  loggedAt: string;
  followed: "yes" | "partial" | "no";
}

const DEMO_PLAN: DietPlan | null = null; // server returns null until doctor publishes one

export default function DietPlanPage() {
  const [plan, setPlan] = useState<DietPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayLog, setTodayLog] = useState<MealLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/diet-plan", { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          if (!cancelled) setPlan(d.plan || DEMO_PLAN);
        } else {
          if (!cancelled) setPlan(DEMO_PLAN);
        }
      } catch {
        if (!cancelled) setPlan(DEMO_PLAN);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const logMeal = (slotName: string, followed: MealLog["followed"]) => {
    setTodayLog((prev) => [
      ...prev.filter((m) => m.slotName !== slotName),
      { slotName, loggedAt: new Date().toISOString(), followed },
    ]);
    // TODO wire to POST /api/diet-plan/log once the store ships.
  };

  return (
    <DashboardShell role="patient">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-lime-300 via-emerald-300 to-teal-300 bg-clip-text text-transparent">
            Diet Plan
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          A diet plan tuned to your condition, your culture, and your real
          schedule — assigned by your treating doctor or nutritionist. Log
          each meal to keep your care team in the loop.
        </p>
      </div>

      {loading ? (
        <GlassCard>
          <div className="flex items-center justify-center py-16">
            <svg className="h-8 w-8 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        </GlassCard>
      ) : !plan ? (
        <EmptyState />
      ) : (
        <PlanView plan={plan} todayLog={todayLog} onLog={logMeal} />
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <InfoCard
          emoji="🩺"
          title="Why a diet plan?"
          body="Chronic conditions like diabetes, hypertension, PCOS, IBS, and post-surgery recovery improve faster when meals are structured to your medications and lab targets."
        />
        <InfoCard
          emoji="🥬"
          title="Cultural fit"
          body="OduDoc plans are written by clinicians in your region, with foods your kitchen actually serves — never copy-paste US-style meal plans."
        />
        <InfoCard
          emoji="📈"
          title="Closed loop"
          body="Each meal you log is visible to your doctor at your next consult. They see what worked, what slipped, and why — and tweak the plan."
        />
      </div>
    </DashboardShell>
  );
}

function EmptyState() {
  return (
    <GlassCard>
      <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
        <div className="text-6xl">🥗</div>
        <h2 className="text-xl font-bold text-white">No active diet plan yet</h2>
        <p className="max-w-md text-sm text-white/70">
          Your doctor or in-house nutritionist creates a diet plan during a
          consult — usually when you have a chronic condition, are recovering
          from surgery, or have been flagged by an EWS score. Book a consult
          and ask for one.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/doctors?specialty=nutritionist"
            className="rounded-xl bg-gradient-to-r from-lime-400 to-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5"
          >
            Find a nutritionist
          </Link>
          <Link
            href="/dashboard/consultations"
            className="rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/15"
          >
            Ask your last doctor
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

function PlanView({
  plan,
  todayLog,
  onLog,
}: {
  plan: DietPlan;
  todayLog: MealLog[];
  onLog: (slotName: string, followed: MealLog["followed"]) => void;
}) {
  return (
    <>
      <GlassCard className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">{plan.title}</h2>
            <p className="mt-1 text-sm text-white/60">
              {plan.condition ? `${plan.condition} · ` : ""}
              {plan.authoredBy ? `by ${plan.authoredBy} · ` : ""}
              started {new Date(plan.startedOn).toLocaleDateString()}
            </p>
            {plan.notes && (
              <p className="mt-3 max-w-xl text-sm text-white/75">{plan.notes}</p>
            )}
          </div>
          <Link
            href="/dashboard/messages"
            className="rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
          >
            Message dietitian
          </Link>
        </div>
      </GlassCard>

      <GlassCard className="mb-6">
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white/60">
          Daily targets
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Target label="Calories"  value={`${plan.targets.kcal} kcal`} />
          <Target label="Protein"   value={`${plan.targets.proteinG} g`} />
          <Target label="Carbs"     value={`${plan.targets.carbsG} g`} />
          <Target label="Fat"       value={`${plan.targets.fatG} g`} />
          <Target label="Fibre"     value={`${plan.targets.fibreG} g`} />
          <Target label="Water"     value={`${plan.targets.waterL} L`} />
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-white/60">
          Today&apos;s meals
        </h3>
        <ul className="space-y-3">
          {plan.meals.map((slot) => {
            const log = todayLog.find((m) => m.slotName === slot.name);
            return (
              <li
                key={slot.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{slot.name}</p>
                    <p className="text-xs text-white/60">{slot.time}</p>
                  </div>
                  <div className="flex gap-2">
                    <LogBtn active={log?.followed === "yes"} tone="ok" onClick={() => onLog(slot.name, "yes")}>
                      ✅ Yes
                    </LogBtn>
                    <LogBtn active={log?.followed === "partial"} tone="warn" onClick={() => onLog(slot.name, "partial")}>
                      ⚖️ Partial
                    </LogBtn>
                    <LogBtn active={log?.followed === "no"} tone="bad" onClick={() => onLog(slot.name, "no")}>
                      ❌ Skipped
                    </LogBtn>
                  </div>
                </div>
                <ul className="mt-3 grid grid-cols-1 gap-1 text-sm text-white/80 sm:grid-cols-2">
                  {slot.items.map((it, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-lime-400" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </GlassCard>
    </>
  );
}

function Target({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function LogBtn({
  children,
  active,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone: "ok" | "warn" | "bad";
  onClick: () => void;
}) {
  const toneClass =
    tone === "ok"
      ? active ? "bg-emerald-500/30 border-emerald-300/50 text-emerald-100" : "border-white/15 text-white/70 hover:bg-emerald-500/10"
      : tone === "warn"
        ? active ? "bg-amber-500/30 border-amber-300/50 text-amber-100" : "border-white/15 text-white/70 hover:bg-amber-500/10"
        : active ? "bg-rose-500/30 border-rose-300/50 text-rose-100" : "border-white/15 text-white/70 hover:bg-rose-500/10";
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${toneClass}`}
    >
      {children}
    </button>
  );
}

function InfoCard({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <GlassCard>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{emoji}</div>
        <div>
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-xs text-white/70">{body}</p>
        </div>
      </div>
    </GlassCard>
  );
}
