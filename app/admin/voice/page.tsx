"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHero, StatGrid, StatCard as ShellStatCard } from "@/components/admin/PageShell";

export const dynamic = "force-dynamic";

type VoiceStatus =
  | "recording"
  | "transcribing"
  | "transcribed"
  | "summarizing"
  | "summarized"
  | "failed";

type VoiceKind =
  | "soap"
  | "operative"
  | "radiology"
  | "discharge"
  | "handoff"
  | "progress"
  | "consult"
  | "other";

type VoiceEntityType =
  | "encounter"
  | "admission"
  | "surgery"
  | "radiology"
  | "general";

interface VoiceNote {
  id: string;
  organizationId: string;
  patientId?: string;
  entityType: VoiceEntityType;
  entityId?: string;
  kind: VoiceKind;
  title?: string;
  speaker?: string;
  language: string;
  durationSec?: number;
  audioUrl?: string;
  transcript?: string;
  summary?: string;
  tags: string[];
  status: VoiceStatus;
  errorMessage?: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  mrn?: string;
}

const KIND_LABEL: Record<VoiceKind, string> = {
  soap: "SOAP Note",
  operative: "Operative Note",
  radiology: "Radiology Dictation",
  discharge: "Discharge Summary",
  handoff: "Nursing Handoff",
  progress: "Progress Note",
  consult: "Consult Note",
  other: "Other",
};

const STATUS_COLOR: Record<VoiceStatus, string> = {
  recording: "bg-rose-100 text-rose-700 border-rose-200",
  transcribing: "bg-amber-100 text-amber-700 border-amber-200",
  transcribed: "bg-blue-100 text-blue-700 border-blue-200",
  summarizing: "bg-violet-100 text-violet-700 border-violet-200",
  summarized: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-slate-200 text-slate-700 border-slate-300",
};

const KIND_COLOR: Record<VoiceKind, string> = {
  soap: "bg-sky-50 text-sky-700 border-sky-200",
  operative: "bg-red-50 text-red-700 border-red-200",
  radiology: "bg-indigo-50 text-indigo-700 border-indigo-200",
  discharge: "bg-emerald-50 text-emerald-700 border-emerald-200",
  handoff: "bg-amber-50 text-amber-700 border-amber-200",
  progress: "bg-blue-50 text-blue-700 border-blue-200",
  consult: "bg-violet-50 text-violet-700 border-violet-200",
  other: "bg-slate-50 text-slate-700 border-slate-200",
};

