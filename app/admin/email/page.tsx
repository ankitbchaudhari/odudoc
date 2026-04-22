"use client";

import { useEffect, useState } from "react";

type Audience = "patients" | "doctors" | "staff" | "customers" | "all" | "custom";
type Sender = "admin" | "no-reply" | "notifications" | "hr" | "promotion";

interface AudienceSummary {
  count: number;
  users: { name: string; email: string }[];
}
interface RecipientsResponse {
  audiences: Record<Exclude<Audience, "all" | "custom">, AudienceSummary>;
}

interface SendResult {
  attempted: number;
  totalMatched: number;
  sent: number;
  failed: number;
  failures?: string[];
  truncated?: boolean;
}

const AUDIENCE_LABELS: Record<Audience, string> = {
  patients: "Patients",
  doctors: "Doctors",
  staff: "Staff",
  customers: "Shop Customers",
  all: "Everyone",
  custom: "Specific addresses",
};

const SENDER_OPTIONS: { value: Sender; label: string }[] = [
  { value: "admin", label: "admin@odudoc.com — General / account" },
  { value: "notifications", label: "notifications@odudoc.com — Updates" },
  { value: "promotion", label: "promotion@odudoc.com — Marketing" },
  { value: "hr", label: "hr@odudoc.com — Careers" },
  { value: "no-reply", label: "no-reply@odudoc.com — System" },
];

export default function AdminEmailBroadcast() {
  const [recipients, setRecipients] = useState<RecipientsResponse["audiences"] | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [audience, setAudience] = useState<Audience>("patients");
  const [customEmailsText, setCustomEmailsText] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [sender, setSender] = useState<Sender>("admin");

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/email/recipients", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load recipients");
        setRecipients(data.audiences);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const customEmailList = customEmailsText
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean);

  const matchedCount = (() => {
    if (!recipients) return 0;
    if (audience === "custom") return customEmailList.length;
    if (audience === "all") {
      const union = new Set<string>();
      (["patients", "doctors", "staff", "customers"] as const).forEach((k) =>
        recipients[k].users.forEach((u) => union.add(u.email.toLowerCase()))
      );
      return union.size;
    }
    return recipients[audience].count;
  })();

  const previewList: { name: string; email: string }[] = (() => {
    if (!recipients) return [];
    if (audience === "custom") {
      return customEmailList.slice(0, 10).map((e) => ({ name: "", email: e }));
    }
    if (audience === "all") {
      const seen = new Set<string>();
      const out: { name: string; email: string }[] = [];
      (["patients", "doctors", "staff", "customers"] as const).forEach((k) => {
        recipients[k].users.forEach((u) => {
          const key = u.email.toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            out.push(u);
          }
        });
      });
      return out.slice(0, 10);
    }
    return recipients[audience].users.slice(0, 10);
  })();

  const handleSend = async () => {
    setError(null);
    setResult(null);
    if (!subject.trim() || !message.trim()) {
      setError("Subject and message are required.");
      return;
    }
    if (audience === "custom" && customEmailList.length === 0) {
      setError("Paste at least one email address.");
      return;
    }
    if (
      !confirm(
        `Send this email to ${matchedCount} recipient${matchedCount === 1 ? "" : "s"}?`
      )
    )
      return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          customEmails: customEmailList,
          subject,
          message,
          from: sender,
          ctaLabel: ctaLabel.trim() || undefined,
          ctaUrl: ctaUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Send failed");
      setResult({
        attempted: data.attempted,
        totalMatched: data.totalMatched,
        sent: data.sent,
        failed: data.failed,
        failures: data.failures,
        truncated: data.truncated,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Email Broadcast</h2>
        <p className="mt-1 text-sm text-gray-500">
          Send a message to patients, doctors, staff, or shop customers straight from OduDoc.
        </p>
      </div>

      {loadError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Composer */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              1. Choose recipients
            </h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {(
                ["patients", "doctors", "staff", "customers", "all", "custom"] as const
              ).map((a) => {
                const disabled = loading || (!recipients && a !== "custom");
                const count =
                  a === "custom"
                    ? customEmailList.length
                    : a === "all"
                      ? recipients
                        ? Object.values(recipients).reduce(
                            (acc, v) => acc + v.count,
                            0
                          )
                        : 0
                      : recipients?.[a].count ?? 0;
                return (
                  <button
                    key={a}
                    type="button"
                    disabled={disabled}
                    onClick={() => setAudience(a)}
                    className={`rounded-lg border px-3 py-3 text-left text-sm transition-colors ${
                      audience === a
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    } disabled:opacity-50`}
                  >
                    <div className="font-medium">{AUDIENCE_LABELS[a]}</div>
                    <div className="text-xs text-gray-500">
                      {a === "custom" ? "Paste emails below" : `${count} people`}
                    </div>
                  </button>
                );
              })}
            </div>

            {audience === "custom" && (
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email addresses
                </label>
                <textarea
                  value={customEmailsText}
                  onChange={(e) => setCustomEmailsText(e.target.value)}
                  rows={3}
                  placeholder="one@example.com, two@example.com"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Separate with commas, spaces, or new lines.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              2. Compose
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  From
                </label>
                <select
                  value={sender}
                  onChange={(e) => setSender(e.target.value as Sender)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  {SENDER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Holiday pharmacy hours"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  placeholder="Write the message exactly as you want it to read. Blank lines become paragraph breaks."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Plain text only. OduDoc branding is added automatically.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Button label (optional)
                  </label>
                  <input
                    type="text"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                    placeholder="e.g. View Offer"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Button URL (optional)
                  </label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="https://www.odudoc.com/..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">
                Sent {result.sent} of {result.attempted} emails.
              </p>
              {result.failed > 0 && (
                <p className="mt-1 text-red-700">
                  {result.failed} failed to send.
                </p>
              )}
              {result.truncated && (
                <p className="mt-1 text-yellow-700">
                  Only the first 200 recipients were processed. Run again to continue.
                </p>
              )}
              {result.failures && result.failures.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-xs text-red-700">
                  {result.failures.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending || matchedCount === 0}
              className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {sending
                ? "Sending…"
                : `Send to ${matchedCount} recipient${matchedCount === 1 ? "" : "s"}`}
            </button>
            <p className="text-xs text-gray-400">
              Emails use OduDoc branded template automatically.
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Recipients preview
            </h3>
            <p className="mb-3 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{matchedCount}</span>{" "}
              {AUDIENCE_LABELS[audience].toLowerCase()}
            </p>
            {previewList.length === 0 ? (
              <p className="text-xs text-gray-400">No recipients yet.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {previewList.map((u, i) => (
                  <li key={i} className="truncate text-gray-600">
                    {u.name && <span className="font-medium text-gray-900">{u.name} </span>}
                    <span className="text-gray-500">{u.email}</span>
                  </li>
                ))}
                {matchedCount > previewList.length && (
                  <li className="text-gray-400">
                    + {matchedCount - previewList.length} more…
                  </li>
                )}
              </ul>
            )}
          </div>

          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Email preview
            </h3>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <p className="text-xs text-gray-500">
                From:{" "}
                <span className="font-medium text-gray-700">
                  {SENDER_OPTIONS.find((s) => s.value === sender)?.label.split(" — ")[0]}
                </span>
              </p>
              <p className="mt-2 font-semibold text-gray-900">
                {subject || "(subject)"}
              </p>
              <div className="mt-2 whitespace-pre-wrap text-gray-700">
                {message || "(message body)"}
              </div>
              {ctaLabel && ctaUrl && (
                <div className="mt-3">
                  <span className="inline-block rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white">
                    {ctaLabel}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
