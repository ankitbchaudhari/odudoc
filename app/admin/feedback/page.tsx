"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";
import type {
  FeedbackSurvey,
  FeedbackSource,
  FeedbackStatus,
  FeedbackTag,
  FeedbackAnalytics,
} from "@/lib/hospital/feedback-store";
// Inlined from feedback-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const SOURCE_LABEL: Record<FeedbackSource, string> = {
  opd: "OPD",
  ipd: "IPD / Admission",
  ed: "Emergency",
  lab: "Laboratory",
  radiology: "Radiology",
  pharmacy: "Pharmacy",
  ambulance: "Ambulance",
  portal: "Patient Portal",
  other: "Other",
};
const TAG_LABEL: Record<FeedbackTag, string> = {
  compliment: "Compliment",
  complaint: "Complaint",
  suggestion: "Suggestion",
  none: "—",
};

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

const SOURCES: FeedbackSource[] = [
  "opd",
  "ipd",
  "ed",
  "lab",
  "radiology",
  "pharmacy",
  "ambulance",
  "portal",
  "other",
];

const STATUSES: FeedbackStatus[] = ["pending", "submitted", "reviewed", "closed"];
const TAGS: FeedbackTag[] = ["none", "compliment", "complaint", "suggestion"];

const STATUS_COLOR: Record<FeedbackStatus, string> = {
  pending: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  reviewed: "bg-amber-100 text-amber-800",
  closed: "bg-emerald-100 text-emerald-700",
};

const TAG_COLOR: Record<FeedbackTag, string> = {
  none: "bg-slate-100 text-slate-600",
  compliment: "bg-emerald-100 text-emerald-700",
  complaint: "bg-rose-100 text-rose-700",
  suggestion: "bg-sky-100 text-sky-700",
};

interface FormState {
  patientId: string;
  patientName: string;
  department: string;
  source: FeedbackSource;
  visitDate: string;
  ratingDoctor: number;
  ratingNursing: number;
  ratingCleanliness: number;
  ratingBilling: number;
  ratingFood: number;
  ratingOverall: number;
  nps: number;
  tag: FeedbackTag;
  comments: string;
}

const EMPTY_FORM: FormState = {
  patientId: "",
  patientName: "",
  department: "",
  source: "opd",
  visitDate: "",
  ratingDoctor: 0,
  ratingNursing: 0,
  ratingCleanliness: 0,
  ratingBilling: 0,
  ratingFood: 0,
  ratingOverall: 0,
  nps: 0,
  tag: "none",
  comments: "",
};

