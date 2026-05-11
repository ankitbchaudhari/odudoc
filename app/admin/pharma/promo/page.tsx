"use client";

// Pharma promo / detailing slot admin.

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

interface Slot {
  id: string; organizationId: string;
  drugId?: string; headline: string; subhead?: string; bodyText?: string;
  imageUrl?: string; specialties?: string[]; cities?: string[];
  cpcRupees?: number; startsAt?: string; endsAt?: string;
  active: boolean; impressions: number; clicks: number;
  updatedAt: string;
}

export default function PromoAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/pharma/promo?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSlots(d.slots || []);
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const setActive = async (id: string, active: boolean) => {
    await fetch("/api/pharma/promo", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_active", id, organizationId: orgId, active }),
    });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this promo slot?")) return;
    await fetch(`/api/pharma/promo?id=${encodeURIComponent(id)}&orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    load();
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div className="space-y-6">
      <PageHero
        icon="📣"
        eyebrow="Detailing"
        title="Drug Promotions"
        subtitle="Promo cards shown to doctors filtered by specialty + city. Compliance varies by jurisdiction — verify your use of these slots is legal in your region."
        tone="fuchsia"
        primaryAction={{
          label: showForm ? "Cancel" : "+ New promo",
          onClick: () => setShowForm((v) => !v),
        }}
      />

      {showForm && <PromoForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}

      {slots.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No promotions yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {slots.map((s) => {
            const ctr = s.impressions > 0 ? Math.round((s.clicks / s.impressions) * 1000) / 10 : 0;
            return (
              <li key={s.id} className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${!s.active ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{s.headline}</p>
                      {s.active ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">Paused</span>
                      )}
                    </div>
                    {s.subhead && <p className="mt-0.5 text-xs text-slate-600">{s.subhead}</p>}
                    {s.bodyText && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{s.bodyText}</p>}
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-400">
                      {s.specialties && s.specialties.length > 0 && <span>{s.specialties.length} specialties</span>}
                      {s.cities && s.cities.length > 0 && <span>· {s.cities.length} cities</span>}
                      {s.cpcRupees && <span>· ₹{s.cpcRupees} CPC</span>}
                      {s.startsAt && <span>· starts {new Date(s.startsAt).toLocaleDateString()}</span>}
                      {s.endsAt && <span>· ends {new Date(s.endsAt).toLocaleDateString()}</span>}
                    </div>
                    <p className="mt-2 text-xs text-slate-700">
                      <b className="tabular-nums">{s.impressions}</b> impressions · <b className="tabular-nums">{s.clicks}</b> clicks · <b className="tabular-nums">{ctr}%</b> CTR
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setActive(s.id, !s.active)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300">
                      {s.active ? "Pause" : "Activate"}
                    </button>
                    <button onClick={() => remove(s.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete">✕</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PromoForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [s, setS] = useState({
    drugId: "", headline: "", subhead: "", bodyText: "", imageUrl: "",
    specialties: "", cities: "", cpcRupees: "", startsAt: "", endsAt: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!s.headline.trim()) { setError("Headline required."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/pharma/promo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          organizationId: orgId,
          drugId: s.drugId.trim() || undefined,
          headline: s.headline.trim(),
          subhead: s.subhead.trim() || undefined,
          bodyText: s.bodyText.trim() || undefined,
          imageUrl: s.imageUrl.trim() || undefined,
          specialties: s.specialties.split(",").map((x) => x.trim()).filter(Boolean),
          cities: s.cities.split(",").map((x) => x.trim()).filter(Boolean),
          cpcRupees: s.cpcRupees ? Number(s.cpcRupees) : undefined,
          startsAt: s.startsAt || undefined,
          endsAt: s.endsAt || undefined,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Failed"); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">New drug promotion</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <I label="Drug id (optional)" v={s.drugId} on={(v) => setS({ ...s, drugId: v })} placeholder="Linked SKU from drug catalogue" />
        <I label="Image URL (optional)" v={s.imageUrl} on={(v) => setS({ ...s, imageUrl: v })} />
        <I label="Headline" v={s.headline} on={(v) => setS({ ...s, headline: v })} className="sm:col-span-2" />
        <I label="Subhead (optional)" v={s.subhead} on={(v) => setS({ ...s, subhead: v })} className="sm:col-span-2" />
        <Area label="Body text (optional)" v={s.bodyText} on={(v) => setS({ ...s, bodyText: v })} className="sm:col-span-2" />
        <I label="Target specialties (comma-separated)" v={s.specialties} on={(v) => setS({ ...s, specialties: v })} placeholder="Cardiology, Internal Medicine" />
        <I label="Target cities (comma-separated)" v={s.cities} on={(v) => setS({ ...s, cities: v })} placeholder="Hyderabad, Mumbai" />
        <I label="CPC (₹ per click)" v={s.cpcRupees} on={(v) => setS({ ...s, cpcRupees: v })} />
        <label className="text-xs font-semibold text-slate-700">
          Starts at (optional)
          <input type="date" value={s.startsAt} onChange={(e) => setS({ ...s, startsAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Ends at (optional)
          <input type="date" value={s.endsAt} onChange={(e) => setS({ ...s, endsAt: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Publish promo"}
        </button>
      </div>
    </div>
  );
}

function I({ label, v, on, placeholder, className = "" }: { label: string; v: string; on: (v: string) => void; placeholder?: string; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function Area({ label, v, on, className = "" }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<textarea value={v} onChange={(e) => on(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
