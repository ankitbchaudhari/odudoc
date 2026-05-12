"use client";

// First-run onboarding wizard for patients.
//
// Guided 4-step path that lights up the platform's core value:
//   1) ABHA link → unlocks national health record + interoperable Rx
//   2) Wallet top-up → 5% bonus, instant booking confidence
//   3) Family setup → manage parents/kids from one login
//   4) First booking → drop them on /doctors with credit in hand
//
// Each step is skippable (we don't gate the platform on completion),
// progress is local (per-browser) so the wizard self-dismisses once
// they've finished, and a "Skip for now" link on every step exits to
// the dashboard without making the user feel cornered.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type StepKey = "abha" | "wallet" | "family" | "booking";

interface StepDef {
  key: StepKey;
  title: string;
  pitch: string;
  ctaLabel: string;
  ctaHref: string;
  emoji: string;
}

const STEPS: StepDef[] = [
  {
    key: "abha",
    title: "Link your ABHA health ID",
    pitch:
      "Your Ayushman Bharat Health Account is the national passport for medical records. Link it once and every prescription, lab report, and discharge summary lands in one place — no more scanning printouts or hunting through WhatsApp.",
    ctaLabel: "Link ABHA",
    ctaHref: "/dashboard/abha",
    emoji: "🇮🇳",
  },
  {
    key: "wallet",
    title: "Top up your wallet",
    pitch:
      "Add ₹500–₹5,000 once and pay across consults, pharmacy, lab tests with a single tap. Every top-up earns 5% bonus credit. Refunds and reversals settle the same day, in the same wallet.",
    ctaLabel: "Add money",
    ctaHref: "/dashboard/wallet",
    emoji: "💰",
  },
  {
    key: "family",
    title: "Add family members",
    pitch:
      "Manage your kids&apos;, parents&apos;, and partner&apos;s care from one login. Switch profiles in one click during a consult; doctors see the right history every time. Each family member keeps their own ABHA record — fully isolated.",
    ctaLabel: "Add a family member",
    ctaHref: "/dashboard/family",
    emoji: "👨‍👩‍👧",
  },
  {
    key: "booking",
    title: "Book your first consult",
    pitch:
      "Verified specialists across 22 specialties in 18 cities. Telemedicine in 4 minutes, in-person from ₹500. Your wallet balance is already there waiting — your first booking is one tap away.",
    ctaLabel: "Find a doctor",
    ctaHref: "/doctors",
    emoji: "🩺",
  },
];

const STORAGE_KEY = "odudoc:onboarding:done";

function readDone(): Set<StepKey> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as StepKey[]);
  } catch {
    return new Set();
  }
}
function writeDone(s: Set<StepKey>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s))); } catch {}
}

export default function OnboardingWizardPage() {
  const router = useRouter();
  const [done, setDone] = useState<Set<StepKey>>(new Set());
  const [step, setStep] = useState(0);

  useEffect(() => { setDone(readDone()); }, []);

  const current = STEPS[step];
  const completed = done.size;
  const total = STEPS.length;
  const pct = Math.round((completed / total) * 100);

  const markDone = (k: StepKey) => {
    const next = new Set(done); next.add(k); setDone(next); writeDone(next);
  };
  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else router.push("/dashboard");
  };
  const skip = () => { router.push("/dashboard"); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-emerald-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-700">
            Welcome to OduDoc
          </p>
          <button onClick={skip} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300">
            Skip for now →
          </button>
        </div>

        {/* Progress */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>Step {step + 1} of {total}</span>
            <span>{completed} of {total} complete · {pct}%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i === step ? "bg-indigo-600" : done.has(s.key) ? "bg-emerald-500" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="mt-6 rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl ring-1 ring-slate-200 dark:ring-slate-800">
          <div className="text-5xl">{current.emoji}</div>
          <h1 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-slate-100 sm:text-3xl">
            {current.title}
          </h1>
          <p
            className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base"
            // pitch contains escaped &apos; for valid JSX inside the array;
            // render as plain text via dangerouslySetInnerHTML so the
            // HTML entities decode rather than appearing literally.
            dangerouslySetInnerHTML={{ __html: current.pitch }}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={current.ctaHref}
              onClick={() => markDone(current.key)}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            >
              {current.ctaLabel} →
            </Link>
            <button
              onClick={() => { markDone(current.key); next(); }}
              className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:bg-slate-900"
            >
              {step < STEPS.length - 1 ? "Mark done & continue" : "Finish"}
            </button>
            <button
              onClick={next}
              className="text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300"
            >
              Skip this step
            </button>
          </div>

          {done.has(current.key) && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              ✓ Completed
            </p>
          )}
        </div>

        {/* Step list */}
        <ul className="mt-6 space-y-2">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                onClick={() => setStep(i)}
                className={`flex w-full items-center gap-3 rounded-xl bg-white dark:bg-slate-900 px-4 py-3 text-left shadow-sm ring-1 transition-all ${
                  i === step ? "ring-indigo-300" : "ring-slate-200 dark:ring-slate-800 hover:ring-slate-300"
                }`}
              >
                <span className="text-xl">{s.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{s.title}</span>
                {done.has(s.key) ? (
                  <span className="text-xs font-bold text-emerald-600">✓</span>
                ) : i === step ? (
                  <span className="text-xs font-semibold text-indigo-600">Now</span>
                ) : (
                  <span className="text-xs text-slate-400">→</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
