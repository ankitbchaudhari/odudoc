"use client";

// Public status page. Polls /api/status every 30s. Mirrors the
// pattern enterprise customers expect from any serious SaaS.

import { useCallback, useEffect, useState } from "react";

interface ComponentStatus {
  id: string; name: string;
  group: "core" | "clinical" | "comms" | "marketplace" | "compliance";
  status: "operational" | "degraded" | "outage" | "unknown";
  detail?: string; lastCheckedMs: number;
}
interface StatusResp {
  overall: ComponentStatus["status"];
  summary: { total: number; operational: number; degraded: number; outage: number; unknown: number };
  components: ComponentStatus[];
  generatedAt: string;
  region: string;
}

const STATUS_COLOR: Record<string, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  outage: "bg-rose-600",
  unknown: "bg-slate-400",
};
const STATUS_LABEL: Record<string, string> = {
  operational: "Operational",
  degraded: "Degraded",
  outage: "Outage",
  unknown: "Unknown",
};
const GROUP_LABEL: Record<string, string> = {
  core: "Platform core",
  clinical: "Clinical AI",
  comms: "Communications",
  marketplace: "Marketplace & payments",
  compliance: "Compliance & data",
};

const HERO_TONE: Record<string, { bg: string; ring: string; emoji: string; copy: string }> = {
  operational: { bg: "from-emerald-500 to-teal-600", ring: "ring-emerald-300", emoji: "✓", copy: "All systems operational" },
  degraded: { bg: "from-amber-500 to-orange-600", ring: "ring-amber-300", emoji: "⚠", copy: "Degraded performance on some services" },
  outage: { bg: "from-rose-500 to-red-700", ring: "ring-rose-300", emoji: "🚨", copy: "Active outage" },
  unknown: { bg: "from-slate-500 to-slate-700", ring: "ring-slate-300", emoji: "?", copy: "Unable to determine status" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/status", { cache: "no-store" });
      if (r.ok) { setData(await r.json()); setError(null); }
      else setError(`Status endpoint returned ${r.status}`);
    } catch (e) { setError((e as Error).message); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const grouped = (data?.components || []).reduce<Record<string, ComponentStatus[]>>((acc, c) => {
    (acc[c.group] ||= []).push(c);
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">OduDoc Status</p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">Live system status</h1>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>
        )}

        {data && (
          <>
            {/* Overall hero */}
            <div className={`mt-8 rounded-2xl bg-gradient-to-r p-8 text-white shadow-lg ring-2 ${HERO_TONE[data.overall].bg} ${HERO_TONE[data.overall].ring}`}>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-5xl">{HERO_TONE[data.overall].emoji}</p>
                  <p className="mt-2 text-2xl font-extrabold">{HERO_TONE[data.overall].copy}</p>
                  <p className="text-sm opacity-90">{data.summary.operational}/{data.summary.total} services nominal</p>
                </div>
                <div className="text-right text-xs opacity-90">
                  <p>Region: {data.region}</p>
                  <p>Updated {new Date(data.generatedAt).toLocaleString()}</p>
                  <p>Refreshes every 30s</p>
                </div>
              </div>
            </div>

            {/* Summary chips */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryTile label="Operational" v={data.summary.operational} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
              <SummaryTile label="Degraded" v={data.summary.degraded} tone="bg-amber-50 text-amber-700 ring-amber-200" />
              <SummaryTile label="Outage" v={data.summary.outage} tone="bg-rose-50 text-rose-700 ring-rose-200" />
              <SummaryTile label="Unknown" v={data.summary.unknown} tone="bg-slate-50 text-slate-700 ring-slate-200" />
            </div>

            {/* Grouped components */}
            <div className="mt-8 space-y-4">
              {Object.keys(grouped).map((g) => (
                <section key={g} className="rounded-xl bg-white p-4 shadow-sm">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{GROUP_LABEL[g] || g}</p>
                  <ul className="divide-y divide-slate-100">
                    {grouped[g].map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${STATUS_COLOR[c.status]}`} />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                            {c.detail && <p className="text-[11px] text-slate-500">{c.detail}</p>}
                          </div>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          c.status === "operational" ? "bg-emerald-100 text-emerald-700" :
                          c.status === "degraded" ? "bg-amber-100 text-amber-700" :
                          c.status === "outage" ? "bg-rose-100 text-rose-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>{STATUS_LABEL[c.status]}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <p className="mt-8 text-center text-[11px] text-slate-400">
              Subscribe to incident notifications — email <a className="underline" href="mailto:status@odudoc.com">status@odudoc.com</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function SummaryTile({ label, v, tone }: { label: string; v: number; tone: string }) {
  return (
    <div className={`rounded-xl px-3 py-2 ring-1 ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-0.5 text-2xl font-extrabold">{v}</p>
    </div>
  );
}
