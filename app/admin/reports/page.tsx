"use client";

// Reports & Exports hub — single landing page that bundles the four
// platform exports (patients, corporate, financial, marketing) with a
// shared date-range picker. Each card triggers a CSV download via
// /api/admin/reports/{report}. Tenant admins see only the org-scoped
// reports they're allowed to run; super-admins see all four.

import { useState } from "react";

interface ReportMeta {
  id: "patients" | "corporate" | "financial" | "marketing";
  title: string;
  blurb: string;
  superOnly?: boolean;
  tone: "emerald" | "violet" | "amber" | "rose";
  badge: string;
}

const REPORTS: ReportMeta[] = [
  {
    id: "patients",
    title: "Patients",
    blurb: "All patients on file, with demographics, contact info, and last-updated timestamps. Org-scoped.",
    tone: "emerald",
    badge: "Org data",
  },
  {
    id: "financial",
    title: "Financial",
    blurb: "Every invoice with subtotal / tax / paid / balance. Filters by date range.",
    tone: "amber",
    badge: "Money",
  },
  {
    id: "corporate",
    title: "Corporate",
    blurb: "Organisations on the platform with plan, status, and enabled-module count. Super-admin only.",
    tone: "violet",
    superOnly: true,
    badge: "Platform",
  },
  {
    id: "marketing",
    title: "Marketing",
    blurb: "User signups with role + verification + last-login. Useful for funnel + retention analysis.",
    tone: "rose",
    superOnly: true,
    badge: "Acquisition",
  },
];

const TONE: Record<ReportMeta["tone"], string> = {
  emerald: "from-emerald-500 to-teal-600",
  violet: "from-violet-500 to-fuchsia-600",
  amber: "from-amber-500 to-orange-600",
  rose: "from-rose-500 to-red-600",
};

export default function AdminReports() {
  const today = new Date().toISOString().slice(0, 10);
  // Default window: trailing 90 days. Wide enough to be useful for
  // the first download, narrow enough that someone doesn't accidentally
  // dump the entire history every time.
  const ninetyAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const [from, setFrom] = useState(ninetyAgo);
  const [to, setTo] = useState(today);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; err?: boolean } | null>(
    null,
  );

  async function download(report: ReportMeta) {
    setDownloading(report.id);
    try {
      const url = `/api/admin/reports/${report.id}?from=${encodeURIComponent(
        from,
      )}&to=${encodeURIComponent(to)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        // Try to read the JSON error message before falling back.
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const filename =
        res.headers
          .get("content-disposition")
          ?.match(/filename="([^"]+)"/)?.[1] || `${report.id}.csv`;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
      showToast(`✓ Downloaded ${filename}`);
    } catch (err) {
      showToast((err as Error).message, true);
    } finally {
      setDownloading(null);
    }
  }

  function showToast(text: string, err = false) {
    setToast({ text, err });
    setTimeout(() => setToast(null), 3000);
  }

  const inputCls =
    "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20";

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-700 via-gray-800 to-zinc-900 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            📦 Bulk data exports
          </div>
          <h1 className="text-2xl font-bold">Reports & Exports</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/90">
            Download every platform dataset as a date-ranged CSV. Open
            in Excel / Sheets / your BI tool of choice. Tenant admins
            get their own org&apos;s data; super-admins get everything.
          </p>
        </div>
      </div>

      {/* Shared date range */}
      <div className="mb-6 flex flex-wrap items-end gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            From
          </label>
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            max={to}
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
            To
          </label>
          <input
            type="date"
            className={`mt-1 ${inputCls}`}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from}
            max={today}
          />
        </div>
        <div className="ml-auto flex gap-2">
          <QuickRange label="7 d" onClick={() => setRangeDays(7, setFrom, setTo)} />
          <QuickRange label="30 d" onClick={() => setRangeDays(30, setFrom, setTo)} />
          <QuickRange label="90 d" onClick={() => setRangeDays(90, setFrom, setTo)} />
          <QuickRange label="365 d" onClick={() => setRangeDays(365, setFrom, setTo)} />
        </div>
      </div>

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {REPORTS.map((r) => (
          <div
            key={r.id}
            className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100"
          >
            <div className={`h-1.5 bg-gradient-to-r ${TONE[r.tone]}`} />
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {r.title}
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">{r.blurb}</p>
                </div>
                <span
                  className={`rounded-full bg-gradient-to-r ${TONE[r.tone]} px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white`}
                >
                  {r.badge}
                </span>
              </div>
              {r.superOnly && (
                <p className="mt-2 inline-block rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  Super-admin only
                </p>
              )}
              <button
                type="button"
                onClick={() => download(r)}
                disabled={downloading === r.id}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:bg-gray-800 disabled:opacity-50"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                {downloading === r.id ? "Preparing…" : "Download CSV"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-700">
        <p className="font-semibold">What&apos;s in the export?</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>UTF-8 with BOM so Excel renders unicode (₹, é, 中) correctly</li>
          <li>Filename includes a timestamp: <code className="rounded bg-white px-1">patients-20260525-1142.csv</code></li>
          <li>Date filter is inclusive on both ends</li>
          <li>For row-level privacy on patient data, use Patient Lookup instead — that surface respects per-role redaction</li>
        </ul>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg ${
            toast.err ? "bg-red-600" : "bg-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

function QuickRange({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
    >
      Last {label}
    </button>
  );
}

function setRangeDays(
  days: number,
  setFrom: (s: string) => void,
  setTo: (s: string) => void,
) {
  const now = new Date();
  const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  setTo(now.toISOString().slice(0, 10));
  setFrom(past.toISOString().slice(0, 10));
}
