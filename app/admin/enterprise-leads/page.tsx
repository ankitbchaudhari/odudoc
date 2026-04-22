"use client";

import { useCallback, useEffect, useState } from "react";

type LeadStatus = "new" | "contacted" | "demoed" | "won" | "lost";

interface Lead {
  id: string;
  organizationName: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  country?: string;
  bedsRange?: string;
  interestedModules: string[];
  currentSystem?: string;
  message?: string;
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-amber-100 text-amber-700",
  demoed: "bg-purple-100 text-purple-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-gray-200 text-gray-600",
};

const STATUSES: LeadStatus[] = ["new", "contacted", "demoed", "won", "lost"];

export default function AdminEnterpriseLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [seedingId, setSeedingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/enterprise-leads", { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        setLeads(data.leads || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: LeadStatus) => {
    await fetch("/api/enterprise-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  };

  const saveNotes = async (id: string) => {
    await fetch("/api/enterprise-leads", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, notes: notesDraft }),
    });
    await load();
  };

  const createDemoForLead = async (l: Lead) => {
    if (seedingId) return;
    if (
      !confirm(
        `Seed a demo hospital for "${l.organizationName}" and email the login to ${l.contactEmail}?\n\n` +
          `This creates a new demo org with 12 patients, 3 doctors, 1 receptionist, and an admin account. ` +
          `The lead will be moved to "demoed".`,
      )
    ) {
      return;
    }
    setSeedingId(l.id);
    try {
      const r = await fetch("/api/admin/super/seed-demo-for-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: l.id }),
      });
      const j = await r.json();
      if (!r.ok) {
        alert(j?.error || "failed_to_seed");
        return;
      }
      const loginUrl = `${window.location.origin}${j.login.url}`;
      const credsText =
        `URL: ${loginUrl}\nEmail: ${j.login.email}\nPassword: ${j.login.password}`;
      try {
        await navigator.clipboard.writeText(credsText);
      } catch {
        /* clipboard may be blocked */
      }
      const emailLine = j.email?.sent
        ? `✔ Credentials emailed to ${l.contactEmail}.`
        : `✘ Email failed (${j.email?.error || "unknown"}). Send manually.`;
      alert(
        `Demo "${j.org.name}" created with ${j.counts.patients} patients, ${j.counts.appointments} appointments.\n\n` +
          `${credsText}\n\n${emailLine}\n\n(Credentials copied to clipboard.)`,
      );
      await load();
    } finally {
      setSeedingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this lead?")) return;
    await fetch("/api/enterprise-leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
  };

  const filtered = filter === "all" ? leads : leads.filter((l) => l.status === filter);
  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: leads.filter((l) => l.status === s).length }),
    {} as Record<LeadStatus, number>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enterprise Leads</h2>
          <p className="mt-1 text-sm text-gray-500">
            {leads.length} total · {counts.new} new · {counts.won} won
          </p>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            filter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-600 ring-1 ring-gray-200"
          }`}
        >
          All ({leads.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
              filter === s ? "bg-gray-900 text-white" : `${STATUS_COLORS[s]} ring-1 ring-gray-200`
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {filtered.map((l) => (
          <div key={l.id} className="border-b border-gray-100 last:border-b-0">
            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{l.organizationName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_COLORS[l.status]}`}
                  >
                    {l.status}
                  </span>
                  {l.bedsRange && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                      {l.bedsRange} beds
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {l.contactName} ·{" "}
                  <a href={`mailto:${l.contactEmail}`} className="text-primary-600 hover:underline">
                    {l.contactEmail}
                  </a>
                  {l.contactPhone && ` · ${l.contactPhone}`}
                  {l.country && ` · ${l.country}`}
                </p>
                {l.interestedModules.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {l.interestedModules.map((m) => (
                      <span key={m} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-700">
                        {m}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(l.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => createDemoForLead(l)}
                  disabled={seedingId !== null}
                  title="Seed a demo hospital with sample data and email the login to this lead"
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition ${
                    seedingId === l.id
                      ? "cursor-wait bg-gray-400"
                      : seedingId
                        ? "cursor-not-allowed bg-gray-300"
                        : "bg-primary-600 hover:bg-primary-700"
                  }`}
                >
                  {seedingId === l.id ? "Seeding…" : "Create demo"}
                </button>
                <select
                  value={l.status}
                  onChange={(e) => setStatus(l.id, e.target.value as LeadStatus)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (expandedId === l.id) {
                      setExpandedId(null);
                    } else {
                      setExpandedId(l.id);
                      setNotesDraft(l.notes || "");
                    }
                  }}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expandedId === l.id ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(l.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            {expandedId === l.id && (
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                {l.currentSystem && (
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">Current system:</span> {l.currentSystem}
                  </p>
                )}
                {l.message && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">
                    <span className="font-semibold">Message:</span> {l.message}
                  </p>
                )}
                <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-gray-600">
                  Internal notes
                </label>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
                <button
                  onClick={() => saveNotes(l.id)}
                  className="mt-2 rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Save notes
                </button>
              </div>
            )}
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No leads{filter !== "all" ? ` in "${filter}"` : ""}.</div>
        )}
        {loading && <div className="py-12 text-center text-sm text-gray-400">Loading…</div>}
      </div>
    </div>
  );
}
