"use client";

// Org mini-website builder — admin UI for /api/org-website.
//
// One form per org. Slug is unique platform-wide; we don't auto-
// generate to avoid silent collisions. Save persists immediately.

import { useCallback, useEffect, useState } from "react";

interface ServiceItem { title: string; description: string; icon?: string }
interface TeamMember { name: string; role: string; photoUrl?: string; bio?: string }

interface Site {
  organizationId: string;
  slug: string;
  about?: string; tagline?: string; heroImageUrl?: string;
  services: ServiceItem[]; team: TeamMember[]; gallery: string[];
  contactBlock?: string;
  enableBooking: boolean; showVacancies: boolean; showCourses: boolean;
  published: boolean; updatedAt?: string;
}

const EMPTY: Site = {
  organizationId: "", slug: "", services: [], team: [], gallery: [],
  enableBooking: true, showVacancies: true, showCourses: false, published: false,
};

export default function WebsiteAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [site, setSite] = useState<Site>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const r = await fetch(`/api/org-website?orgId=${encodeURIComponent(orgId)}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setSite(d.site || { ...EMPTY, organizationId: orgId });
    }
  }, [orgId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/org-website", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...site, organizationId: orgId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: data.error === "slug_taken" ? "That slug is already used by another org." : data.error || "Failed" });
        return;
      }
      setSite(data.site);
      setMsg({ kind: "ok", text: "Saved." });
    } finally { setBusy(false); }
  };

  if (!orgId) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Pick an organization from the header.</p>;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mini-website</h2>
          <p className="mt-1 text-sm text-gray-500">Public landing page at <code>/c/&lt;slug&gt;</code>. Themed by your org branding.</p>
        </div>
        {site.slug && site.published && (
          <a href={`/c/${site.slug}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Preview ↗</a>
        )}
      </div>

      {msg && <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${msg.kind === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{msg.text}</div>}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Identity</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <I label="Slug (unique, lowercase)" v={site.slug} on={(v) => setSite({ ...site, slug: v.toLowerCase() })} placeholder="apollo-hyderabad" />
          <I label="Tagline" v={site.tagline || ""} on={(v) => setSite({ ...site, tagline: v })} placeholder="Hyderabad's leading cardiac centre" />
          <I label="Hero image URL (optional)" v={site.heroImageUrl || ""} on={(v) => setSite({ ...site, heroImageUrl: v })} className="sm:col-span-2" />
          <Area label="About" v={site.about || ""} on={(v) => setSite({ ...site, about: v })} className="sm:col-span-2" />
          <Area label="Contact block (free text)" v={site.contactBlock || ""} on={(v) => setSite({ ...site, contactBlock: v })} className="sm:col-span-2" />
        </div>
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Services (up to 6)</p>
        <ListEditor
          items={site.services}
          onChange={(items) => setSite({ ...site, services: items })}
          fields={[
            { key: "icon", label: "Icon (emoji)", short: true },
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
          ]}
          max={6}
          newItem={() => ({ title: "", description: "" } as ServiceItem)}
        />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Team (up to 12)</p>
        <ListEditor
          items={site.team}
          onChange={(items) => setSite({ ...site, team: items })}
          fields={[
            { key: "name", label: "Name" },
            { key: "role", label: "Role", short: true },
            { key: "photoUrl", label: "Photo URL" },
            { key: "bio", label: "Bio" },
          ]}
          max={12}
          newItem={() => ({ name: "", role: "" } as TeamMember)}
        />
      </section>

      <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="mb-3 text-sm font-bold text-slate-900">Visibility + cross-links</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Toggle label="Show booking button" v={site.enableBooking} on={(b) => setSite({ ...site, enableBooking: b })} />
          <Toggle label="Show vacancies section" v={site.showVacancies} on={(b) => setSite({ ...site, showVacancies: b })} />
          <Toggle label="Show courses section" v={site.showCourses} on={(b) => setSite({ ...site, showCourses: b })} />
          <Toggle label="Publish (visible at /c/<slug>)" v={site.published} on={(b) => setSite({ ...site, published: b })} />
        </div>
      </section>

      <div className="sticky bottom-0 mt-6 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-end gap-2">
          {site.updatedAt && <span className="mr-auto text-[10px] text-slate-400">Last updated {new Date(site.updatedAt).toLocaleString()}</span>}
          <button onClick={save} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ListEditor<T>({ items, onChange, fields, max, newItem }: {
  items: T[]; onChange: (items: T[]) => void;
  fields: { key: keyof T & string; label: string; short?: boolean }[];
  max: number; newItem: () => T;
}) {
  const upd = (i: number, patch: Partial<T>) => {
    const next = items.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };
  const rm = (i: number) => onChange(items.filter((_, j) => j !== i));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 sm:grid-cols-12">
          {fields.map((f) => (
            <input
              key={f.key}
              value={((it as unknown as Record<string, string>)[f.key]) || ""}
              onChange={(e) => upd(i, { [f.key]: e.target.value } as unknown as Partial<T>)}
              placeholder={f.label}
              className={`rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm ${f.short ? "sm:col-span-2" : "sm:col-span-3"}`}
            />
          ))}
          <button onClick={() => rm(i)} className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-200 sm:col-span-1">✕</button>
        </div>
      ))}
      {items.length < max && (
        <button onClick={() => onChange([...items, newItem()])} className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
          + Add row
        </button>
      )}
    </div>
  );
}

function I({ label, v, on, placeholder, className = "" }: { label: string; v: string; on: (v: string) => void; placeholder?: string; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function Area({ label, v, on, className = "" }: { label: string; v: string; on: (v: string) => void; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<textarea value={v} onChange={(e) => on(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function Toggle({ label, v, on }: { label: string; v: boolean; on: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
      {label}
    </label>
  );
}
