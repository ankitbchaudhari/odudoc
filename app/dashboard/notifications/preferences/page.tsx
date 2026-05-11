// Patient-facing notification preferences.
// Drag-reorder isn't worth the lib weight; up/down buttons reorder.

"use client";

import { useEffect, useState } from "react";

type Channel = "whatsapp" | "sms" | "email";
type Category =
  | "appointment"
  | "reminder"
  | "result"
  | "billing"
  | "marketing"
  | "alert"
  | "discharge"
  | "vaccination"
  | "otp"
  | "generic";

interface Preferences {
  userId: string;
  channelOrder: Channel[];
  optedOutCategories: Category[];
  doNotDisturb: boolean;
  updatedAt: string;
}

const ALL_CHANNELS: Channel[] = ["whatsapp", "sms", "email"];
const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "💬 WhatsApp",
  sms: "📱 SMS",
  email: "✉️ Email",
};

// Categories the user can toggle. OTP and alert are always-on (safety
// + auth) so they're not shown.
const OPTABLE: { key: Category; label: string; help: string }[] = [
  { key: "appointment", label: "Appointment confirmations", help: "When you book or reschedule" },
  { key: "reminder", label: "Appointment reminders", help: "Day-of / hour-before pings" },
  { key: "result", label: "Lab / scan results", help: "When a report is ready" },
  { key: "billing", label: "Billing & receipts", help: "Invoice, payment confirmations" },
  { key: "discharge", label: "Discharge instructions", help: "After an IPD stay" },
  { key: "vaccination", label: "Vaccination reminders", help: "Annual flu shot, child schedule" },
  { key: "marketing", label: "Health tips & offers", help: "Promotional content" },
];

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notifications/preferences", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
        else setErr(d.error || "Unable to load preferences.");
      })
      .catch(() => setErr("Network error."));
  }, []);

  async function save(next: Partial<Preferences>) {
    if (!prefs) return;
    const merged = { ...prefs, ...next };
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelOrder: merged.channelOrder,
          optedOutCategories: merged.optedOutCategories,
          doNotDisturb: merged.doNotDisturb,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "save_failed");
      setPrefs(data.preferences);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function moveChannel(idx: number, dir: -1 | 1) {
    if (!prefs) return;
    const next = [...prefs.channelOrder];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    save({ channelOrder: next });
  }

  function toggleCategory(cat: Category) {
    if (!prefs) return;
    const opted = prefs.optedOutCategories.includes(cat)
      ? prefs.optedOutCategories.filter((c) => c !== cat)
      : [...prefs.optedOutCategories, cat];
    save({ optedOutCategories: opted });
  }

  if (!prefs) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-slate-500">{err ?? "Loading…"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Notification preferences</h1>
        <p className="mt-1 text-sm text-slate-500">
          Choose how OduDoc reaches you. OTPs and critical health alerts always go through — everything else respects these settings.
        </p>
      </header>

      {/* Channel order */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Channel order</h2>
        <p className="mt-1 text-xs text-slate-500">OduDoc tries channels top-to-bottom. The first one that delivers wins.</p>
        <ol className="mt-4 space-y-2">
          {prefs.channelOrder.map((ch, i) => (
            <li
              key={ch}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <span className="text-sm font-semibold text-slate-800">
                <span className="mr-3 text-slate-400">{i + 1}.</span>
                {CHANNEL_LABEL[ch]}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => moveChannel(i, -1)}
                  disabled={i === 0 || saving}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveChannel(i, 1)}
                  disabled={i === prefs.channelOrder.length - 1 || saving}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Category opt-outs */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">What to send</h2>
        <ul className="mt-4 divide-y divide-slate-100">
          {OPTABLE.map((c) => {
            const optedIn = !prefs.optedOutCategories.includes(c.key);
            return (
              <li key={c.key} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{c.label}</div>
                  <div className="text-xs text-slate-500">{c.help}</div>
                </div>
                <button
                  onClick={() => toggleCategory(c.key)}
                  disabled={saving}
                  className={`relative h-6 w-11 rounded-full transition ${
                    optedIn ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                  aria-pressed={optedIn}
                  aria-label={c.label}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      optedIn ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Do not disturb */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Do not disturb</h2>
            <p className="mt-1 text-xs text-slate-500">Pauses everything except OTPs and critical health alerts.</p>
          </div>
          <button
            onClick={() => save({ doNotDisturb: !prefs.doNotDisturb })}
            disabled={saving}
            className={`relative h-6 w-11 rounded-full transition ${
              prefs.doNotDisturb ? "bg-rose-500" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                prefs.doNotDisturb ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        {saving && <span>Saving…</span>}
        {!saving && savedAt && <span className="text-emerald-600">✓ Saved at {savedAt}</span>}
        {err && <span className="text-rose-600">⚠ {err}</span>}
      </div>
    </div>
  );
}
