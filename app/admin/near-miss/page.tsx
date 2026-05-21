"use client";

// V13 §7 + §8 — admin review queue for near-miss reports.
//
// Lists every submitted report with the V13 §7.3 fields. Domain-
// rollup tiles at the top surface the pattern (V13 §8 lite) so the
// weekly review meeting can focus on whatever is trending.

import { useCallback, useEffect, useState } from "react";

type Domain = "medication" | "identification" | "procedure" | "infection" | "fall" | "equipment" | "communication" | "documentation" | "security" | "other";
type Severity = "minor" | "moderate" | "serious" | "catastrophic_avoided";
type ReviewStatus = "new" | "under_review" | "actioned" | "closed";

interface NearMiss {
  id: string;
  createdAt: string;
  what: string;
  where: string;
  whenAt: string;
  domain: Domain;
  severity: Severity;
  outcome: string;
  reporterEmail: string;
  reporterRole?: string;
  patientId?: string;
  contributingFactors?: string[];
  suggestedFix?: string;
  reviewStatus: ReviewStatus;
}

interface Bucket {
  domain: Domain;
  count: number;
  severityMix: Record<Severity, number>;
}

const SEV_COLOR: Record<Severity, string> = {
  minor: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  serious: "bg-orange-100 text-orange-800",
  catastrophic_avoided: "bg-rose-100 text-rose-800",
};

const STATUS_LABEL: Record<ReviewStatus, string> = {
  new: "New",
  under_review: "Under review",
  actioned: "Actioned",
  closed: "Closed",
};

export default function AdminNearMissPage() {
  const [reports, setReports] = useState<NearMiss[]>([]);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState<"" | Domain>("");
  const [reviewStatus, setReviewStatus] = useState<"" | ReviewStatus>("");

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (domain) qs.set("domain", domain);
    if (reviewStatus) qs.set("reviewStatus", reviewStatus);
    const [reportsResp, bucketResp] = await Promise.all([
      fetch(`/api/near-miss?${qs}`, { cache: "no-store" }),
      fetch("/api/near-miss?aggregate=1&windowDays=30", { cache: "no-store" }),
    ]);
    if (reportsResp.ok) setReports((await reportsResp.json()).reports || []);
    if (bucketResp.ok) setBuckets((await bucketResp.json()).buckets || []);
    setLoading(false);
  }, [domain, reviewStatus]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Near-miss reports</h1>
        <p className="mt-1 text-sm text-gray-600">
          V13 §7 — proactively-surfaced events that could have caused
          harm. Use the weekly pattern review meeting (V13 §8.3) to
          decide which reports escalate to a CAR.
        </p>
      </div>

      {/* Pattern tiles — last 30 days domain mix */}
      {buckets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {buckets.map((b) => (
            <button
              key={b.domain}
              onClick={() => setDomain(b.domain)}
              className={`rounded-2xl border p-4 text-left transition-shadow hover:shadow-md ${domain === b.domain ? "border-[#0F6E56] bg-[#0F6E56]/5" : "border-gray-200 bg-white"}`}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{b.domain.replace("_", " ")}</p>
              <p className="mt-1 text-2xl font-extrabold text-gray-900">{b.count}</p>
              {b.severityMix.catastrophic_avoided + b.severityMix.serious > 0 && (
                <p className="mt-1 text-[11px] font-semibold text-rose-700">
                  {b.severityMix.catastrophic_avoided + b.severityMix.serious} serious+
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-semibold text-gray-600">Domain</label>
        <select value={domain} onChange={(e) => setDomain(e.target.value as "" | Domain)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
          <option value="">All</option>
          {(["medication", "identification", "procedure", "infection", "fall", "equipment", "communication", "documentation", "security", "other"] as Domain[]).map((d) =>
            <option key={d} value={d}>{d.replace("_", " ")}</option>,
          )}
        </select>
        <label className="ml-3 text-xs font-semibold text-gray-600">Status</label>
        <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as "" | ReviewStatus)} className="rounded-lg border border-gray-300 px-2 py-1 text-sm">
          <option value="">All</option>
          {(["new", "under_review", "actioned", "closed"] as ReviewStatus[]).map((s) =>
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>,
          )}
        </select>
      </div>

      {/* Report list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-center text-sm text-gray-500">Loading…</p>
        ) : reports.length === 0 ? (
          <p className="p-6 text-center text-sm text-gray-500">No reports match the filters.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reports.map((r) => (
              <li key={r.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_COLOR[r.severity]}`}>
                        {r.severity.replace("_", " ")}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{r.domain}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{r.where}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-800 whitespace-pre-line">{r.what}</p>
                    {r.suggestedFix && (
                      <p className="mt-2 rounded-lg border-l-4 border-[#1D9E75] bg-[#1D9E75]/5 px-3 py-2 text-xs text-gray-700">
                        <span className="font-bold text-[#0F6E56]">Suggested fix:</span> {r.suggestedFix}
                      </p>
                    )}
                    {r.contributingFactors && r.contributingFactors.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {r.contributingFactors.map((f, i) => (
                          <span key={i} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700">{f}</span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      Event at {new Date(r.whenAt).toLocaleString()} · Reported {new Date(r.createdAt).toLocaleString()} · {r.reporterEmail || "Anonymous"}
                      {r.reporterRole && ` (${r.reporterRole})`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700">
                    {STATUS_LABEL[r.reviewStatus]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
