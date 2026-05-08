"use client";

// Radiology dashboard — imaging study queue, reporting, viewer launcher.
// Foundation page; image-loading via Cornerstone.js lands in the dedicated
// /dashboard/radiology/viewer/[studyId] route.

import DepartmentShell, { StatTile } from "@/components/DepartmentShell";
import StatusBadge from "@/components/StatusBadge";
import Link from "next/link";

export default function RadiologyDashboard() {
  return (
    <DepartmentShell
      eyebrow="Hospital · Radiology"
      glyph="🩻"
      title="Radiology console"
      subtitle="Imaging studies, reporting queue, and the universal DICOM viewer."
      gradient="from-fuchsia-600 via-violet-600 to-purple-600"
      quickLinks={[
        { label: "New study", href: "/dashboard/radiology/new", emoji: "➕" },
        { label: "Pending reports", href: "/dashboard/radiology?filter=pending", emoji: "⏳" },
        { label: "Critical findings", href: "/dashboard/radiology?filter=abnormal", emoji: "⚠️" },
        { label: "DICOM viewer", href: "/dashboard/radiology/viewer", emoji: "🔍" },
        { label: "3D MPR", href: "/dashboard/radiology/mpr", emoji: "🧊" },
      ]}
    >
      <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Today's studies" value={0} emoji="🩻" tone="violet" />
        <StatTile label="Pending reports" value={0} emoji="⏳" tone="amber" />
        <StatTile label="Critical findings" value={0} emoji="⚠️" tone="rose" hint="awaiting flag" />
        <StatTile label="Modalities online" value="—" emoji="📡" tone="emerald" hint="MRI / CT / X-ray / US" />
      </div>

      <section className="rounded-3xl border border-white/60 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Imaging queue</h2>
          <span className="text-xs text-slate-500">Status colours match the rest of the platform.</span>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center">
          <span className="text-4xl">🩻</span>
          <p className="mt-3 text-sm font-semibold text-slate-900">No studies yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Studies appear here once orders are placed from any consultation or
            ward, and once technologists upload the DICOM files.
          </p>
          <p className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
            <StatusBadge status="pending" />
            <StatusBadge status="in_progress" />
            <StatusBadge status="ready" />
            <StatusBadge status="abnormal" />
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/60 via-white to-fuchsia-50/40 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Universal DICOM viewer</h2>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          Open any <code className="rounded bg-white px-1.5 py-0.5 text-xs">.dcm</code> file
          (CT, MRI, X-ray, ultrasound) plus PDF reports and JPEG/PNG scans
          in our universal viewer. Built on Cornerstone.js, runs entirely in
          the browser, no PACS server required.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/dashboard/radiology/viewer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5"
          >
            🔍 Open viewer
          </Link>
          <span className="text-[11px] italic text-slate-500">
            Cornerstone integration ships in the next release.
          </span>
        </div>
      </section>
    </DepartmentShell>
  );
}
