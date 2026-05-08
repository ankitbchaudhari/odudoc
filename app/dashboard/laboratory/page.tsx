"use client";

import DepartmentShell, { StatTile } from "@/components/DepartmentShell";
import StatusBadge from "@/components/StatusBadge";

export default function LaboratoryDashboard() {
  return (
    <DepartmentShell
      eyebrow="Hospital · Laboratory"
      glyph="🧪"
      title="Laboratory console"
      subtitle="Sample collection queue, result entry, abnormal flags, and turnaround time tracking."
      gradient="from-emerald-600 via-teal-600 to-cyan-600"
      quickLinks={[
        { label: "Pending samples", href: "/dashboard/laboratory?filter=pending", emoji: "⏳" },
        { label: "In progress", href: "/dashboard/laboratory?filter=in_progress", emoji: "⚙️" },
        { label: "Abnormal flags", href: "/dashboard/laboratory?filter=abnormal", emoji: "⚠️" },
      ]}
    >
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Today's orders" value={0} emoji="🧪" tone="emerald" />
        <StatTile label="Awaiting collection" value={0} emoji="🩸" tone="amber" />
        <StatTile label="Abnormal flags" value={0} emoji="⚠️" tone="rose" />
        <StatTile label="Avg turnaround" value="—" emoji="⏱️" tone="teal" hint="vs target" />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Sample queue</h2>
          <span className="text-xs text-slate-500">Lab techs only see samples they ordered (per ACL).</span>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <span className="text-4xl">🧫</span>
          <p className="mt-3 text-sm font-semibold text-slate-900">No samples in queue</p>
          <p className="mt-1 text-xs text-slate-500">
            Orders flow in from doctor consultations and OPD visits. Status
            transitions: collected → in progress → ready → delivered.
          </p>
          <p className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <StatusBadge status="pending" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="ready" />
            <StatusBadge status="abnormal" />
            <StatusBadge status="delivered" />
          </p>
        </div>
      </section>
    </DepartmentShell>
  );
}
