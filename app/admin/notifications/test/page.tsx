// Notification channel test-send. Fire a real SMS / WhatsApp / email
// from the admin panel so you can verify Twilio + Resend creds are
// wired correctly in Vercel.

"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";
import { StatusBadge } from "@/components/admin/StatusBadge";

type Channel = "sms" | "whatsapp" | "email";

interface Configured {
  sms: boolean;
  whatsapp: boolean;
  email: boolean;
}

interface SendResult {
  ok: boolean;
  channel: Channel;
  providerId?: string;
  skipped?: boolean;
  error?: string;
}

const SAMPLE_BODY: Record<Channel, string> = {
  sms: "OduDoc test SMS. If you can read this, Twilio SMS is wired correctly.",
  whatsapp: "OduDoc test WhatsApp. If you can read this, Twilio WhatsApp sender is wired.",
  email: "This is a test email from the OduDoc admin panel to verify Resend is wired.\n\nIf you see this in your inbox, you're good to go.",
};

export default function TestSendPage() {
  const [configured, setConfigured] = useState<Configured | null>(null);
  const [channel, setChannel] = useState<Channel>("sms");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("OduDoc test message");
  const [body, setBody] = useState(SAMPLE_BODY.sms);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  useEffect(() => {
    fetch("/api/admin/notifications/test", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured({ sms: false, whatsapp: false, email: false }));
  }, []);

  useEffect(() => {
    setBody(SAMPLE_BODY[channel]);
  }, [channel]);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const r = await fetch("/api/admin/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, to, subject, body }),
      });
      const data = await r.json();
      if (!r.ok) {
        setResult({ ok: false, channel, error: data.error || `HTTP ${r.status}` });
      } else {
        setResult(data);
      }
    } catch (e) {
      setResult({ ok: false, channel, error: (e as Error).message });
    } finally {
      setSending(false);
    }
  }

  const placeholder = channel === "email" ? "name@example.com" : "+15551234567";

  return (
    <div className="space-y-6">
      <PageHero
        icon="✉️"
        eyebrow="Notifications"
        title="Channel test send"
        subtitle="Fire a real message on each channel to confirm Twilio + Resend creds are configured in Vercel."
        tone="indigo"
      />

      <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Provider status</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {(["sms", "whatsapp", "email"] as Channel[]).map((c) => {
            const ok = configured?.[c] ?? false;
            return (
              <div key={c} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{c}</span>
                <StatusBadge
                  color={configured == null ? "gray" : ok ? "green" : "red"}
                  label={configured == null ? "Loading…" : ok ? "Configured" : "Missing env vars"}
                  size="sm"
                />
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Required env vars: <code className="rounded bg-slate-100 px-1">TWILIO_ACCOUNT_SID</code>,{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_AUTH_TOKEN</code>,{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_FROM_NUMBER</code>,{" "}
          <code className="rounded bg-slate-100 px-1">TWILIO_WHATSAPP_FROM</code>,{" "}
          <code className="rounded bg-slate-100 px-1">RESEND_API_KEY</code>. See <code>NOTIFICATIONS_SETUP.md</code> for the full list.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Compose test message</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Channel</span>
            <div className="flex flex-wrap gap-2">
              {(["sms", "whatsapp", "email"] as Channel[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    channel === c
                      ? "bg-indigo-600 text-white shadow"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  {c === "sms" ? "📱 SMS" : c === "whatsapp" ? "💬 WhatsApp" : "✉️ Email"}
                </button>
              ))}
            </div>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {channel === "email" ? "To (email)" : "To (E.164 phone)"}
            </span>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          {channel === "email" && (
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">Body</span>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono"
            />
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={send}
            disabled={sending || !to.trim()}
            className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            {sending ? "Sending…" : "Send test"}
          </button>
          {channel === "whatsapp" && (
            <span className="self-center text-[11px] text-slate-500">
              Sandbox? Send <code className="rounded bg-slate-100 px-1">join &lt;your-keyword&gt;</code> to{" "}
              <code className="rounded bg-slate-100 px-1">+14155238886</code> first.
            </span>
          )}
        </div>
      </section>

      {result && (
        <section
          className={`rounded-2xl border p-5 shadow-sm ${
            result.ok && !result.skipped
              ? "border-emerald-200 bg-emerald-50"
              : result.skipped
                ? "border-amber-200 bg-amber-50"
                : "border-rose-200 bg-rose-50"
          }`}
        >
          <h3 className="text-sm font-bold uppercase tracking-wider">
            {result.ok && !result.skipped ? "✅ Sent" : result.skipped ? "⚠️ Skipped — provider not configured" : "❌ Failed"}
          </h3>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white/60 p-3 text-[11px]">
            {JSON.stringify(result, null, 2)}
          </pre>
          {result.providerId && (
            <p className="mt-2 text-xs">
              Provider ID: <code className="rounded bg-white/80 px-1">{result.providerId}</code>
            </p>
          )}
        </section>
      )}
    </div>
  );
}