function fmtDuration(s?: number): string {
  if (!s && s !== 0) return "—";
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function VoicePage() {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | VoiceKind>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | VoiceStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    patientId: "",
    entityType: "general" as VoiceEntityType,
    entityId: "",
    kind: "soap" as VoiceKind,
    title: "",
    speaker: "",
    language: "en",
    durationSec: "",
    audioUrl: "",
    transcript: "",
    summary: "",
    tags: "",
  });

  const resetForm = () => {
    setForm({
      patientId: "",
      entityType: "general",
      entityId: "",
      kind: "soap",
      title: "",
      speaker: "",
      language: "en",
      durationSec: "",
      audioUrl: "",
      transcript: "",
      summary: "",
      tags: "",
    });
    setEditingId(null);
  };

  async function loadAll() {
    setLoading(true);
    try {
      const [nRes, pRes] = await Promise.all([
        fetch("/api/hospital/voice"),
        fetch("/api/patients"),
      ]);
      const nJson = await nRes.json();
      const pJson = await pRes.json();
      setNotes(nJson.notes || []);
      setPatients(pJson.patients || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const patientLabel = (id?: string) => {
    if (!id) return "—";
    const p = patients.find((x) => x.id === id);
    return p ? `${p.firstName} ${p.lastName}${p.mrn ? ` (${p.mrn})` : ""}` : id;
  };

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (kindFilter !== "all" && n.kind !== kindFilter) return false;
      if (statusFilter !== "all" && n.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (
          !(n.title || "").toLowerCase().includes(q) &&
          !(n.speaker || "").toLowerCase().includes(q) &&
          !(n.transcript || "").toLowerCase().includes(q) &&
          !(n.summary || "").toLowerCase().includes(q) &&
          !n.tags.some((t) => t.toLowerCase().includes(q))
        )
          return false;
      }
      return true;
    });
  }, [notes, kindFilter, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: notes.length,
      summarized: notes.filter((n) => n.status === "summarized").length,
      pending: notes.filter(
        (n) =>
          n.status === "recording" ||
          n.status === "transcribing" ||
          n.status === "summarizing"
      ).length,
      totalDuration: notes.reduce((s, n) => s + (n.durationSec || 0), 0),
    };
  }, [notes]);

  async function submit() {
    const payload: any = {
      patientId: form.patientId || undefined,
      entityType: form.entityType,
      entityId: form.entityId || undefined,
      kind: form.kind,
      title: form.title || undefined,
      speaker: form.speaker || undefined,
      language: form.language || "en",
      durationSec: form.durationSec ? Number(form.durationSec) : undefined,
      audioUrl: form.audioUrl || undefined,
      transcript: form.transcript || undefined,
      summary: form.summary || undefined,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editingId) payload.id = editingId;

    const res = await fetch("/api/hospital/voice", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      resetForm();
      setShowForm(false);
      loadAll();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed");
    }
  }

  function startEdit(n: VoiceNote) {
    setEditingId(n.id);
    setShowForm(true);
    setForm({
      patientId: n.patientId || "",
      entityType: n.entityType,
      entityId: n.entityId || "",
      kind: n.kind,
      title: n.title || "",
      speaker: n.speaker || "",
      language: n.language,
      durationSec: n.durationSec?.toString() || "",
      audioUrl: n.audioUrl || "",
      transcript: n.transcript || "",
      summary: n.summary || "",
      tags: n.tags.join(", "),
    });
  }

  async function del(id: string) {
    if (!confirm("Delete this voice note?")) return;
    const res = await fetch("/api/hospital/voice", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) loadAll();
  }

  async function summarize(id: string) {
    const res = await fetch("/api/hospital/voice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action: "summarize" }),
    });
    if (res.ok) {
      loadAll();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error === "no_transcript" ? "Add a transcript first." : "Failed");
    }
  }

  async function setStatus(id: string, status: VoiceStatus) {
    await fetch("/api/hospital/voice", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadAll();
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon="🎙️"
        eyebrow="Ambient Scribe"
        title="AI Voice"
        subtitle="Dictations, transcriptions, and AI-synthesized clinical notes"
        tone="violet"
        primaryAction={{ label: showForm ? "Close" : "+ New Voice Note", onClick: () => { resetForm(); setShowForm(!showForm); } }}
      />

      <StatGrid cols={4}>
        <ShellStatCard label="Total notes" value={stats.total} tone="indigo" icon="📝" />
        <ShellStatCard label="Summarized" value={stats.summarized} tone="emerald" icon="✨" />
        <ShellStatCard label="In-flight" value={stats.pending} tone={stats.pending > 0 ? "amber" : "slate"} icon="🔄" />
        <ShellStatCard label="Total audio" value={fmtDuration(stats.totalDuration)} tone="fuchsia" icon="🔊" />
      </StatGrid>

      {/* form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {editingId ? "Edit voice note" : "New voice note"}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Title">
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Morning rounds — Bed 12"
              />
            </Field>
            <Field label="Kind">
              <select
                className="input"
                value={form.kind}
                onChange={(e) =>
                  setForm({ ...form, kind: e.target.value as VoiceKind })
                }
              >
                {Object.entries(KIND_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Speaker">
              <input
                className="input"
                value={form.speaker}
                onChange={(e) =>
                  setForm({ ...form, speaker: e.target.value })
                }
                placeholder="Dr. name"
              />
            </Field>
            <Field label="Patient (optional)">
              <select
                className="input"
                value={form.patientId}
                onChange={(e) =>
                  setForm({ ...form, patientId: e.target.value })
                }
              >
                <option value="">—</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.mrn ? `(${p.mrn})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Entity type">
              <select
                className="input"
                value={form.entityType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    entityType: e.target.value as VoiceEntityType,
                  })
                }
              >
                <option value="general">General</option>
                <option value="encounter">Encounter</option>
                <option value="admission">Admission</option>
                <option value="surgery">Surgery</option>
                <option value="radiology">Radiology</option>
              </select>
            </Field>
            <Field label="Entity ID (optional)">
              <input
                className="input"
                value={form.entityId}
                onChange={(e) =>
                  setForm({ ...form, entityId: e.target.value })
                }
                placeholder="e.g. surg-123"
              />
            </Field>
            <Field label="Language">
              <input
                className="input"
                value={form.language}
                onChange={(e) =>
                  setForm({ ...form, language: e.target.value })
                }
                placeholder="en, en-IN, hi..."
              />
            </Field>
            <Field label="Duration (sec)">
              <input
                className="input"
                type="number"
                min={0}
                value={form.durationSec}
                onChange={(e) =>
                  setForm({ ...form, durationSec: e.target.value })
                }
              />
            </Field>
            <Field label="Audio URL (optional)">
              <input
                className="input"
                value={form.audioUrl}
                onChange={(e) =>
                  setForm({ ...form, audioUrl: e.target.value })
                }
                placeholder="https://..."
              />
            </Field>
            <Field label="Tags (comma-separated)" className="md:col-span-3">
              <input
                className="input"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="rounds, cardiology, follow-up"
              />
            </Field>
            <Field label="Transcript" className="md:col-span-3">
              <textarea
                className="input min-h-[120px]"
                value={form.transcript}
                onChange={(e) =>
                  setForm({ ...form, transcript: e.target.value })
                }
                placeholder="Paste or type the raw transcript here. Example: 'Chief complaint: chest pain. HPI: 55yo male with 2 hours of substernal pressure...'"
              />
            </Field>
            <Field label="Summary (AI-synthesized)" className="md:col-span-3">
              <textarea
                className="input min-h-[100px]"
                value={form.summary}
                onChange={(e) =>
                  setForm({ ...form, summary: e.target.value })
                }
                placeholder="Leave blank to auto-generate after creating."
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={submit}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              {editingId ? "Save changes" : "Create note"}
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search title, speaker, transcript, tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[180px]"
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as any)}
        >
          <option value="all">All kinds</option>
          {Object.entries(KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[180px]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="recording">Recording</option>
          <option value="transcribing">Transcribing</option>
          <option value="transcribed">Transcribed</option>
          <option value="summarizing">Summarizing</option>
          <option value="summarized">Summarized</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No voice notes yet. Click &ldquo;+ New Voice Note&rdquo; to add a dictation
            or transcript.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((n) => {
              const isOpen = expandedId === n.id;
              return (
                <li key={n.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${KIND_COLOR[n.kind]}`}
                        >
                          {KIND_LABEL[n.kind]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLOR[n.status]}`}
                        >
                          {n.status}
                        </span>
                        {n.entityType !== "general" && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                            {n.entityType}
                            {n.entityId ? ` · ${n.entityId}` : ""}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {n.language.toUpperCase()} · {fmtDuration(n.durationSec)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">
                        {n.title || "Untitled note"}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {n.speaker ? `By ${n.speaker} · ` : ""}
                        {fmtDate(n.recordedAt)}
                        {n.patientId ? ` · Patient: ${patientLabel(n.patientId)}` : ""}
                      </div>
                      {n.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {n.tags.map((t) => (
                            <span
                              key={t}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        className="input max-w-[150px] text-xs"
                        value={n.status}
                        onChange={(e) =>
                          setStatus(n.id, e.target.value as VoiceStatus)
                        }
                      >
                        <option value="recording">recording</option>
                        <option value="transcribing">transcribing</option>
                        <option value="transcribed">transcribed</option>
                        <option value="summarizing">summarizing</option>
                        <option value="summarized">summarized</option>
                        <option value="failed">failed</option>
                      </select>
                      <button
                        onClick={() => summarize(n.id)}
                        disabled={!n.transcript}
                        className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-40"
                        title="Synthesize structured summary from transcript"
                      >
                        ✨ Summarize
                      </button>
                      <button
                        onClick={() =>
                          setExpandedId(isOpen ? null : n.id)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        {isOpen ? "Collapse" : "View"}
                      </button>
                      <button
                        onClick={() => startEdit(n)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => del(n.id)}
                        className="rounded-lg border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg bg-slate-50 p-4 md:grid-cols-2">
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Transcript
                        </div>
                        <div className="whitespace-pre-wrap rounded border border-slate-200 bg-white p-3 text-xs text-slate-800">
                          {n.transcript || (
                            <span className="text-slate-400">
                              No transcript yet.
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          AI Summary
                        </div>
                        <div className="whitespace-pre-wrap rounded border border-violet-200 bg-violet-50 p-3 text-xs text-slate-800">
                          {n.summary || (
                            <span className="text-slate-400">
                              No summary yet — click ✨ Summarize.
                            </span>
                          )}
                        </div>
                      </div>
                      {n.audioUrl && (
                        <div className="md:col-span-2">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Audio
                          </div>
                          <a
                            href={n.audioUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 underline"
                          >
                            {n.audioUrl}
                          </a>
                        </div>
                      )}
                      {n.errorMessage && (
                        <div className="md:col-span-2">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-500">
                            Error
                          </div>
                          <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                            {n.errorMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
          color: rgb(15 23 42);
        }
        :global(.input:focus) {
          outline: none;
          border-color: rgb(71 85 105);
          box-shadow: 0 0 0 2px rgb(148 163 184 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent?: "emerald" | "amber" | "violet";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
      ? "text-amber-700"
      : accent === "violet"
      ? "text-violet-700"
      : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
