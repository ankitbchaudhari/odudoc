"use client";

// ABDM Digital Health Incentive Scheme (DHIS) dashboard.
//
// Operators land here to see how much the NHA owes them this quarter
// (and YTD), broken down by record category, with a one-click CSV
// export per quarter for upload to the NHA portal.

import { useCallback, useEffect, useState } from "react";

type DhisCategory = "opd" | "ipd" | "diagnostic" | "immunization" | "discharge_summary";

interface DhisBreakdown {
  category: DhisCategory;
  count: number;
  rateInr: number;
  amountInr: number;
}

interface DhisQuarter {
  fyYear: number;
  q: 1 | 2 | 3 | 4;
  startIso: string;
  endIso: string;
  label: string;
}

interface DhisReport {
  organizationId: string;
  hfrFacilityId?: string;
  period: DhisQuarter;
  breakdown: DhisBreakdown[];
  totalRecords: number;
  totalAmountInr: number;
  cappedByAnnual: boolean;
}

interface ApiResponse {
  organizationId: string;
  fyYear: number;
  hfrFacilityId?: string;
  quarters: DhisReport[];
  currentQuarter: DhisReport;
}

interface OrgOption {
  id: string;
  name: string;
  hfrFacilityId?: string;
}

const CATEGORY_LABELS: Record<DhisCategory, string> = {
  opd: "OPD",
  ipd: "IPD",
  diagnostic: "Diagnostic",
  immunization: "Immunization",
  discharge_summary: "Discharge",
};

