"use client";

// Pharma authorized-partner registry admin.
//
// Pharma org uploads its distributor / retailer / stockist / agent
// roster. Doctor-side /api/pharma/verify reads this to validate a
// reseller before purchase.

import { useCallback, useEffect, useState } from "react";
import { PageHero } from "@/components/admin/PageShell";

type Kind = "distributor" | "retailer" | "stockist" | "agent";

interface Partner {
  id: string; organizationId: string; kind: Kind;
  legalName: string; tradeName?: string;
  gstin?: string; drugLicense?: string;
  address: string; city: string; state: string; countryIso2: string; pincode?: string;
  lat?: number; lng?: number;
  contactName?: string; contactPhone?: string; contactEmail?: string;
  authorizedBrands?: string[]; validUntil?: string;
  active: boolean; updatedAt: string;
}

const KINDS: Kind[] = ["distributor", "retailer", "stockist", "agent"];

export default function PartnersAdminPage() {
  const [orgId, setOrgId] = useState("");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | Kind>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrgId(localStorage.getItem("odudoc:active-org") || "");
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    const params = new URLSearchParams({ orgId });
    if (filter !== "all") params.set("kind", filter);
    if (query.trim()) params.set("query", query.trim());
    const r = await fetch(`/api/pharma/partners?${params.toString()}`, { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setPartners(d.partners || []);
    }
  }, [orgId, filter, query]);
  useEffect(() => { load(); }, [load]);

  const setActive = async (p: Partner, active: boolean) => {
    await fetch("/api/pharma/partners", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: p.id, organizationId: orgId, patch: { active } }),
    });
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this partner from the registry?")) return;
    await fetch(`/api/pharma/partners?id=${encodeURIComponent(id)}&orgId=${encodeURIComponent(orgId)}`, { method: "DELETE" });
    load();
  };

  if (!orgId) return <p className="admin-empty-callout">Pick an organization from the header.</p>;

  return (
    <div className="space-y-6">
      <PageHero
        icon="🤝"
        eyebrow="Supply Chain"
        title="Authorized Partners"
        subtitle="Distributors, retailers, stockists, agents you've authorized to sell your brands. Doctors verify against this registry."
        tone="indigo"
        primaryAction={{
          label: showForm ? "Cancel" : "+ New partner",
          onClick: () => setShowForm((v) => !v),
        }}
      />

      {showForm && <PartnerForm orgId={orgId} onSaved={() => { setShowForm(false); load(); }} />}

      <div className="mt-6 mb-4 flex flex-wrap items-center gap-2">
        {(["all", ...KINDS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${filter === k ? "bg-indigo-600 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}
          >
            {k === "all" ? "All" : k}
          </button>
        ))}
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search legal name, GSTIN, city"
          className="ml-auto w-56 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
      </div>

      {partners.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No partners.</p>
      ) : (
        <ul className="space-y-2">
          {partners.map((p) => {
            const expired = p.validUntil && new Date(p.validUntil) < new Date();
            return (
              <li key={p.id} className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${!p.active ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{p.legalName}</p>
                      {p.tradeName && <span className="text-xs text-slate-500">({p.tradeName})</span>}
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800">{p.kind}</span>
                      {p.active ? (
                        expired ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">Expired</span>
                                : <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800">Active</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">Paused</span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-600">{p.address}, {p.city}, {p.state} {p.pincode || ""} · {p.countryIso2}</p>
                    {(p.gstin || p.drugLicense) && (
                      <p className="text-[10px] text-slate-400">
                        {p.gstin && <>GSTIN {p.gstin}</>}
                        {p.gstin && p.drugLicense && " · "}
                        {p.drugLicense && <>Drug license {p.drugLicense}</>}
                      </p>
                    )}
                    {p.authorizedBrands && p.authorizedBrands.length > 0 && (
                      <p className="mt-1 text-[10px] text-slate-500">Brands: {p.authorizedBrands.join(", ")}</p>
                    )}
                    {p.validUntil && <p className="text-[10px] text-slate-400">Valid until {new Date(p.validUntil).toLocaleDateString()}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setActive(p, !p.active)} className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-300">
                      {p.active ? "Pause" : "Reactivate"}
                    </button>
                    <button onClick={() => remove(p.id)} className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50" aria-label="Delete">✕</button>
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

function PartnerForm({ orgId, onSaved }: { orgId: string; onSaved: () => void }) {
  const [s, setS] = useState({
    kind: "distributor" as Kind,
    legalName: "", tradeName: "", gstin: "", drugLicense: "",
    address: "", city: "", state: "", countryIso2: "IN", pincode: "",
    contactName: "", contactPhone: "", contactEmail: "",
    authorizedBrands: "", validUntil: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!s.legalName.trim() || !s.address.trim() || !s.city.trim() || !s.state.trim()) {
      setError("Legal name, address, city, state are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/pharma/partners", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          organizationId: orgId,
          kind: s.kind,
          legalName: s.legalName.trim(),
          tradeName: s.tradeName.trim() || undefined,
          gstin: s.gstin.trim() || undefined,
          drugLicense: s.drugLicense.trim() || undefined,
          address: s.address.trim(),
          city: s.city.trim(),
          state: s.state.trim(),
          countryIso2: s.countryIso2.trim().toUpperCase(),
          pincode: s.pincode.trim() || undefined,
          contactName: s.contactName.trim() || undefined,
          contactPhone: s.contactPhone.trim() || undefined,
          contactEmail: s.contactEmail.trim() || undefined,
          authorizedBrands: s.authorizedBrands.split(",").map((b) => b.trim()).filter(Boolean),
          validUntil: s.validUntil || undefined,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.error || "Failed"); return; }
      onSaved();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-bold text-slate-900">New authorized partner</p>
      {error && <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Sel label="Kind" v={s.kind} on={(v) => setS({ ...s, kind: v as Kind })} options={KINDS} />
        <I label="Legal name" v={s.legalName} on={(v) => setS({ ...s, legalName: v })} />
        <I label="Trade name (optional)" v={s.tradeName} on={(v) => setS({ ...s, tradeName: v })} />
        <I label="GSTIN" v={s.gstin} on={(v) => setS({ ...s, gstin: v })} />
        <I label="Drug license #" v={s.drugLicense} on={(v) => setS({ ...s, drugLicense: v })} />
        <I label="Country (ISO-2)" v={s.countryIso2} on={(v) => setS({ ...s, countryIso2: v })} />
        <I label="Address" v={s.address} on={(v) => setS({ ...s, address: v })} className="sm:col-span-2" />
        <I label="City" v={s.city} on={(v) => setS({ ...s, city: v })} />
        <I label="State" v={s.state} on={(v) => setS({ ...s, state: v })} />
        <I label="Pincode" v={s.pincode} on={(v) => setS({ ...s, pincode: v })} />
        <I label="Authorized brands (comma-separated)" v={s.authorizedBrands} on={(v) => setS({ ...s, authorizedBrands: v })} className="sm:col-span-2" placeholder="Empty = all your brands" />
        <I label="Contact name" v={s.contactName} on={(v) => setS({ ...s, contactName: v })} />
        <I label="Contact phone" v={s.contactPhone} on={(v) => setS({ ...s, contactPhone: v })} />
        <I label="Contact email" v={s.contactEmail} on={(v) => setS({ ...s, contactEmail: v })} />
        <label className="text-xs font-semibold text-slate-700">
          Valid until (optional)
          <input type="date" value={s.validUntil} onChange={(e) => setS({ ...s, validUntil: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" />
        </label>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={submit} disabled={busy} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {busy ? "Saving…" : "Add partner"}
        </button>
      </div>
    </div>
  );
}

function I({ label, v, on, placeholder, className = "" }: { label: string; v: string; on: (v: string) => void; placeholder?: string; className?: string }) {
  return <label className={`text-xs font-semibold text-slate-700 ${className}`}>{label}<input value={v} onChange={(e) => on(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal" /></label>;
}
function Sel({ label, v, on, options }: { label: string; v: string; on: (v: string) => void; options: string[] }) {
  return <label className="text-xs font-semibold text-slate-700">{label}<select value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>;
}
