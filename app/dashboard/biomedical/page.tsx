"use client";

import DepartmentShell, { StatTile } from "@/components/DepartmentShell";

export default function BiomedicalDashboard() {
  return (
    <DepartmentShell
      eyebrow="Hospital · Biomedical engineering"
      glyph="⚙️"
      title="Biomedical console"
      subtitle="Equipment inventory, preventive maintenance, calibration logs, and biomedical waste compliance."
      gradient="from-amber-600 via-orange-600 to-rose-600"
      quickLinks={[
        { label: "Waste log", href: "/dashboard/biomedical/waste", emoji: "🗑️" },
        { label: "Equipment inventory", href: "/dashboard/inventory?scope=biomedical", emoji: "🧰" },
        { label: "Maintenance due", href: "/dashboard/biomedical?filter=maintenance", emoji: "🔧" },
      ]}
    >
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Equipment items" value={0} emoji="🧰" tone="amber" />
        <StatTile label="Maintenance due" value={0} emoji="🔧" tone="rose" hint="this week" />
        <StatTile label="Calibrations due" value={0} emoji="📐" tone="cyan" />
        <StatTile label="Waste this month" value="0 kg" emoji="🗑️" tone="emerald" />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">What lives here</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          <li className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="font-semibold text-slate-900 dark:text-slate-100">🗑️ Biomedical waste log</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              BMW-2016 / OSHA / EU compliant disposal log. Yellow / red /
              blue / white / black bag categories with weight + manifest
              tracking. Auto monthly summary for regulatory submission.
            </p>
            <a href="/dashboard/biomedical/waste" className="mt-2 inline-block text-xs font-semibold text-amber-700 hover:underline">
              Open waste log →
            </a>
          </li>
          <li className="rounded-2xl border border-cyan-200 bg-cyan-50/40 p-4">
            <p className="font-semibold text-slate-900 dark:text-slate-100">🧰 Equipment inventory</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
              Track every monitor, ventilator, infusion pump, autoclave with
              serial numbers, calibration dates, and AMC contracts. Alerts
              when service falls due.
            </p>
            <a href="/dashboard/inventory?scope=biomedical" className="mt-2 inline-block text-xs font-semibold text-cyan-700 hover:underline">
              Open inventory →
            </a>
          </li>
        </ul>
      </section>
    </DepartmentShell>
  );
}