export default function FeedbackPage() {
  const [tab, setTab] = useState<"surveys" | "analytics">("surveys");
  const [surveys, setSurveys] = useState<FeedbackSurvey[]>([]);
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<FeedbackStatus | "">("");
  const [filterSource, setFilterSource] = useState<FeedbackSource | "">("");
  const [filterTag, setFilterTag] = useState<FeedbackTag | "">("");
  const [followupOnly, setFollowupOnly] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<FeedbackSurvey | null>(null);
  const [reviewBy, setReviewBy] = useState("");
  const [reviewOwner, setReviewOwner] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSource) params.set("source", filterSource);
    if (filterTag) params.set("tag", filterTag);
    if (followupOnly) params.set("followupOnly", "1");
    const [fbRes, patRes] = await Promise.all([
      fetch(`/api/hospital/feedback?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/patients", { cache: "no-store" }),
    ]);
    if (fbRes.ok) {
      const d = await fbRes.json();
      setSurveys(d.surveys || []);
      setAnalytics(d.analytics || null);
    }
    if (patRes.ok) {
      const d = await patRes.json();
      setPatients(d.patients || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [filterStatus, filterSource, filterTag, followupOnly]);

  async function submitForm() {
    if (!form.patientName && !form.patientId) {
      alert("Patient name required");
      return;
    }
    const body: Record<string, unknown> = { ...form };
    if (form.patientId) {
      const p = patients.find((x) => x.id === form.patientId);
      if (p) body.patientName = `${p.firstName} ${p.lastName}`;
    }
    const res = await fetch("/api/hospital/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowForm(false);
      setForm(EMPTY_FORM);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Failed to save");
    }
  }

  async function updateStatus(id: string, status: FeedbackStatus, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/hospital/feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status, ...extra }),
    });
    if (res.ok) load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this feedback?")) return;
    await fetch("/api/hospital/feedback", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function openReview(s: FeedbackSurvey) {
    setReviewing(s);
    setReviewBy(s.reviewedBy || "");
    setReviewOwner(s.followupOwner || "");
    setReviewNotes(s.followupResolution || "");
  }

  async function submitReview(close: boolean) {
    if (!reviewing) return;
    await fetch("/api/hospital/feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: reviewing.id,
        status: close ? "closed" : "reviewed",
        reviewedBy: reviewBy,
        followupOwner: reviewOwner,
        followupResolution: reviewNotes,
      }),
    });
    setReviewing(null);
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="⭐"
        eyebrow="Voice of Patient"
        title="Patient Feedback & NPS"
        subtitle="Post-visit satisfaction tracking with NABH-aligned complaint escalation"
        tone="violet"
        primaryAction={{ label: "+ New Feedback", onClick: () => { setShowForm(true); setForm(EMPTY_FORM); } }}
      />

      {analytics && (
        <StatGrid cols={4}>
          <StatCard label="Total responses" value={analytics.submitted} tone="indigo" hint={`${analytics.pendingReview} awaiting review`} icon="📨" />
          <StatCard
            label="Overall rating"
            value={analytics.avgOverall ? `${analytics.avgOverall}/5` : "—"}
            hint={`Doc ${analytics.avgDoctor || "—"} · Nursing ${analytics.avgNursing || "—"}`}
            tone={analytics.avgOverall >= 4 ? "emerald" : analytics.avgOverall >= 3 ? "amber" : analytics.avgOverall > 0 ? "rose" : "slate"}
            icon="⭐"
          />
          <StatCard
            label="Net Promoter Score"
            value={analytics.nps === 0 && analytics.promoters + analytics.detractors === 0 ? "—" : analytics.nps}
            hint={`${analytics.promoters} prom · ${analytics.passives} pass · ${analytics.detractors} detr`}
            tone={analytics.nps >= 50 ? "emerald" : analytics.nps >= 0 ? "amber" : "rose"}
            icon="📈"
          />
          <StatCard label="Open complaints" value={analytics.openComplaints} tone={analytics.openComplaints > 0 ? "rose" : "teal"} hint="Follow-up needed" icon="📢" />
        </StatGrid>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        <TabBtn active={tab === "surveys"} onClick={() => setTab("surveys")}>
          Surveys
        </TabBtn>
        <TabBtn active={tab === "analytics"} onClick={() => setTab("analytics")}>
          Analytics
        </TabBtn>
      </div>

      {tab === "surveys" && (
        <Section>
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FeedbackStatus | "")}
              className="inp"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value as FeedbackSource | "")}
              className="inp"
            >
              <option value="">All sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value as FeedbackTag | "")}
              className="inp"
            >
              <option value="">All tags</option>
              {TAGS.map((t) => (
                <option key={t} value={t}>
                  {TAG_LABEL[t]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={followupOnly}
                onChange={(e) => setFollowupOnly(e.target.checked)}
              />
              Follow-up needed only
            </label>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading…</div>
          ) : surveys.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No feedback yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Ref</th>
                    <th className="py-2 pr-3">Patient / Source</th>
                    <th className="py-2 pr-3">Ratings</th>
                    <th className="py-2 pr-3">NPS</th>
                    <th className="py-2 pr-3">Tag</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Flag</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {surveys.map((s) => (
                    <SurveyRow
                      key={s.id}
                      survey={s}
                      expanded={expanded === s.id}
                      onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                      onReview={() => openReview(s)}
                      onUpdateStatus={updateStatus}
                      onDelete={() => remove(s.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "analytics" && analytics && (
        <AnalyticsView analytics={analytics} surveys={surveys} />
      )}

      {/* New feedback modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="New patient feedback">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Patient (linked)">
                <select
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                  className="inp w-full"
                >
                  <option value="">— walk-in / anonymous —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Name (if unlinked)">
                <input
                  type="text"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="inp w-full"
                  placeholder="Walk-in name"
                />
              </Field>
              <Field label="Department">
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="inp w-full"
                  placeholder="Cardiology"
                />
              </Field>
              <Field label="Source">
                <select
                  value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value as FeedbackSource })}
                  className="inp w-full"
                >
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {SOURCE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Visit date">
                <input
                  type="date"
                  value={form.visitDate}
                  onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                  className="inp w-full"
                />
              </Field>
              <Field label="Tag">
                <select
                  value={form.tag}
                  onChange={(e) => setForm({ ...form, tag: e.target.value as FeedbackTag })}
                  className="inp w-full"
                >
                  {TAGS.map((t) => (
                    <option key={t} value={t}>
                      {TAG_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                Dimension ratings (1–5)
              </div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <RatingField label="Doctor" value={form.ratingDoctor} onChange={(v) => setForm({ ...form, ratingDoctor: v })} max={5} />
                <RatingField label="Nursing" value={form.ratingNursing} onChange={(v) => setForm({ ...form, ratingNursing: v })} max={5} />
                <RatingField label="Cleanliness" value={form.ratingCleanliness} onChange={(v) => setForm({ ...form, ratingCleanliness: v })} max={5} />
                <RatingField label="Billing" value={form.ratingBilling} onChange={(v) => setForm({ ...form, ratingBilling: v })} max={5} />
                <RatingField label="Food" value={form.ratingFood} onChange={(v) => setForm({ ...form, ratingFood: v })} max={5} />
                <RatingField label="Overall" value={form.ratingOverall} onChange={(v) => setForm({ ...form, ratingOverall: v })} max={5} />
              </div>
            </div>

            <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                Net Promoter Score (0–10)
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={form.nps}
                  onChange={(e) => setForm({ ...form, nps: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-10 text-right font-bold text-indigo-900">{form.nps}</span>
                <span
                  className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                    form.nps >= 9
                      ? "bg-emerald-100 text-emerald-700"
                      : form.nps >= 7
                      ? "bg-amber-100 text-amber-800"
                      : form.nps > 0
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {form.nps >= 9 ? "Promoter" : form.nps >= 7 ? "Passive" : form.nps > 0 ? "Detractor" : "—"}
                </span>
              </div>
            </div>

            <Field label="Comments">
              <textarea
                value={form.comments}
                onChange={(e) => setForm({ ...form, comments: e.target.value })}
                className="inp min-h-[80px] w-full"
                placeholder="What did the patient say?"
              />
            </Field>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitForm}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Save feedback
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Review modal */}
      {reviewing && (
        <Modal onClose={() => setReviewing(null)} title={`Review ${reviewing.feedbackNumber}`}>
          <div className="space-y-3">
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="font-semibold text-slate-800">
                {reviewing.patientName || "Anonymous"} · {SOURCE_LABEL[reviewing.source]}
              </div>
              {reviewing.comments && (
                <div className="mt-1 text-slate-600">&ldquo;{reviewing.comments}&rdquo;</div>
              )}
            </div>
            <Field label="Reviewed by">
              <input
                type="text"
                value={reviewBy}
                onChange={(e) => setReviewBy(e.target.value)}
                className="inp w-full"
              />
            </Field>
            <Field label="Follow-up owner">
              <input
                type="text"
                value={reviewOwner}
                onChange={(e) => setReviewOwner(e.target.value)}
                className="inp w-full"
                placeholder="Who's handling the recovery?"
              />
            </Field>
            <Field label="Resolution / action taken">
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="inp min-h-[80px] w-full"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReviewing(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReview(false)}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Mark reviewed
              </button>
              <button
                onClick={() => submitReview(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Close case
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .inp {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
        }
        .inp:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(191 219 254 / 0.4);
        }
      `}</style>
    </div>
  );
}

