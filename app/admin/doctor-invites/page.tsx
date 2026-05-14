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
  phone?: string;
  whatsappSentAt?: string;
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
  /** Set on WhatsApp-only and dual-channel invites. true ⇒ sent.dm
   *  template was dispatched automatically. false / undefined ⇒
   *  admin needs to use the manual wa.me button on the history row. */
  waAutoSent?: boolean;
  waError?: string;
  phone?: string;
  channel?: "whatsapp" | "email";
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
  const [phone, setPhone] = useState("");
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
    // Accept either bulk emails OR a single WhatsApp number — but at
    // least one channel must be provided.
    if (!emailsRaw.trim() && !phone.trim()) {
      setError("Provide at least one email OR a WhatsApp number.");
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
          phone: phone || undefined,
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
      setPhone("");
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
          Invite doctors by email or WhatsApp
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Paste email addresses (one or many) <b>or</b> drop a single WhatsApp
          number — both work. Each recipient gets an OduDoc invitation linking
          to <code>/for-doctors</code>. When they sign up, the row below flips
          from <b>Sent</b> → <b>Registered</b> automatically.
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
              Email addresses {phone.trim() ? "(optional — sending via WhatsApp)" : "*"}
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
              — we&apos;ll parse and dedupe. <b>Or skip the emails entirely</b> and just
              put a WhatsApp number below for a WA-only invite.
            </span>
          </label>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Field
              label={emailsRaw.trim() ? "WhatsApp phone (single recipient)" : "WhatsApp phone (or paste emails above)"}
              value={phone}
              onChange={setPhone}
              placeholder="+919876543210 (E.164, with country code)"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            <b>One-click WhatsApp invite:</b> leave emails empty + enter just the phone.
            On Send, the approved <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">odudoc_doctor_invite</code>
            template fires automatically via sent.dm — the doctor receives a branded
            WhatsApp message immediately, no follow-up click needed. The row shows a
            green &ldquo;✓ WA sent&rdquo; badge once delivered. If auto-send is
            unavailable (template not approved yet, recipient opted out), a manual
            <code className="mx-1 rounded bg-slate-100 px-1 py-0.5">wa.me</code>
            button appears as fallback. <b>Email + WhatsApp:</b> single recipient gets
            both channels.
          </p>

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
              <ul className="space-y-1.5 text-sm">
                {results.map((r) => {
                  // Render WhatsApp-only invites with phone instead of
                  // the synthetic wa-<digits>@invite.odudoc.local stub.
                  const display =
                    r.email.endsWith("@invite.odudoc.local") && r.phone
                      ? `📱 ${r.phone}`
                      : r.email;
                  return (
                    <li
                      key={r.email}
                      className={r.ok ? "text-emerald-700" : "text-rose-700"}
                    >
                      <span className="font-medium">
                        {r.ok ? "✓" : "✕"} {display}
                      </span>
                      {r.error && (
                        <span className="ml-2 text-xs text-rose-600">— {r.error}</span>
                      )}
                      {/* WhatsApp auto-send outcome — only relevant when
                          the row had a phone attached. Surfaces the
                          sent.dm result so the admin knows whether the
                          doctor actually got the message or needs the
                          manual wa.me follow-up. */}
                      {r.ok && r.phone && r.waAutoSent && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800" title="sent.dm accepted the call. Marketing-category delivery depends on Meta business verification + recipient opt-in. Use the wa.me button on the row to send from your personal WhatsApp if the doctor doesn't receive it within a minute.">
                          📨 WhatsApp dispatched — delivery pending Meta confirmation
                        </span>
                      )}
                      {r.ok && r.phone && r.waAutoSent === false && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          ⚠ Auto-send failed{r.waError ? ` — ${r.waError}` : ""}: use the WhatsApp button on the row below
                        </span>
                      )}
                    </li>
                  );
                })}
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
                        {i.email.endsWith("@invite.odudoc.local") ? (
                          <p className="font-mono text-xs text-slate-800">
                            📱 {i.phone || "WhatsApp invite"}
                            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">WA only</span>
                          </p>
                        ) : (
                          <p className="font-mono text-xs text-slate-800">{i.email}</p>
                        )}
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
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {i.phone && (
                            <WhatsappButton invite={i} onClicked={load} />
                          )}
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
                              className="text-[11px] font-semibold text-indigo-600 hover:underline"
                            >
                              View application
                            </Link>
                          )}
                        </div>
                        {i.whatsappSentAt && (
                          <p className="mt-1 text-[10px] text-emerald-700">
                            WhatsApp opened {new Date(i.whatsappSentAt).toLocaleDateString()}
                          </p>
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

function WhatsappButton({
  invite,
  onClicked,
}: {
  invite: Invite;
  onClicked: () => void;
}) {
  function buildLink(): string | null {
    if (!invite.phone) return null;
    const digits = invite.phone.replace(/[^\d]/g, "");
    if (digits.length < 11 || digits.length > 15) return null;
    const greeting = invite.name
      ? `Hi Dr. ${invite.name.replace(/^Dr\.?\s+/i, "").trim()}`
      : "Hi Doctor";
    const specialtyLine = invite.specialty
      ? `\n\nWe came across your profile in ${invite.specialty} and wanted to introduce you to OduDoc — a telemedicine + free clinic EMR platform built for doctors who want a clean way to consult online and run their own practice without monthly software fees.`
      : `\n\nWe wanted to introduce you to OduDoc — a telemedicine + free clinic EMR platform built for doctors who want a clean way to consult online and run their own practice without monthly software fees.`;
    const body = `${greeting},${specialtyLine}\n\nFree clinic EMR (50 patients/month free), AI prescription assistant, voice dictation in 90+ languages, 70% commission on every paid consultation, and one-click FHIR/HL7 export — no platform lock-in.\n\nApply in 10 minutes (license + ID, verified within 48h):\nhttps://www.odudoc.com/for-doctors\n\nReply here with any questions — happy to help.\n\n— OduDoc`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
  }
  const link = buildLink();
  if (!link) {
    return (
      <span className="text-[11px] text-slate-400" title="Phone number invalid for WhatsApp">
        WhatsApp n/a
      </span>
    );
  }
  // If the auto-send via sent.dm already stamped whatsappSentAt, the
  // doctor has the message — no point cluttering the row with a
  // "Send again" button. Show a confirmation chip instead, with a
  // small "Resend" link tucked alongside in case the admin wants to
  // re-fire from a personal WhatsApp (different sender, different
  // tone, etc.). Click count surfaces in the audit log.
  async function handleClick() {
    fetch(`/api/admin/doctor-invites/${invite.id}/whatsapp`, { method: "POST" })
      .catch(() => {})
      .finally(() => onClicked());
  }
  if (invite.whatsappSentAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800" title={`Auto-dispatched ${new Date(invite.whatsappSentAt).toLocaleString()}. Marketing delivery depends on Meta business verification + recipient opt-in. Click Resend to forward from your personal WhatsApp if needed.`}>
        📨 WA dispatched ·{" "}
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={handleClick}
          className="underline hover:no-underline"
          title="Open wa.me to resend from your personal WhatsApp"
        >
          Resend
        </a>
      </span>
    );
  }
  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
      title="Open WhatsApp on your device with the invitation pre-filled. You click Send."
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
      </svg>
      WhatsApp
    </a>
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
