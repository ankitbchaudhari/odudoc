"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard } from "@/components/admin/PageShell";

type TokenPriority = "emergency" | "senior" | "regular" | "followup";
type TokenStatus =
  | "waiting" | "called" | "serving" | "served" | "skipped" | "no_show" | "cancelled";
type CounterStatus = "open" | "paused" | "closed";

interface Counter {
  id: string;
  counterCode: string;
  name: string;
  serviceType?: string;
  doctor?: string;
  status: CounterStatus;
  currentTokenId?: string;
  tokenCounter: number;
  lastResetDay?: string;
  active: boolean;
}

interface Token {
  id: string;
  counterId: string;
  tokenNumber: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  priority: TokenPriority;
  reason?: string;
  status: TokenStatus;
  issuedAt: string;
  calledAt?: string;
  servingStartedAt?: string;
  servedAt?: string;
  cancelledAt?: string;
  waitSeconds?: number;
  serveSeconds?: number;
  notes?: string;
}

const PRIORITIES: { v: TokenPriority; l: string; cls: string }[] = [
  { v: "emergency", l: "Emergency", cls: "bg-red-100 text-red-700" },
  { v: "senior", l: "Senior citizen", cls: "bg-amber-100 text-amber-700" },
  { v: "regular", l: "Regular", cls: "bg-slate-100 text-slate-700" },
  { v: "followup", l: "Follow-up", cls: "bg-blue-100 text-blue-700" },
];

const STATUSES: { v: TokenStatus; l: string; cls: string }[] = [
  { v: "waiting", l: "Waiting", cls: "bg-slate-100 text-slate-700" },
  { v: "called", l: "Called", cls: "bg-blue-100 text-blue-700" },
  { v: "serving", l: "Serving", cls: "bg-amber-100 text-amber-700" },
  { v: "served", l: "Served", cls: "bg-emerald-100 text-emerald-700" },
  { v: "skipped", l: "Skipped", cls: "bg-orange-100 text-orange-700" },
  { v: "no_show", l: "No show", cls: "bg-slate-200 text-slate-600" },
  { v: "cancelled", l: "Cancelled", cls: "bg-red-100 text-red-700" },
];

const COUNTER_STATUSES: { v: CounterStatus; l: string; cls: string }[] = [
  { v: "open", l: "Open", cls: "bg-emerald-100 text-emerald-700" },
  { v: "paused", l: "Paused", cls: "bg-amber-100 text-amber-700" },
  { v: "closed", l: "Closed", cls: "bg-slate-100 text-slate-600" },
];