function SurveyRow({
  survey: s,
  expanded,
  onToggle,
  onReview,
  onUpdateStatus,
  onDelete,
}: {
  survey: FeedbackSurvey;
  expanded: boolean;
  onToggle: () => void;
  onReview: () => void;
  onUpdateStatus: (id: string, st: FeedbackStatus) => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className={`${s.followupNeeded ? "bg-rose-50/40" : ""} cursor-pointer hover:bg-slate-50`} onClick={onToggle}>
        <td className="py-2 pr-3 font-mono text-xs text-slate-700">{s.feedbackNumber}</td>
        <td className="py-2 pr-3">
          <div className="font-medium text-slate-800">{s.patientName || "Anonymous"}</div>
          <div className="text-[11px] text-slate-500">
            {SOURCE_LABEL[s.source]}{s.department ? ` · ${s.department}` : ""}
          </div>
        </td>
        <td className="py-2 pr-3">
          <div className="flex items-center gap-1">
            <span
              className={`font-semibold ${
                s.ratingOverall >= 4
                  ? "text-emerald-700"
                  : s.ratingOverall >= 3
                  ? "text-amber-700"
                  : s.ratingOverall > 0
                  ? "text-rose-700"
                  : "text-slate-400"
              }`}
            >
              {s.ratingOverall > 0 ? `${s.ratingOverall}/5` : "—"}
            </span>
            <span className="text-[10px] text-slate-400">overall</span>
          </div>
        </td>
        <td className="py-2 pr-3">
          <span
            className={`rounded px-2 py-0.5 text-xs font-semibold ${
              s.nps >= 9
                ? "bg-emerald-100 text-emerald-700"
                : s.nps >= 7
                ? "bg-amber-100 text-amber-800"
                : s.nps > 0
                ? "bg-rose-100 text-rose-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {s.nps > 0 ? s.nps : "—"}
          </span>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${TAG_COLOR[s.tag]}`}>
            {TAG_LABEL[s.tag]}
          </span>
        </td>
        <td className="py-2 pr-3">
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLOR[s.status]}`}>
            {s.status}
          </span>
        </td>
        <td className="py-2 pr-3">
          {s.followupNeeded && (
            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
              Follow-up
            </span>
          )}
        </td>
        <td className="py-2 pr-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-1">
            {s.status === "submitted" && (
              <button
                onClick={onReview}
                className="rounded bg-amber-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
              >
                Review
              </button>
            )}
            {s.status === "reviewed" && (
              <button
                onClick={onReview}
                className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
              >
                Close
              </button>
            )}
            {s.status !== "closed" && s.status !== "pending" && (
              <button
                onClick={() => onUpdateStatus(s.id, "closed")}
                className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
              >
                Archive
              </button>
            )}
            <button
              onClick={onDelete}
              className="rounded border border-rose-300 px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
            >
              Del
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-50">
          <td colSpan={8} className="px-3 py-3">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <KV k="Doctor" v={s.ratingDoctor ? `${s.ratingDoctor}/5` : "—"} />
              <KV k="Nursing" v={s.ratingNursing ? `${s.ratingNursing}/5` : "—"} />
              <KV k="Cleanliness" v={s.ratingCleanliness ? `${s.ratingCleanliness}/5` : "—"} />
              <KV k="Billing" v={s.ratingBilling ? `${s.ratingBilling}/5` : "—"} />
              <KV k="Food" v={s.ratingFood ? `${s.ratingFood}/5` : "—"} />
              <KV k="Visit date" v={s.visitDate || "—"} />
              <KV k="Submitted" v={s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : "—"} />
              <KV k="Reviewed by" v={s.reviewedBy || "—"} />
            </div>
            {s.comments && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Comments</div>
                <div className="mt-1 text-sm italic text-slate-700">&ldquo;{s.comments}&rdquo;</div>
              </div>
            )}
            {s.followupResolution && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-[10px] uppercase tracking-wide text-emerald-700">
                  Resolution{s.followupOwner ? ` · ${s.followupOwner}` : ""}
                </div>
                <div className="mt-1 text-sm text-slate-700">{s.followupResolution}</div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function AnalyticsView({
  analytics,
  surveys,
}: {
  analytics: FeedbackAnalytics;
  surveys: FeedbackSurvey[];
}) {
  const bySource = useMemo(() => {
    const map = new Map<FeedbackSource, { n: number; sum: number }>();
    for (const s of surveys) {
      if (s.status === "pending" || !s.ratingOverall) continue;
      const m = map.get(s.source) || { n: 0, sum: 0 };
      m.n++;
      m.sum += s.ratingOverall;
      map.set(s.source, m);
    }
    return Array.from(map.entries()).map(([src, v]) => ({
      src,
      n: v.n,
      avg: Math.round((v.sum / v.n) * 10) / 10,
    }));
  }, [surveys]);

  const total = analytics.promoters + analytics.passives + analytics.detractors;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <Section title="Dimension averages">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
          {[
            ["Overall", analytics.avgOverall],
            ["Doctor", analytics.avgDoctor],
            ["Nursing", analytics.avgNursing],
            ["Cleanliness", analytics.avgCleanliness],
            ["Billing", analytics.avgBilling],
            ["Food", analytics.avgFood],
          ].map(([label, v]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
              <div
                className={`mt-1 text-2xl font-bold ${
                  (v as number) >= 4
                    ? "text-emerald-600"
                    : (v as number) >= 3
                    ? "text-amber-600"
                    : (v as number) > 0
                    ? "text-rose-600"
                    : "text-slate-400"
                }`}
              >
                {(v as number) > 0 ? `${v}/5` : "—"}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="NPS distribution">
        <div className="flex h-8 overflow-hidden rounded-lg">
          <div
            className="flex items-center justify-center bg-rose-500 text-[11px] font-semibold text-white"
            style={{ width: `${pct(analytics.detractors)}%` }}
          >
            {analytics.detractors > 0 && `${pct(analytics.detractors)}% detractors`}
          </div>
          <div
            className="flex items-center justify-center bg-amber-400 text-[11px] font-semibold text-white"
            style={{ width: `${pct(analytics.passives)}%` }}
          >
            {analytics.passives > 0 && `${pct(analytics.passives)}% passives`}
          </div>
          <div
            className="flex items-center justify-center bg-emerald-500 text-[11px] font-semibold text-white"
            style={{ width: `${pct(analytics.promoters)}%` }}
          >
            {analytics.promoters > 0 && `${pct(analytics.promoters)}% promoters`}
          </div>
        </div>
        <div className="mt-3 text-sm text-slate-600">
          NPS ={" "}
          <span
            className={`text-xl font-bold ${
              analytics.nps >= 50
                ? "text-emerald-600"
                : analytics.nps >= 0
                ? "text-amber-600"
                : "text-rose-600"
            }`}
          >
            {analytics.nps}
          </span>
          <span className="ml-2 text-xs text-slate-400">
            (% promoters − % detractors, range −100 to +100)
          </span>
        </div>
      </Section>

      <Section title="Rating by source">
        {bySource.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">No submitted data yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Responses</th>
                <th className="py-2 pr-3">Avg overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bySource
                .sort((a, b) => b.avg - a.avg)
                .map((r) => (
                  <tr key={r.src}>
                    <td className="py-2 pr-3 font-medium text-slate-800">
                      {SOURCE_LABEL[r.src]}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">{r.n}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`font-bold ${
                          r.avg >= 4
                            ? "text-emerald-600"
                            : r.avg >= 3
                            ? "text-amber-600"
                            : "text-rose-600"
                        }`}
                      >
                        {r.avg}/5
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  color = "slate",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "slate" | "emerald" | "amber" | "rose";
}) {
  const colors: Record<string, string> = {
    slate: "text-slate-900",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    rose: "text-rose-600",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-500">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-800">{title}</h2>}
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function RatingField({
  label,
  value,
  onChange,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  max: number;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-semibold text-slate-600">{label}</div>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => {
          const n = i + 1;
          const active = n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(value === n ? 0 : n)}
              className={`h-8 w-8 rounded border text-sm font-bold transition ${
                active
                  ? "border-amber-400 bg-amber-400 text-white"
                  : "border-slate-300 bg-white text-slate-400 hover:bg-slate-100"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{k}</div>
      <div className="text-sm text-slate-800">{v}</div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary-500 text-primary-700"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
