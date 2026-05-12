// WhatsApp Content Template status viewer. Shows every template
// registered with Twilio + its Meta approval status, refreshable on
// demand without leaving the admin panel.

"use client";

import { useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";
import { StatusBadge, type StatusColor } from "@/components/admin/StatusBadge";

interface TemplateSummary {
  sid: string;
  friendlyName: string;
  language: string;
  contentType: string;
  dateCreated: string;
  whatsapp: {
    status: string;
    category?: string;
    rejectionReason?: string;
  } | null;
}

interface ApiResponse {
  configured: boolean;
  templates: TemplateSummary[];
  error?: string;
  detail?: string;
}

const STATUS_COLOR: Record<string, StatusColor> = {
  approved: "green",
  pending: "yellow",
  received: "blue",
  paused: "orange",
  rejected: "red",
  unsubmitted: "gray",
};

const STATUS_LABEL: Record<string, string> = {
  approved: "Approved",
  pending: "Pending review",
  received: "Submitted",
  paused: "Paused",
  rejected: "Rejected",
  unsubmitted: "Not submitted",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function TemplatesStatusPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/notifications/templates", {
        cache: "no-store",
      });
      if (!r.ok) {
        if (r.status === 403) {
          setErr("You don't have permission to view templates.");
        } else {
          setErr(`HTTP ${r.status}`);
        }
        setData(null);
        return;
      }
      const json = (await r.json()) as ApiResponse;
      setData(json);
      if (json.error) setErr(json.error);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const templates = data?.templates ?? [];
  const approved = templates.filter((t) => t.whatsapp?.status === "approved").length;
  const pending = templates.filter(
    (t) => t.whatsapp?.status === "pending" || t.whatsapp?.status === "received"
  ).length;
  const rejected = templates.filter((t) => t.whatsapp?.status === "rejected").length;

  return (
    <div className="space-y-6">
      <PageHero
        icon="📋"
        eyebrow="WhatsApp"
        title="Template approval status"
        subtitle="Live status of every WhatsApp Content Template from Twilio. Refresh to re-query Meta."
        tone="indigo"
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
        <button
          onClick={reload}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-md disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "↻ Refresh"}
        </button>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {approved} approved
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
            {pending} pending
          </span>
          {rejected > 0 && (
            <span className="rounded-full bg-rose-50 px-3 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">
              {rejected} rejected
            </span>
          )}
        </div>
        {err && (
          <span className="text-xs text-rose-600">⚠ {err}</span>
        )}
      </div>

      {!loading && data && !data.configured && (
        <p className="admin-empty-callout">
          Twilio credentials not configured — set <code>TWILIO_ACCOUNT_SID</code> and{" "}
          <code>TWILIO_AUTH_TOKEN</code> in Vercel and redeploy.
        </p>
      )}

      {!loading && templates.length === 0 && data?.configured && (
        <p className="admin-empty-callout">
          No templates registered yet. Create them in Twilio Console → Messaging → Content Template Builder.
        </p>
      )}

      {templates.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Template</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Lang</th>
                <th className="px-4 py-3 text-left">Meta status</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left font-mono">SID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templates.map((t) => {
                const status = t.whatsapp?.status ?? "unsubmitted";
                return (
                  <tr key={t.sid}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {t.friendlyName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.contentType}</td>
                    <td className="px-4 py-3 text-slate-600">{t.language}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        color={STATUS_COLOR[status] ?? "gray"}
                        label={STATUS_LABEL[status] ?? status}
                        size="sm"
                      />
                      {t.whatsapp?.rejectionReason && (
                        <div className="mt-1 text-[10.5px] text-rose-600">
                          {t.whatsapp.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.whatsapp?.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {timeAgo(t.dateCreated)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[10.5px] text-slate-400">
                      {t.sid}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <p className="text-[11px] text-slate-400">
        Data fetched live from Twilio Content API. Meta typically reviews
        Utility / Authentication templates in 5 min – 4 hours; Marketing
        templates take longer.
      </p>
    </div>
  );
}