function fmtSeconds(s?: number): string {
  if (s === undefined || s === null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
function fmtTime(s?: string): string {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function waitingSeconds(issuedAt: string, tickMs: number): number {
  const issued = new Date(issuedAt).getTime();
  if (Number.isNaN(issued)) return 0;
  return Math.max(0, Math.floor((tickMs - issued) / 1000));
}
function tokenStatusPill(s: TokenStatus): string {
  return STATUSES.find((x) => x.v === s)?.cls || "";
}
function priorityPill(p: TokenPriority): string {
  return PRIORITIES.find((x) => x.v === p)?.cls || "";
}
function counterStatusPill(s: CounterStatus): string {
  return COUNTER_STATUSES.find((x) => x.v === s)?.cls || "";
}

export default function QueuePage() {
  const [tab, setTab] = useState<"live" | "counters" | "history">("live");
  const [counters, setCounters] = useState<Counter[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(Date.now());

  // Issue-token form
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [issueForm, setIssueForm] = useState<Record<string, string>>({});

  // Counter form
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [editingCounterId, setEditingCounterId] = useState<string | null>(null);
  const [counterForm, setCounterForm] = useState<Record<string, string>>({});

  // History filters
  const [historyDate, setHistoryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [historyCounter, setHistoryCounter] = useState("");

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (tab === "history") {
        if (historyDate) qs.set("date", historyDate);
        if (historyCounter) qs.set("counterId", historyCounter);
      } else {
        qs.set("date", new Date().toISOString().slice(0, 10));
      }
      const [cRes, tRes] = await Promise.all([
        fetch(`/api/hospital/queue/counters`, { cache: "no-store" }),
        fetch(`/api/hospital/queue?${qs.toString()}`, { cache: "no-store" }),
      ]);
      if (cRes.ok) setCounters((await cRes.json()).counters || []);
      if (tRes.ok) setTokens((await tRes.json()).tokens || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, historyDate, historyCounter]);

  // Live tab — tick for wait timers, poll every 15s.
  useEffect(() => {
    if (tab !== "live") return;
    const t = window.setInterval(() => setTick(Date.now()), 1000);
    const p = window.setInterval(load, 15000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(p);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const counterMap = useMemo(() => {
    const m = new Map<string, Counter>();
    for (const c of counters) m.set(c.id, c);
    return m;
  }, [counters]);

  const activeTokens = useMemo(
    () => tokens.filter((t) => t.status === "waiting" || t.status === "called" || t.status === "serving"),
    [tokens]
  );

  const stats = useMemo(() => {
    const waiting = tokens.filter((t) => t.status === "waiting").length;
    const serving = tokens.filter((t) => t.status === "serving").length;
    const served = tokens.filter((t) => t.status === "served").length;
    const waits = tokens
      .filter((t) => t.waitSeconds !== undefined && t.waitSeconds > 0)
      .map((t) => t.waitSeconds!);
    const avgWait = waits.length === 0 ? null : Math.round(waits.reduce((a, b) => a + b, 0) / waits.length);
    return { waiting, serving, served, avgWait };
  }, [tokens]);

  function openIssueForm(counterId?: string) {
    setIssueForm({
      counterId: counterId || "",
      priority: "regular",
    });
    setShowIssueForm(true);
  }

  async function saveIssue() {
    if (!issueForm.counterId) { alert("Pick a counter"); return; }
    if (!issueForm.patientName?.trim()) { alert("Patient name required"); return; }
    const body: Record<string, unknown> = {
      counterId: issueForm.counterId,
      patientName: issueForm.patientName,
      patientPhone: issueForm.patientPhone,
      patientAge: issueForm.patientAge ? Number(issueForm.patientAge) : undefined,
      priority: issueForm.priority,
      reason: issueForm.reason,
      notes: issueForm.notes,
    };
    const res = await fetch("/api/hospital/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setShowIssueForm(false);
      setIssueForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function callNext(counterId: string) {
    const res = await fetch("/api/hospital/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "callNext", counterId }),
    });
    if (res.ok) {
      const d = await res.json();
      if (!d.token) alert("No one waiting");
      load();
    }
  }

  async function quickStatus(id: string, status: TokenStatus) {
    await fetch("/api/hospital/queue", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  async function deleteTokenById(id: string) {
    if (!confirm("Delete this token?")) return;
    await fetch("/api/hospital/queue", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  function openCounterForm(c?: Counter) {
    if (c) {
      setEditingCounterId(c.id);
      setCounterForm({
        name: c.name,
        serviceType: c.serviceType || "",
        doctor: c.doctor || "",
        status: c.status,
        active: c.active ? "1" : "0",
      });
    } else {
      setEditingCounterId(null);
      setCounterForm({ status: "open", active: "1" });
    }
    setShowCounterForm(true);
  }

  async function saveCounter() {
    if (!counterForm.name?.trim()) { alert("Name required"); return; }
    const body: Record<string, unknown> = {
      name: counterForm.name,
      serviceType: counterForm.serviceType,
      doctor: counterForm.doctor,
      status: counterForm.status,
      active: counterForm.active === "1",
    };
    const res = await fetch("/api/hospital/queue/counters", {
      method: editingCounterId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingCounterId ? { id: editingCounterId, ...body } : body),
    });
    if (res.ok) {
      setShowCounterForm(false);
      setEditingCounterId(null);
      setCounterForm({});
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(`Failed: ${d.error || res.statusText}`);
    }
  }

  async function deleteCounterById(id: string) {
    if (!confirm("Delete this counter? Any active tokens will be cancelled.")) return;
    await fetch("/api/hospital/queue/counters", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🎫"
        eyebrow="OPD Live"
        title="OPD Queue & Tokens"
        subtitle="Live walk-in queue for consulting rooms with priority handling and wait-time telemetry"
        tone="violet"
        primaryAction={
          tab === "counters"
            ? { label: "+ Add Counter", onClick: () => openCounterForm() }
            : { label: "+ Issue Token", onClick: () => openIssueForm() }
        }
      />

      <StatGrid cols={4}>
        <StatCard label="Waiting" value={stats.waiting} tone={stats.waiting > 0 ? "amber" : "slate"} icon="⏳" />
        <StatCard label="Serving" value={stats.serving} tone="sky" icon="🔔" />
        <StatCard label="Served today" value={stats.served} tone="emerald" icon="✓" />
        <StatCard label="Avg wait" value={stats.avgWait === null ? "—" : fmtSeconds(stats.avgWait)} tone="indigo" icon="⏱️" />
      </StatGrid>

      <div className="flex gap-1 border-b border-slate-200">
        {(["live", "counters", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t ? "border-b-2 border-primary-600 text-primary-700" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "live" ? "Live Queue" : t === "counters" ? "Counters" : "History"}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {counters.filter((c) => c.active).length === 0 ? (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">
              No active counters yet. Go to the <button onClick={() => setTab("counters")} className="text-primary-600 underline">Counters</button> tab to add one.
            </div>
          ) : (
            counters.filter((c) => c.active).map((c) => {
              const counterTokens = activeTokens.filter((t) => t.counterId === c.id);
              const current = counterTokens.find((t) => t.id === c.currentTokenId);
              const queue = counterTokens.filter((t) => t.id !== c.currentTokenId);
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-semibold text-slate-900">{c.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${counterStatusPill(c.status)}`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {c.serviceType || "—"} {c.doctor ? `· Dr. ${c.doctor}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => callNext(c.id)}
                      disabled={c.status !== "open"}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
                    >
                      Call next
                    </button>
                  </div>

                  {/* Currently serving */}
                  <div className="bg-gradient-to-br from-amber-50 to-white px-4 py-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Now serving</div>
                    {current ? (
                      <>
                        <div className="mt-1 flex items-baseline gap-3">
                          <span className="font-mono text-3xl font-bold text-slate-900">{current.tokenNumber}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tokenStatusPill(current.status)}`}>
                            {STATUSES.find((s) => s.v === current.status)?.l}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityPill(current.priority)}`}>
                            {PRIORITIES.find((p) => p.v === current.priority)?.l}
                          </span>
                        </div>
                        <div className="mt-1 text-[13px] font-medium text-slate-800">
                          {current.patientName}
                          {current.patientAge !== undefined && <span className="text-slate-400"> · {current.patientAge}y</span>}
                        </div>
                        {current.reason && <div className="text-[12px] text-slate-500">{current.reason}</div>}
                        <div className="mt-2 flex gap-2">
                          {current.status === "called" && (
                            <button onClick={() => quickStatus(current.id, "serving")} className="rounded bg-amber-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-amber-700">Start</button>
                          )}
                          {current.status === "serving" && (
                            <button onClick={() => quickStatus(current.id, "served")} className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700">Complete</button>
                          )}
                          <button onClick={() => quickStatus(current.id, "no_show")} className="rounded bg-slate-200 px-2.5 py-1 text-[11px] text-slate-700 hover:bg-slate-300">No show</button>
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-[13px] italic text-slate-400">Idle — press &quot;Call next&quot;.</div>
                    )}
                  </div>

                  {/* Queue */}
                  <div className="divide-y divide-slate-100">
                    <div className="flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <span>In queue ({queue.length})</span>
                      <button onClick={() => openIssueForm(c.id)} className="text-[11px] font-medium normal-case text-primary-600 hover:text-primary-700">+ Issue token</button>
                    </div>
                    {queue.length === 0 && (
                      <div className="px-4 py-4 text-center text-[12px] text-slate-400">Queue is empty.</div>
                    )}
                    {queue.slice(0, 8).map((t) => {
                      const wait = t.waitSeconds !== undefined ? t.waitSeconds : waitingSeconds(t.issuedAt, tick);
                      const over20 = wait > 1200;
                      return (
                        <div key={t.id} className="flex items-center justify-between px-4 py-2">
                          <div className="flex items-center gap-3">
                            <span className={`font-mono text-sm font-bold ${t.priority === "emergency" ? "text-red-700" : "text-slate-800"}`}>{t.tokenNumber}</span>
                            <div>
                              <div className="text-[13px] font-medium text-slate-800">{t.patientName}</div>
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className={`rounded-full px-1.5 py-0.5 font-medium ${priorityPill(t.priority)}`}>
                                  {PRIORITIES.find((p) => p.v === t.priority)?.l}
                                </span>
                                <span className={`rounded-full px-1.5 py-0.5 font-medium ${tokenStatusPill(t.status)}`}>
                                  {STATUSES.find((s) => s.v === t.status)?.l}
                                </span>
                                <span className={over20 ? "text-red-600 font-semibold" : "text-slate-500"}>
                                  {fmtSeconds(wait)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {t.status === "waiting" && (
                              <button onClick={() => quickStatus(t.id, "called")} className="rounded bg-blue-100 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-200">Call</button>
                            )}
                            <button onClick={() => quickStatus(t.id, "cancelled")} className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 hover:bg-red-100">Cancel</button>
                          </div>
                        </div>
                      );
                    })}
                    {queue.length > 8 && (
                      <div className="px-4 py-2 text-center text-[11px] text-slate-500">
                        + {queue.length - 8} more waiting…
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "counters" && (
        <Section>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : counters.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No counters yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Service</th>
                    <th className="py-2 pr-3">Doctor</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Tokens today</th>
                    <th className="py-2 pr-3">Active</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {counters.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-600">{c.counterCode}</td>
                      <td className="py-2 pr-3 font-medium text-slate-800">{c.name}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.serviceType || "—"}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.doctor || "—"}</td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${counterStatusPill(c.status)}`}>
                          {COUNTER_STATUSES.find((s) => s.v === c.status)?.l}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-600">{c.lastResetDay === new Date().toISOString().slice(0, 10) ? c.tokenCounter : 0}</td>
                      <td className="py-2 pr-3 text-slate-600">{c.active ? "Yes" : "No"}</td>
                      <td className="py-2 pr-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openCounterForm(c)} className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200">Edit</button>
                          <button onClick={() => deleteCounterById(c.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {tab === "history" && (
        <Section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field label="Date">
              <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value)} className="inp" />
            </Field>
            <Field label="Counter">
              <select value={historyCounter} onChange={(e) => setHistoryCounter(e.target.value)} className="inp">
                <option value="">All</option>
                {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading…</div>
          ) : tokens.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No tokens for this filter.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">Token</th>
                    <th className="py-2 pr-3">Counter</th>
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Issued</th>
                    <th className="py-2 pr-3">Wait</th>
                    <th className="py-2 pr-3">Serve</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tokens.map((t) => {
                    const c = counterMap.get(t.counterId);
                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-2 pr-3 font-mono text-sm font-bold text-slate-800">{t.tokenNumber}</td>
                        <td className="py-2 pr-3 text-slate-700">{c?.name || "—"}</td>
                        <td className="py-2 pr-3 text-slate-700">{t.patientName}</td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityPill(t.priority)}`}>
                            {PRIORITIES.find((p) => p.v === t.priority)?.l}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tokenStatusPill(t.status)}`}>
                            {STATUSES.find((s) => s.v === t.status)?.l}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-slate-600">{fmtTime(t.issuedAt)}</td>
                        <td className="py-2 pr-3 text-slate-600">{fmtSeconds(t.waitSeconds)}</td>
                        <td className="py-2 pr-3 text-slate-600">{fmtSeconds(t.serveSeconds)}</td>
                        <td className="py-2 pr-3 text-right">
                          <button onClick={() => deleteTokenById(t.id)} className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600 hover:bg-red-100">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {/* Issue token modal */}
      {showIssueForm && (
        <Modal onClose={() => setShowIssueForm(false)} title="Issue Token">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Counter *">
              <select value={issueForm.counterId || ""} onChange={(e) => setIssueForm({ ...issueForm, counterId: e.target.value })} className="inp">
                <option value="">— Select counter —</option>
                {counters.filter((c) => c.active && c.status !== "closed").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.doctor ? ` · Dr. ${c.doctor}` : ""}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select value={issueForm.priority || "regular"} onChange={(e) => setIssueForm({ ...issueForm, priority: e.target.value })} className="inp">
                {PRIORITIES.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            </Field>
            <Field label="Patient name *">
              <input value={issueForm.patientName || ""} onChange={(e) => setIssueForm({ ...issueForm, patientName: e.target.value })} className="inp" />
            </Field>
            <Field label="Age">
              <input type="number" value={issueForm.patientAge || ""} onChange={(e) => setIssueForm({ ...issueForm, patientAge: e.target.value })} className="inp" />
            </Field>
            <Field label="Phone">
              <input value={issueForm.patientPhone || ""} onChange={(e) => setIssueForm({ ...issueForm, patientPhone: e.target.value })} className="inp" />
            </Field>
            <Field label="Reason">
              <input value={issueForm.reason || ""} onChange={(e) => setIssueForm({ ...issueForm, reason: e.target.value })} className="inp" placeholder="Fever, follow-up, etc." />
            </Field>
            <Field label="Notes" span={2}>
              <textarea value={issueForm.notes || ""} onChange={(e) => setIssueForm({ ...issueForm, notes: e.target.value })} className="inp" rows={2} />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowIssueForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveIssue} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              Issue token
            </button>
          </div>
        </Modal>
      )}

      {/* Counter modal */}
      {showCounterForm && (
        <Modal onClose={() => setShowCounterForm(false)} title={editingCounterId ? "Edit Counter" : "Add Counter"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name *">
              <input value={counterForm.name || ""} onChange={(e) => setCounterForm({ ...counterForm, name: e.target.value })} className="inp" placeholder="OPD-1 / ENT Room 2" />
            </Field>
            <Field label="Service type">
              <input value={counterForm.serviceType || ""} onChange={(e) => setCounterForm({ ...counterForm, serviceType: e.target.value })} className="inp" placeholder="General OPD / Cardiology" />
            </Field>
            <Field label="Doctor">
              <input value={counterForm.doctor || ""} onChange={(e) => setCounterForm({ ...counterForm, doctor: e.target.value })} className="inp" placeholder="Dr. Rao" />
            </Field>
            <Field label="Status">
              <select value={counterForm.status || "open"} onChange={(e) => setCounterForm({ ...counterForm, status: e.target.value })} className="inp">
                {COUNTER_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </Field>
            <Field label="Active">
              <select value={counterForm.active || "1"} onChange={(e) => setCounterForm({ ...counterForm, active: e.target.value })} className="inp">
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowCounterForm(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveCounter} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
              {editingCounterId ? "Save" : "Add counter"}
            </button>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 13px;
          background: white;
          color: rgb(15 23 42);
        }
        .inp:focus {
          outline: none;
          border-color: rgb(14 165 233);
          box-shadow: 0 0 0 3px rgb(186 230 253 / 0.4);
        }
      `}</style>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone: "emerald" | "amber" | "red" | "blue" | "slate" }) {
  const toneCls: Record<string, string> = {
    emerald: "text-emerald-700 bg-emerald-50 ring-emerald-200",
    amber: "text-amber-700 bg-amber-50 ring-amber-200",
    red: "text-red-700 bg-red-50 ring-red-200",
    blue: "text-blue-700 bg-blue-50 ring-blue-200",
    slate: "text-slate-700 bg-slate-50 ring-slate-200",
  };
  return (
    <div className={`rounded-xl p-4 ring-1 ${toneCls[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5">{children}</div>;
}

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <label className={span === 2 ? "col-span-2 block" : "block"}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
