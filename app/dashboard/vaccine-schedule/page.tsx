"use client";

// Patient vaccine schedule (UIP + IAP). Pulls /api/vaccinations/schedule
// for the signed-in user's DOB and renders a categorised timeline.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface ScheduleEntry {
  id: string;
  vaccine: string;
  cohort: "infant" | "child" | "adolescent" | "adult" | "elderly" | "travel" | "pregnancy";
  offsetDays: number;
  windowDays: number;
  protectsAgainst: string;
  mandate: "uip" | "iap_recommended" | "iap_optional" | "travel";
  doseSeries?: string;
  dueAt: string;
  status: "upcoming" | "due_now" | "missed" | "done";
}

const COHORT_LABEL: Record<ScheduleEntry["cohort"], { label: string; emoji: string; tone: string }> = {
  infant:      { label: "Infant (0–1 yr)",     emoji: "👶", tone: "from-rose-400 to-pink-600" },
  child:       { label: "Child (1–10 yr)",     emoji: "🧒", tone: "from-amber-400 to-orange-600" },
  adolescent:  { label: "Adolescent (10–18)",  emoji: "🧑", tone: "from-violet-400 to-fuchsia-600" },
  adult:       { label: "Adult (18+)",         emoji: "🧔", tone: "from-emerald-400 to-teal-600" },
  elderly:     { label: "Elderly (50+)",       emoji: "🧓", tone: "from-slate-400 to-slate-600" },
  travel:      { label: "Travel",              emoji: "🌍", tone: "from-cyan-400 to-blue-600" },
  pregnancy:   { label: "Pregnancy",           emoji: "🤰", tone: "from-pink-400 to-rose-600" },
};

const STATUS_PALETTE: Record<ScheduleEntry["status"], string> = {
  upcoming: "bg-slate-100 text-slate-700",
  due_now:  "bg-amber-100 text-amber-900",
  missed:   "bg-rose-100 text-rose-900",
  done:     "bg-emerald-100 text-emerald-800",
};

export default function VaccineSchedulePage() {
  const { data: session } = useSession();
  const [schedule, setSchedule] = useState<ScheduleEntry[] | null>(null);
  const [needsDob, setNeedsDob] = useState(false);
  const [dob, setDob] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "X">("M");
  const [error, setError] = useState<string | null>(null);

  async function load(forceDob?: string, forceSex?: "M" | "F" | "X") {
    setError(null);
    const params = new URLSearchParams();
    if (forceDob) params.set("dob", forceDob);
    if (forceSex) params.set("sex", forceSex);
    const r = await fetch(`/api/vaccinations/schedule${params.toString() ? `?${params}` : ""}`);
    const j = await r.json();
    if (!r.ok) {
      if (j.error === "dob required") setNeedsDob(true);
      else setError(j.error || "Failed");
      return;
    }
    setNeedsDob(false);
    setSchedule(j.schedule || []);
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Group by cohort + sort by due date.
  const grouped: Record<string, ScheduleEntry[]> = {};
  for (const e of schedule || []) {
    (grouped[e.cohort] ||= []).push(e);
  }
  const cohortOrder: ScheduleEntry["cohort"][] = ["infant", "child", "adolescent", "adult", "elderly", "pregnancy"];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Vaccinations</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">
        {session?.user?.name ? `${session.user.name.split(" ")[0]}'s schedule` : "Your vaccine schedule"}
      </h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Per the Indian UIP (Universal Immunisation Programme) and IAP recommendations. Due dates
        computed from your date of birth.
      </p>

      {needsDob && (
        <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-700 dark:bg-emerald-950/30">
          <p className="text-base font-bold text-emerald-900 dark:text-emerald-100">We need your date of birth</p>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
            Add it to your profile so the timeline computes automatically. For now you can enter it here.
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => { e.preventDefault(); load(dob, sex); }}
          >
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm"
            />
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as "M" | "F" | "X")}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm"
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="X">Prefer not to say</option>
            </select>
            <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">
              Build my schedule
            </button>
          </form>
        </div>
      )}

      {error && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {schedule && schedule.length > 0 && (
        <div className="mt-6 space-y-8">
          {cohortOrder.map((c) => {
            const items = grouped[c];
            if (!items || items.length === 0) return null;
            const meta = COHORT_LABEL[c];
            return (
              <section key={c}>
                <h2 className="flex items-center gap-3 text-lg font-bold text-slate-900 dark:text-slate-100">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tone} text-base shadow`}>
                    {meta.emoji}
                  </span>
                  {meta.label}
                </h2>
                <ul className="mt-3 space-y-2">
                  {items.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-slate-900 dark:text-slate-100">{e.vaccine}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[e.status]}`}>
                              {e.status.replace(/_/g, " ")}
                            </span>
                            {e.doseSeries && (
                              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                                {e.doseSeries}
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              {e.mandate === "uip" ? "UIP" : e.mandate === "iap_recommended" ? "IAP" : e.mandate === "iap_optional" ? "IAP optional" : "Travel"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                            Protects against: {e.protectsAgainst}
                          </p>
                        </div>
                        <p className="text-right text-xs text-slate-500 dark:text-slate-400">
                          Due {new Date(e.dueAt).toLocaleDateString()}
                          <br />
                          {e.windowDays > 0 && <span className="text-[10px]">± {e.windowDays} day{e.windowDays === 1 ? "" : "s"} window</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