function formatInr(n: number): string {
  // Indian numbering with ₹ prefix.
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function AdminDhisPage() {
  const [orgs, setOrgs] = useState<OrgOption[] | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [fyYear, setFyYear] = useState<number>(() => {
    const d = new Date();
    return d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  });
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Best-effort fetch of orgs. If the user is not a super-admin, this
  // 403s — we then fall through to a single-org view (server picks
  // their active org for them).
  useEffect(() => {
    fetch("/api/organizations").then(async (r) => {
      if (!r.ok) {
        setOrgs([]);
        return;
      }
      const body = await r.json().catch(() => ({} as { organizations?: OrgOption[] }));
      const list = (body.organizations || []) as OrgOption[];
      setOrgs(list);
      if (list.length > 0) setSelectedOrgId(list[0].id);
    }).catch(() => setOrgs([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (selectedOrgId) qs.set("organizationId", selectedOrgId);
      qs.set("fyYear", String(fyYear));
      const r = await fetch(`/api/admin/dhis?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) {
        const b = await r.json().catch(() => ({} as { error?: string }));
        setError((b as { error?: string }).error || `HTTP ${r.status}`);
        setData(null);
        return;
      }
      setData(await r.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId, fyYear]);

  useEffect(() => {
    // Only call once we know whether to pass an orgId (super-admin) or
    // not (org-admin → server resolves their active org).
    if (orgs === null) return;
    load();
  }, [orgs, load]);

  const downloadCsv = (q: 1 | 2 | 3 | 4) => {
    const qs = new URLSearchParams();
    if (selectedOrgId) qs.set("organizationId", selectedOrgId);
    qs.set("fyYear", String(fyYear));
    qs.set("quarter", String(q));
    window.open(`/api/admin/dhis/export?${qs.toString()}`, "_blank");
  };

  const ytdRecords = data?.quarters.reduce((s, r) => s + r.totalRecords, 0) ?? 0;
  const ytdAmount = data?.quarters.reduce((s, r) => s + r.totalAmountInr, 0) ?? 0;
  const anyCapped = !!data?.quarters.some((r) => r.cappedByAnnual);
  const missingHfr = data ? !data.hfrFacilityId : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-emerald-50/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-3 text-xs text-slate-500">
          <a className="hover:text-slate-700" href="/admin">Admin</a>
          <span className="mx-1.5">/</span>
          <span className="font-medium text-slate-700">ABDM Incentive (DHIS)</span>
        </nav>

        <div className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-sky-700 p-8 text-white shadow-xl">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">Admin · ABDM compliance</p>
          <h1 className="mt-1 text-3xl font-bold">Digital Health Incentive Scheme</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">
            Quarterly payout tracker for ABHA-linked care contexts. The
            NHA pays ₹20–₹40 per qualifying record (registered or
            linked). Annual facility cap is ₹4 crore.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          {orgs && orgs.length > 0 && (
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Fiscal year
            </label>
            <select
              value={fyYear}
              onChange={(e) => setFyYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {[fyYear + 1, fyYear, fyYear - 1, fyYear - 2].map((y) => (
                <option key={y} value={y}>FY {y}-{(y + 1).toString().slice(-2)}</option>
              ))}
            </select>
          </div>
        </div>

        {missingHfr && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <b>HFR Facility ID missing.</b> Add your 19-digit Health
            Facility Registry ID on{" "}
            <a className="underline" href="/admin/organizations">
              Organizations → Edit
            </a>{" "}
            to enable DHIS submissions.
          </div>
        )}

        {anyCapped && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <b>Annual cap reached.</b> You&apos;ve hit the ₹4 crore DHIS cap
            for this fiscal year. Further records this FY will be
            tracked but won&apos;t add additional incentive.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <p className="p-12 text-center text-sm text-slate-500">Loading…</p>
        )}

        {data && (
          <>
            <div className="mb-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Current quarter records"
                value={data.currentQuarter.totalRecords.toLocaleString()}
                tone="cyan"
                hint={data.currentQuarter.period.label}
              />
              <Stat
                label="Current quarter incentive"
                value={formatInr(data.currentQuarter.totalAmountInr)}
                tone="emerald"
              />
              <Stat
                label="YTD records"
                value={ytdRecords.toLocaleString()}
                tone="violet"
              />
              <Stat
                label="YTD incentive"
                value={formatInr(ytdAmount)}
                tone="amber"
                hint={`Cap: ${formatInr(4_00_00_000)}`}
              />
            </div>

            <section className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-bold text-slate-900">Quarterly breakdown</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Only care contexts in <b>registered</b> or <b>linked</b>{" "}
                  status are counted. Drafts and withdrawn contexts are
                  excluded.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Quarter</th>
                      <th className="px-4 py-3 text-right">OPD</th>
                      <th className="px-4 py-3 text-right">IPD</th>
                      <th className="px-4 py-3 text-right">Diagnostic</th>
                      <th className="px-4 py-3 text-right">Immunization</th>
                      <th className="px-4 py-3 text-right">Discharge</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Incentive</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.quarters.map((r) => {
                      const byCat = new Map(r.breakdown.map((b) => [b.category, b.count]));
                      return (
                        <tr key={r.period.q} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">Q{r.period.q}</div>
                            <div className="text-[11px] text-slate-500">{r.period.label}</div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{byCat.get("opd") ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{byCat.get("ipd") ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{byCat.get("diagnostic") ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{byCat.get("immunization") ?? 0}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{byCat.get("discharge_summary") ?? 0}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">{r.totalRecords}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-700">
                            {formatInr(r.totalAmountInr)}
                          </td>
                          <td className="px-4 py-3">
                            {r.cappedByAnnual ? (
                              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                                Capped
                              </span>
                            ) : r.totalRecords > 0 ? (
                              <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                Ready
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                Empty
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={r.totalRecords === 0}
                              onClick={() => downloadCsv(r.period.q)}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Download CSV
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/40 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900">Rate card (NHA 2024)</h2>
              <ul className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                {Object.keys(CATEGORY_LABELS).map((c) => {
                  const row = data.currentQuarter.breakdown.find((b) => b.category === c);
                  return (
                    <li key={c}>
                      <b>{CATEGORY_LABELS[c as DhisCategory]}</b> · {formatInr(row?.rateInr ?? 0)} per record
                    </li>
                  );
                })}
                <li><b>Annual cap</b> · {formatInr(4_00_00_000)} per facility per FY</li>
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "slate",
  hint,
}: {
  label: string;
  value: string;
  tone?: "slate" | "emerald" | "cyan" | "violet" | "amber";
  hint?: string;
}) {
  const palette: Record<string, string> = {
    slate: "from-slate-50 to-white ring-slate-100 text-slate-700",
    emerald: "from-emerald-50 to-white ring-emerald-100 text-emerald-700",
    cyan: "from-cyan-50 to-white ring-cyan-100 text-cyan-700",
    violet: "from-violet-50 to-white ring-violet-100 text-violet-700",
    amber: "from-amber-50 to-white ring-amber-100 text-amber-700",
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br p-5 shadow-sm ring-1 ${palette[tone]}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}
