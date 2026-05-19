"use client";

// CTMS protocols list (separate path from existing /admin/ctms
// which uses a different store). Lets the PI create new protocols
// + view active ones. Subject enrolment + AE reporting are sibling
// pages via separate routes when wired up.

import { useCallback, useEffect, useState } from "react";

type Phase = "I" | "II" | "III" | "IV" | "PMS";
type Status = "draft" | "irb_review" | "active" | "closed" | "suspended";

interface Protocol {
  id: string;
  protocolNumber: string;
  sponsor: string;
  title: string;
  phase: Phase;
  siteIds: string[];
  irbApprovalRef?: string;
  irbExpiresOn?: string;
  visitSchedule: Array<{ name: string; dayOffset: number; window: number }>;
  inclusion: string[];
  exclusion: string[];
  status: Status;
  createdAt: string;
}

const STATUS_PALETTE: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-700",
  irb_review: "bg-amber-100 text-amber-900",
  active: "bg-emerald-100 text-emerald-800",
  closed: "bg-slate-200 text-slate-600",
  suspended: "bg-rose-100 text-rose-800",
};

export default function CtmsProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Protocol | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ctms/protocols${activeOnly ? "?activeOnly=true" : ""}`, { cache: "no-store" });
      const j = await r.json();
      setProtocols(j.protocols || []);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <main className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">CTMS · Protocols</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Clinical trial protocols</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Sponsor + protocol number + phase + IRB approval. Subject enrolment opens once a protocol is
            active (requires IRB ref).
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <button
            onClick={() => setCreating(true)}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white"
          >
            + New protocol
          </button>
        </div>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {loading && protocols.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Loading…</p>
        ) : protocols.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">No protocols yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {protocols.map((p) => (
              <li key={p.id} onClick={() => setSelected(p)} className="cursor-pointer p-4 hover:bg-slate-50 dark:hover:bg-slate-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{p.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_PALETTE[p.status]}`}>
                        {p.status.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Phase {p.phase}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
                      {p.sponsor} · {p.protocolNumber}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {p.siteIds.length} site{p.siteIds.length === 1 ? "" : "s"} · {p.visitSchedule.length} visits in schedule
                      {p.irbApprovalRef && <> · IRB {p.irbApprovalRef}</>}
                      {p.irbExpiresOn && <> (expires {p.irbExpiresOn})</>}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating && <CreateModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); refresh(); }} />}
      {selected && <DetailDrawer protocol={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    protocolNumber: "",
    sponsor: "",
    title: "",
    phase: "II" as Phase,
    irbApprovalRef: "",
    irbExpiresOn: "",
    inclusion: "",
    exclusion: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const body = {
        ...form,
        siteIds: [],
        visitSchedule: [],
        inclusion: form.inclusion.split("\n").map((s) => s.trim()).filter(Boolean),
        exclusion: form.exclusion.split("\n").map((s) => s.trim()).filter(Boolean),
        irbApprovalRef: form.irbApprovalRef || undefined,
        irbExpiresOn: form.irbExpiresOn || undefined,
      };
      const r = await fetch("/api/ctms/protocols", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setError(j.error || "Failed"); return; }
      onCreated();
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">New protocol</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Draft a protocol. You can&apos;t enrol subjects until status flips to active (requires IRB ref).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Protocol #" value={form.protocolNumber} onChange={(v) => setForm({ ...form, protocolNumber: v })} placeholder="e.g. AZD-2024-001" />
          <Select label="Phase" value={form.phase} onChange={(v) => setForm({ ...form, phase: v as Phase })} options={["I", "II", "III", "IV", "PMS"]} />
          <Input label="Sponsor" value={form.sponsor} onChange={(v) => setForm({ ...form, sponsor: v })} placeholder="AstraZeneca" />
          <Input label="IRB ref" value={form.irbApprovalRef} onChange={(v) => setForm({ ...form, irbApprovalRef: v })} placeholder="IRB-2024-…" />
          <div className="sm:col-span-2">
            <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="A randomised double-blind…" />
          </div>
          <Input label="IRB expires" value={form.irbExpiresOn} onChange={(v) => setForm({ ...form, irbExpiresOn: v })} placeholder="2026-12-31" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Textarea label="Inclusion criteria (one per line)" value={form.inclusion} onChange={(v) => setForm({ ...form, inclusion: v })} />
          <Textarea label="Exclusion criteria (one per line)" value={form.exclusion} onChange={(v) => setForm({ ...form, exclusion: v })} />
        </div>

        {error && <p className="mt-3 rounded-lg bg-rose-50 p-2 text-xs text-rose-700">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold dark:border-slate-700">
            Cancel
          </button>
          <button onClick={submit} disabled={busy || !form.protocolNumber || !form.sponsor || !form.title}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-60">
            {busy ? "Creating…" : "Create draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailDrawer({ protocol, onClose }: { protocol: Protocol; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50" onClick={onClose}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{protocol.protocolNumber} · Phase {protocol.phase}</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{protocol.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">Sponsor: {protocol.sponsor}</p>
          </div>
          <button onClick={onClose} className="text-2xl text-slate-400">×</button>
        </div>

        {protocol.irbApprovalRef && (
          <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-700 dark:bg-emerald-950/30">
            <p className="font-bold text-emerald-900 dark:text-emerald-100">IRB approved</p>
            <p className="text-emerald-800 dark:text-emerald-200">{protocol.irbApprovalRef}{protocol.irbExpiresOn && ` · expires ${protocol.irbExpiresOn}`}</p>
          </section>
        )}

        {protocol.inclusion.length > 0 && (
          <section className="mt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Inclusion</p>
            <ul className="mt-1 list-inside list-disc text-sm">{protocol.inclusion.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </section>
        )}
        {protocol.exclusion.length > 0 && (
          <section className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Exclusion</p>
            <ul className="mt-1 list-inside list-disc text-sm">{protocol.exclusion.map((c, i) => <li key={i}>{c}</li>)}</ul>
          </section>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
