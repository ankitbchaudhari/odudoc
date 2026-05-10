"use client";

// Super-admin factory reset UI.
//
// One-screen toggleable wipe of demo / seed content. Each row maps
// to a category in /api/admin/factory-reset. Confirmation token
// "WIPE" is hard-coded in the API; this UI auto-includes it on submit.

import { useState } from "react";
import Link from "next/link";

interface Category {
  key: "blog" | "departments" | "subscribers" | "comments" | "formResponses" | "doctors" | "products";
  label: string;
  description: string;
  destructive: boolean;
}

const CATEGORIES: Category[] = [
  { key: "blog", label: "Blog posts", description: "All published + draft posts. The 15 demo entries from /lib/data live here.", destructive: false },
  { key: "departments", label: "Departments", description: "All entries on /admin/departments — both the seed list and admin-added rows.", destructive: false },
  { key: "subscribers", label: "Newsletter subscribers", description: "Public-site newsletter signups. Real users who subscribed.", destructive: true },
  { key: "comments", label: "Comments", description: "Public-site blog comments. Real reader engagement.", destructive: true },
  { key: "formResponses", label: "Form responses", description: "Booking enquiries + careers applications. Real user submissions.", destructive: true },
  { key: "doctors", label: "Public doctor profiles", description: "Doctors registered via /for-doctors/register on the public site.", destructive: true },
  { key: "products", label: "Shop products", description: "Catalogue rows on /admin/products. Admin-managed inventory.", destructive: true },
];

export default function FactoryResetPage() {
  const [picks, setPicks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ wiped: Record<string, number> } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (k: string) => setPicks((p) => ({ ...p, [k]: !p[k] }));
  const someSelected = Object.values(picks).some(Boolean);
  const someDestructive = CATEGORIES.some((c) => c.destructive && picks[c.key]);

  const submit = async () => {
    if (!someSelected) return;
    if (!confirm(someDestructive
      ? "WIPE selected data — INCLUDING real user submissions?\nThis cannot be undone."
      : "Wipe selected demo data?")) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await fetch("/api/admin/factory-reset", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...picks, confirm: "WIPE" }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.error || `Failed (${r.status})`); return; }
      setResult(d);
      setPicks({});
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4">
        <Link href="/admin" className="text-xs font-semibold text-slate-500 hover:text-slate-700">← Admin</Link>
        <h2 className="mt-1 text-2xl font-bold text-rose-700">Factory reset</h2>
        <p className="mt-1 text-sm text-gray-500">
          Wipes selected data categories. Use to clear seed / demo content before going live, or to reset a staging deploy.
          <span className="block mt-1 font-bold text-rose-600">There is no undo.</span>
        </p>
      </div>

      {result && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">Done.</p>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {Object.entries(result.wiped).map(([k, n]) => (
              <li key={k}>{k}: {n} {n === 1 ? "row" : "rows"} cleared</li>
            ))}
          </ul>
        </div>
      )}
      {err && <div className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <ul className="space-y-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-slate-200">
        {CATEGORIES.map((c) => (
          <li key={c.key}>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors ${picks[c.key] ? (c.destructive ? "bg-rose-50 ring-1 ring-rose-200" : "bg-amber-50 ring-1 ring-amber-200") : "hover:bg-slate-50"}`}>
              <input
                type="checkbox"
                checked={!!picks[c.key]}
                onChange={() => toggle(c.key)}
                className={`mt-0.5 h-4 w-4 ${c.destructive ? "accent-rose-600" : "accent-amber-600"}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900">{c.label}</p>
                  {c.destructive && (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-800">Real user data</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{c.description}</p>
              </div>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setPicks({ blog: true, departments: true })}
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white"
        >
          Select demo-only (blog + departments)
        </button>
        <button
          onClick={() => setPicks(Object.fromEntries(CATEGORIES.map((c) => [c.key, true])))}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white"
        >
          Select all (including real data)
        </button>
        <button
          onClick={() => setPicks({})}
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-300"
        >
          Clear selection
        </button>
      </div>

      <div className="mt-6 rounded-2xl border-2 border-dashed border-rose-300 bg-rose-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-800">Final step</p>
        <button
          onClick={submit}
          disabled={busy || !someSelected}
          className="mt-2 w-full rounded-xl bg-rose-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
        >
          {busy ? "Wiping…" : someSelected ? `Wipe ${Object.values(picks).filter(Boolean).length} categor${Object.values(picks).filter(Boolean).length === 1 ? "y" : "ies"}` : "Pick at least one category"}
        </button>
        <p className="mt-2 text-[10px] text-rose-700">
          Super-admin only. Tenant admins are gated at the dashboard query layer — they don&apos;t see this data, so they don&apos;t need to wipe it.
        </p>
      </div>
    </div>
  );
}
