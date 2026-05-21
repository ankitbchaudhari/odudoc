"use client";

// V13 §7 — Near-miss report form (staff-facing).
//
// Any signed-in staff member can submit. V13 §7.4 explicitly allows
// anonymous reporting; the checkbox at the top toggles the
// reporterEmail field on the server.
//
// Reporting a near-miss is NOT penalised in the V13 §6 scorecard —
// the system rewards proactive surfacing because that's the only
// way to catch the next actual harm.

import { useState } from "react";
import DashboardShell from "@/components/ui/DashboardShell";
import GlassCard from "@/components/ui/GlassCard";
import { useSession } from "next-auth/react";

const DOMAINS = [
  ["medication", "Medication (wrong drug, dose, route, patient)"],
  ["identification", "Identification (wrist-band mismatch, ID confusion)"],
  ["procedure", "Procedure (wrong site, implant, unscheduled)"],
  ["infection", "Infection (hand hygiene, sterile-field break)"],
  ["fall", "Fall (unwitnessed, near-fall, fall arrested)"],
  ["equipment", "Equipment (device malfunction, missing item)"],
  ["communication", "Communication (handover gap, illegible note)"],
  ["documentation", "Documentation (wrong record, missing consent)"],
  ["security", "Security (unauthorised access, lost device)"],
  ["other", "Other"],
] as const;

const SEVERITIES = [
  ["minor", "Minor (low-risk slip)"],
  ["moderate", "Moderate (concerning, caught early)"],
  ["serious", "Serious (could have caused real harm)"],
  ["catastrophic_avoided", "Catastrophic-avoided (life-threatening near-event)"],
] as const;

const OUTCOMES = [
  ["no_harm", "No harm — patient unaffected"],
  ["delayed_treatment", "Delayed treatment"],
  ["extra_intervention", "Extra intervention required"],
  ["psychological", "Psychological impact only"],
] as const;

const FACTORS = [
  "Fatigue / shift length", "High patient volume", "Distractions / interruptions",
  "Equipment unfamiliar", "Process unclear", "Communication gap",
  "Time pressure", "Inadequate staffing", "Look-alike / sound-alike",
  "Workspace layout", "Training gap", "Documentation gap",
];

export default function NearMissReportPage() {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role || "patient";
  const dashboardRole: "patient" | "doctor" | "corporate" =
    role === "doctor" ? "doctor"
    : role === "admin" || role === "staff" || role === "hr" || role === "support" ? "corporate"
    : "patient";

  const [anonymous, setAnonymous] = useState(false);
  const [what, setWhat] = useState("");
  const [where, setWhere] = useState("");
  const [whenAt, setWhenAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [domain, setDomain] = useState<typeof DOMAINS[number][0]>("medication");
  const [severity, setSeverity] = useState<typeof SEVERITIES[number][0]>("moderate");
  const [outcome, setOutcome] = useState<typeof OUTCOMES[number][0]>("no_harm");
  const [factors, setFactors] = useState<string[]>([]);
  const [suggestedFix, setSuggestedFix] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleFactor = (f: string) => setFactors((cur) => cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/near-miss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          anonymous,
          what, where,
          whenAt: new Date(whenAt).toISOString(),
          domain, severity, outcome,
          contributingFactors: factors,
          suggestedFix: suggestedFix || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j.error ? String(j.error) : "Submission failed");
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <DashboardShell role={dashboardRole}>
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-5xl">🛡️</div>
            <h2 className="text-xl font-bold text-white">Thank you for reporting.</h2>
            <p className="max-w-md text-sm text-white/70">
              {anonymous
                ? "Your anonymous near-miss report has been logged. The pattern review meeting will look at it alongside other reports from this week."
                : "Your near-miss report has been logged. The pattern review meeting will look at it alongside other reports from this week."}
            </p>
            <p className="max-w-md text-xs text-white/50">
              Reporting near-misses never affects your scorecard. It&apos;s
              how we catch the next actual harm.
            </p>
            <button
              onClick={() => { setDone(false); setWhat(""); setWhere(""); setSuggestedFix(""); setFactors([]); }}
              className="mt-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              Submit another
            </button>
          </div>
        </GlassCard>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role={dashboardRole}>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-[#0F6E56] to-[#1D9E75] bg-clip-text text-transparent">
            Report a near-miss
          </span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/70">
          A near-miss is an event that could have caused harm but didn&apos;t —
          a wrong drug caught before administration, a wrong-side marking
          caught at the pause, a fall arrested by a bedrail. Surfacing these
          is the only way to catch the next actual harm.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-white/50">
          Reporting never affects your scorecard. The system explicitly
          rewards proactive surfacing.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <GlassCard>
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded border-white/30"
            />
            Submit anonymously (V13 §7.4)
          </label>
          {!anonymous && session?.user?.email && (
            <p className="mt-2 text-xs text-white/60">Reporter: {session.user.email}</p>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">What happened</h3>
          <textarea
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            required
            rows={4}
            minLength={10}
            maxLength={2000}
            placeholder="Describe what happened, what could have gone wrong, what actually happened."
            className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-white/70">Where</label>
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                required
                placeholder="e.g. Ward 3B Bed 12, OR 2, OPD cabin 5"
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/70">When</label>
              <input
                type="datetime-local"
                value={whenAt}
                onChange={(e) => setWhenAt(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">Classification</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField label="Domain" value={domain} onChange={(v) => setDomain(v as typeof domain)} options={DOMAINS as unknown as readonly (readonly [string, string])[]} />
            <SelectField label="Severity" value={severity} onChange={(v) => setSeverity(v as typeof severity)} options={SEVERITIES as unknown as readonly (readonly [string, string])[]} />
            <SelectField label="Outcome" value={outcome} onChange={(v) => setOutcome(v as typeof outcome)} options={OUTCOMES as unknown as readonly (readonly [string, string])[]} />
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">Contributing factors</h3>
          <div className="flex flex-wrap gap-2">
            {FACTORS.map((f) => {
              const on = factors.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFactor(f)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    on
                      ? "border-[#1D9E75] bg-[#1D9E75]/20 text-[#1D9E75]"
                      : "border-white/15 text-white/70 hover:border-white/30"
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-white/60">
            Suggested system-level fix (optional)
          </h3>
          <textarea
            value={suggestedFix}
            onChange={(e) => setSuggestedFix(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What change to process / equipment / training would prevent this happening again?"
            className="w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
        </GlassCard>

        {err && (
          <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-[#0F6E56] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0A5942] disabled:opacity-60"
          >
            {busy ? "Submitting…" : "Submit report"}
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/70">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white"
      >
        {options.map(([k, v]) => (
          <option key={k} value={k} className="text-gray-900">{v}</option>
        ))}
      </select>
    </div>
  );
}
