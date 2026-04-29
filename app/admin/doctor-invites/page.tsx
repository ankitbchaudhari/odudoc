"use client";

// Admin doctor-invite outreach. Paste one or many emails, optional
// personalisation, hit Send. Each address gets a templated
// invitation email and a row appears in the history list. When the
// recipient signs up via /for-doctors/register, their invite row
// flips to "registered" so the conversion column updates without
// any manual reconciliation.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface Invite {
  id: string;
  email: string;
  name?: string;
  specialty?: string;
  country?: string;
  sentBy: string;
  sentAt: string;
  status: "sent" | "registered" | "bounced" | "cancelled";
  registeredAt?: string;
  applicationId?: string;
  note?: string;
}

interface Stats {
  total: number;
  sent: number;
  registered: number;
  conversionRate: number;
}

interface SendResult {
  email: string;
  ok: boolean;
  error?: string;
}

const STATUS_TONE: Record<Invite["status"], { bg: string; text: string }> = {
  sent: { bg: "bg-amber-50", text: "text-amber-700" },
  registered: { bg: "bg-emerald-50", text: "text-emerald-700" },
  bounced: { bg: "bg-rose-50", text: "text-rose-700" },
  cancelled: { bg: "bg-slate-100", text: "text-slate-600" },
};

export default function DoctorInvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [emailsRaw, setEmailsRaw] = useState("");
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [country, setCountry] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<SendResult[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/doctor-invites", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not load");
      }
      const data = await res.json();
      setInvites(data.invites || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvites() {
    if (!emailsRaw.trim()) {
      setError("Paste at least one email address.");
      return;
    }
    setSending(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/admin/doctor-invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          emails: emailsRaw,
          name: name || undefined,
          specialty: specialty || undefined,
          country: country || undefined,
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setResults(data.results || []);
      // Clear the obvious fields on success but keep specialty / country
      // / note so a multi-batch session keeps context.
      setEmailsRaw("");
      setName("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  async function cancel(id: string) {
    if (!confirm("Mark this invite as cancelled? It stays in the history.")) return;
    try {
      const res = await fetch(`/api/admin/doctor-invites?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Cancel failed");
      }
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
          Outreach · Doctor invites
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          Invite doctors by email
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste one or many email addresses. Each recipient gets a templated
          OduDoc invitation linking to <code>/for-doctors</code>. When they
          sign up, the corresponding row below flips from <b>Sent</b> →{" "}
          <b>Registered</b> automatically.
        </p>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Total invites" value={String(stats.total)} tone="indigo" />
          <Stat label="Awaiting" value={String(stats.sent)} tone="amber" />
          <Stat label="Registered" value={String(stats.registered)} tone="emerald" />
          <Stat label="Conversion" value={`${stats.conversionRate}%`} tone="violet" />
        </div>
      )}

      {/* Send form */}
      <div className="mb-6 overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">New invite</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Bulk-paste up to 50 emails per send. Optional personalisation
            applies to every recipient in the batch.
          </p>
        </div>
        <div className="p-6">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">
              Email addresses *
            </span>
            <textarea
              value={emailsRaw}
              onChange={(e) => setEmailsRaw(e.target.value)}
              placeholder={`drsathmd@gmail.com\nunnatibondre94@gmail.com\n…or comma-separated`}
              rows={5}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              One per line, comma-separated, or even pasted from a "Name &lt;email&gt;" list
              — we&apos;ll parse and dedupe.
            </span>
          </label>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Name (single recipient)"
              value={name}
              onChange={setName}
              placeholder="e.g. Sathish Kumar"
            />
            <Field
              label="Specialty"
              value={specialty}
              onChange={setSpecialty}
              placeholder="e.g. Psychiatry"
            />
            <Field
              label="Country (ISO)"
              value={country}
              onChange={(v) => setCountry(v.toUpperCase().slice(0, 2))}
              placeholder="e.g. IN"
            />
          </div>

          <Field
            wide
            label="Internal note (optional)"
            value={note}
            onChange={setNote}
            placeholder="Campaign tag — only visible to admins."
          />

          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {error}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            <button
              onClick={sendInvites}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl disabled:opacity-50"
            >
              {sending ? "Sending…" : "Send invitations"}
              {!sending && <span>→</span>}
            </button>
          </div>

          {results && results.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                Send results
              </p>
              <ul className="space-y-1 text-sm">
                {results.map((r) => (
                  <li
                    key={r.email}
                    className={r.ok ? "text-emerald-700" : "text-rose-700"}
                  >
                    {r.ok ? "✓" : "✕"} {r.email}
                    {r.error && (
                      <span className="ml-2 text-xs text-rose-600">— {r.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">Invite history</h2>
        </div>
        {loading ? (
          <div className="space-y-2 p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No invites sent yet — paste an email above to send your first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-2.5">Email</th>
                  <th className="px-3 py-2.5">Personalisation</th>
                  <th className="px-3 py-2.5">Sent</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-5 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invites.map((i) => {
                  const tone = STATUS_TONE[i.status];
                  return (
                    <tr key={i.id}>
                      <td className="px-5 py-3 align-top">
                        <p className="font-mono text-xs text-slate-800">{i.email}</p>
                        {i.note && (
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {i.note}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-700">
                        {i.name && <div>{i.name}</div>}
                        {i.specialty && (
                          <div className="text-slate-500">{i.specialty}</div>
                        )}
                        {i.country && (
                          <div className="text-slate-500">🌍 {i.country}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 align-top text-xs text-slate-500">
                        {new Date(i.sentAt).toLocaleString()}
                        <div className="text-[10px] text-slate-400">
                          by {i.sentBy}
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tone.bg} ${tone.text}`}
                        >
                          {i.status}
                        </span>
                        {i.registeredAt && (
                          <div className="mt-1 text-[10px] text-emerald-700">
                            Signed up {new Date(i.registeredAt).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 align-top text-right">
                        {i.status === "sent" && (
                          <button
                            onClick={() => cancel(i.id)}
                            className="text-[11px] font-semibold text-rose-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                        {i.applicationId && (
                          <Link
                            href={`/admin/applications`}
                            className="ml-2 text-[11px] font-semibold text-indigo-600 hover:underline"
                          >
                            View application
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "indigo" | "amber" | "emerald" | "violet";
}) {
  const tones: Record<string, { bg: string; text: string; ring: string }> = {
    indigo: { bg: "from-indigo-50 to-indigo-100/30", text: "text-indigo-700", ring: "ring-indigo-100" },
    amber: { bg: "from-amber-50 to-amber-100/30", text: "text-amber-700", ring: "ring-amber-100" },
    emerald: { bg: "from-emerald-50 to-emerald-100/30", text: "text-emerald-700", ring: "ring-emerald-100" },
    violet: { bg: "from-violet-50 to-violet-100/30", text: "text-violet-700", ring: "ring-violet-100" },
  };
  const t = tones[tone];
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${t.bg} p-4 ring-1 ${t.ring} backdrop-blur`}>
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${t.text}`}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "mt-4" : ""}`}>
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
      />
    </label>
  );
}
