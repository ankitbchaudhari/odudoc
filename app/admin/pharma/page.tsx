"use client";

// V7 §3 Pharmaceutical company admin panel.
//
// Four tabs:
//   1. Drug Master — V7 §3.3 contribute INN + multi-language aliases
//   2. MRs — V7 §3.5 medical representative roster
//   3. ADRs — V7 §3.7 adverse drug reaction queue with PV escalation
//   4. Anti-counterfeit — V7 §3.6 issue batch + serials, recall

import { useCallback, useEffect, useState } from "react";

type Tab = "drugs" | "mrs" | "adrs" | "batches";

interface Company { id: string; name: string; country: string; drugCount: number; mrCount: number }
interface DrugAlias { locale: string; kind: "brand" | "generic"; localName: string; manufacturerId?: string }
interface Drug { id: string; inn: string; atcCode?: string; schedule?: string; aliases: DrugAlias[]; contributedByPharmaId: string; reviewed: boolean; status: string }
interface MR { id: string; pharmaCompanyId: string; name: string; email: string; territory?: string; status: string }
interface ADR { id: string; drugInn: string; severity: string; reaction: string; reportedByEmail: string; reportedAt: string; pvSentAt?: string; pvReference?: string; pharmaAckAt?: string }
interface Batch { id: string; brandName: string; drugInn: string; batchNumber: string; manufacturedOn: string; expiresOn: string; unitsIssued: number; status: string; recallReason?: string }

const SEV_PILL: Record<string, string> = {
  mild: "bg-emerald-100 text-emerald-800",
  moderate: "bg-amber-100 text-amber-800",
  severe: "bg-orange-100 text-orange-800",
  life_threatening: "bg-rose-100 text-rose-800",
  fatal: "bg-rose-200 text-rose-900",
};

export default function PharmaPanelPage() {
  const [tab, setTab] = useState<Tab>("drugs");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/pharma/companies", { cache: "no-store" });
      if (r.ok) {
        const d = await r.json();
        setCompanies(d.companies || []);
        if (d.companies?.[0]?.id) setCompanyId(d.companies[0].id);
      }
    })();
  }, []);

  const co = companies.find((c) => c.id === companyId);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pharma Panel</h1>
          <p className="mt-1 text-sm text-gray-600">
            V7 §3 — drug master contribution, MR management, ADR reporting,
            anti-counterfeit. Active pharma: <strong>{co?.name || "—"}</strong>
          </p>
        </div>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {([
          ["drugs", `Drug Master (${co?.drugCount ?? 0})`],
          ["mrs", `MRs (${co?.mrCount ?? 0})`],
          ["adrs", "ADRs"],
          ["batches", "Anti-counterfeit batches"],
        ] as [Tab, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === k ? "border-[#0F6E56] text-[#0F6E56]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "drugs" && companyId && <DrugMasterTab companyId={companyId} />}
      {tab === "mrs" && companyId && <MrsTab companyId={companyId} />}
      {tab === "adrs" && companyId && <AdrsTab companyId={companyId} />}
      {tab === "batches" && companyId && <BatchesTab companyId={companyId} />}
    </div>
  );
}

function DrugMasterTab({ companyId }: { companyId: string }) {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    const r = await fetch(`/api/pharma/master?${qs}`, { cache: "no-store" });
    if (r.ok) setDrugs((await r.json()).drugs || []);
  }, [search]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search INN or local name…"
          className="w-72 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
        />
        <button onClick={() => setShowAdd(true)} className="rounded-xl bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white">+ Contribute drug</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr><th className="px-4 py-2 text-left">INN</th><th className="px-4 py-2 text-left">ATC</th><th className="px-4 py-2 text-left">Schedule</th><th className="px-4 py-2 text-left">Aliases</th><th className="px-4 py-2 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {drugs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No drugs match.</td></tr>
            ) : drugs.map((d) => (
              <tr key={d.id}>
                <td className="px-4 py-2 font-semibold">{d.inn}</td>
                <td className="px-4 py-2 font-mono text-xs">{d.atcCode || "—"}</td>
                <td className="px-4 py-2">{d.schedule || "—"}</td>
                <td className="px-4 py-2 text-xs text-gray-600">
                  {d.aliases.slice(0, 4).map((a, i) => (
                    <span key={i} className="mr-1 inline-flex rounded-full bg-gray-100 px-2 py-0.5">{a.locale}: {a.localName}</span>
                  ))}
                  {d.aliases.length > 4 && <span className="text-gray-400">+{d.aliases.length - 4}</span>}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.status === "published" ? "bg-emerald-100 text-emerald-800" : d.status === "rejected" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <ContributeDrugModal companyId={companyId} onClose={() => setShowAdd(false)} onAdded={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function ContributeDrugModal({ companyId, onClose, onAdded }: { companyId: string; onClose: () => void; onAdded: () => void }) {
  const [inn, setInn] = useState("");
  const [atcCode, setAtcCode] = useState("");
  const [schedule, setSchedule] = useState("OTC");
  const [aliasesText, setAliasesText] = useState("en-IN|generic|");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    const aliases = aliasesText.split("\n").filter(l => l.trim()).map((line) => {
      const [locale, kind, ...name] = line.split("|");
      return { locale: (locale || "").trim(), kind: ((kind || "generic").trim() as "brand" | "generic"), localName: name.join("|").trim() };
    }).filter(a => a.localName);
    if (aliases.length === 0) { setErr("Add at least one alias (format: locale|brand|name)."); setBusy(false); return; }
    const r = await fetch("/api/pharma/master", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ inn, atcCode: atcCode || undefined, schedule: schedule || undefined, aliases, contributedByPharmaId: companyId }),
    });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Failed"); return; }
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Contribute drug to universal master</h2>
        <p className="mt-1 text-xs text-gray-500">Cross-pharma contributions on an existing INN come in as draft until Odudoc medical board reviews.</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-gray-700">INN<input value={inn} onChange={(e) => setInn(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" placeholder="Paracetamol" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-gray-700">ATC code<input value={atcCode} onChange={(e) => setAtcCode(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" placeholder="N02BE01" /></label>
            <label className="block text-xs font-semibold text-gray-700">Schedule
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal">
                <option>OTC</option><option>G</option><option>H1</option><option>X</option><option>NDPS_X</option>
              </select>
            </label>
          </div>
          <label className="block text-xs font-semibold text-gray-700">
            Aliases (one per line · format: <code className="font-mono text-gray-500">locale|brand-or-generic|name</code>)
            <textarea value={aliasesText} onChange={(e) => setAliasesText(e.target.value)} rows={5} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal font-mono" />
          </label>
          {err && <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-800">{err}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy || !inn} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Submitting…" : "Contribute"}</button>
        </div>
      </div>
    </div>
  );
}

function MrsTab({ companyId }: { companyId: string }) {
  const [mrs, setMrs] = useState<MR[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", territory: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/pharma/mrs?pharmaCompanyId=${companyId}`, { cache: "no-store" });
    if (r.ok) setMrs((await r.json()).mrs || []);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    setBusy(true);
    const r = await fetch("/api/pharma/mrs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, pharmaCompanyId: companyId }) });
    setBusy(false);
    if (r.ok) { setForm({ name: "", email: "", phone: "", territory: "" }); load(); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr><th className="px-4 py-2 text-left">Name</th><th className="px-4 py-2 text-left">Email</th><th className="px-4 py-2 text-left">Territory</th><th className="px-4 py-2 text-left">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mrs.length === 0 ? <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No MRs yet.</td></tr>
              : mrs.map((m) => <tr key={m.id}><td className="px-4 py-2 font-medium">{m.name}</td><td className="px-4 py-2 text-xs">{m.email}</td><td className="px-4 py-2 text-xs">{m.territory || "—"}</td><td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${m.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{m.status}</span></td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900">Add MR</h3>
        <div className="mt-3 space-y-2 text-xs">
          {(["name", "email", "phone", "territory"] as const).map((k) => (
            <label key={k} className="block font-semibold text-gray-700">{k}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" /></label>
          ))}
          <button onClick={add} disabled={busy || !form.name || !form.email} className="mt-2 w-full rounded-lg bg-[#0F6E56] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Adding…" : "Add MR"}</button>
        </div>
      </div>
    </div>
  );
}

function AdrsTab({ companyId }: { companyId: string }) {
  const [adrs, setAdrs] = useState<ADR[]>([]);
  const [pvRef, setPvRef] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const r = await fetch(`/api/pharma/adrs?manufacturerPharmaId=${companyId}`, { cache: "no-store" });
    if (r.ok) setAdrs((await r.json()).adrs || []);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {adrs.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">No ADR reports yet.</p>
        : <ul className="divide-y divide-gray-100">
            {adrs.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEV_PILL[a.severity] || "bg-gray-100 text-gray-600"}`}>{a.severity}</span>
                      <span className="font-semibold text-gray-900">{a.drugInn}</span>
                      <span className="text-xs text-gray-400">{new Date(a.reportedAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">{a.reaction}</p>
                    <p className="mt-1 text-xs text-gray-500">By {a.reportedByEmail}{a.pharmaAckAt && <span className="ml-2 text-emerald-700 font-semibold">Acknowledged</span>}{a.pvSentAt && <span className="ml-2 text-indigo-700 font-semibold">Sent to PV ({a.pvReference})</span>}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
      }
    </div>
  );
}

function BatchesTab({ companyId }: { companyId: string }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showIssue, setShowIssue] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/pharma/batches?pharmaCompanyId=${companyId}`, { cache: "no-store" });
    if (r.ok) setBatches((await r.json()).batches || []);
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const recall = async (batchId: string) => {
    const reason = prompt("Recall reason?");
    if (!reason) return;
    const r = await fetch(`/api/pharma/batches/${batchId}/recall`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reason }) });
    if (r.ok) load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Issue a batch with N serial codes. Each serial = one consumable unit. Public verifier at <a href="/verify-medicine" className="text-[#0F6E56] underline">/verify-medicine</a>.</p>
        <button onClick={() => setShowIssue(true)} className="rounded-xl bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white">+ Issue batch</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
            <tr><th className="px-4 py-2 text-left">Brand · INN</th><th className="px-4 py-2 text-left">Batch #</th><th className="px-4 py-2 text-left">Mfg</th><th className="px-4 py-2 text-left">Expires</th><th className="px-4 py-2 text-right">Units</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {batches.length === 0 ? <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No batches yet.</td></tr>
              : batches.map((b) => (
                <tr key={b.id}>
                  <td className="px-4 py-2"><div className="font-semibold">{b.brandName}</div><div className="text-xs text-gray-500">{b.drugInn}</div></td>
                  <td className="px-4 py-2 font-mono text-xs">{b.batchNumber}</td>
                  <td className="px-4 py-2 text-xs">{b.manufacturedOn}</td>
                  <td className="px-4 py-2 text-xs">{b.expiresOn}</td>
                  <td className="px-4 py-2 text-right">{b.unitsIssued.toLocaleString()}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{b.status}</span>{b.recallReason && <div className="mt-1 text-[10px] text-rose-700">{b.recallReason}</div>}</td>
                  <td className="px-4 py-2 text-right">{b.status === "active" && <button onClick={() => recall(b.id)} className="rounded border border-rose-300 px-2 py-0.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50">Recall</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {showIssue && <IssueBatchModal companyId={companyId} onClose={() => setShowIssue(false)} onIssued={() => { setShowIssue(false); load(); }} />}
    </div>
  );
}

function IssueBatchModal({ companyId, onClose, onIssued }: { companyId: string; onClose: () => void; onIssued: () => void }) {
  const [form, setForm] = useState({
    drugInn: "Paracetamol", brandName: "Crocin 500", batchNumber: "B-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    manufacturedOn: new Date().toISOString().slice(0, 10),
    expiresOn: new Date(Date.now() + 2 * 365 * 86400_000).toISOString().slice(0, 10),
    unitsIssued: 100, manufacturingSite: "",
  });
  const [busy, setBusy] = useState(false);
  const [samples, setSamples] = useState<string[]>([]);

  const submit = async () => {
    setBusy(true);
    const r = await fetch("/api/pharma/batches", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, pharmaCompanyId: companyId }) });
    setBusy(false);
    if (r.ok) {
      const d = await r.json();
      setSamples(d.sampleSerials || []);
    }
  };

  if (samples.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
          <h2 className="text-lg font-bold text-gray-900">Batch issued — sample serials</h2>
          <p className="mt-1 text-xs text-gray-500">First 8 of {form.unitsIssued} generated. Full list goes to the label-printer pipeline. Test verification on any one at <a href="/verify-medicine" target="_blank" rel="noreferrer" className="text-[#0F6E56] underline">/verify-medicine</a>.</p>
          <pre className="mt-3 rounded-lg bg-gray-50 p-3 text-xs font-mono">{samples.join("\n")}</pre>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => { setSamples([]); onIssued(); }} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white">Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900">Issue anti-counterfeit batch</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {(["drugInn", "brandName", "batchNumber", "manufacturingSite"] as const).map((k) => (
            <label key={k} className="font-semibold text-gray-700">{k}<input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" /></label>
          ))}
          <label className="font-semibold text-gray-700">manufacturedOn<input type="date" value={form.manufacturedOn} onChange={(e) => setForm({ ...form, manufacturedOn: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" /></label>
          <label className="font-semibold text-gray-700">expiresOn<input type="date" value={form.expiresOn} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" /></label>
          <label className="font-semibold text-gray-700 col-span-2">unitsIssued<input type="number" value={form.unitsIssued} onChange={(e) => setForm({ ...form, unitsIssued: Number(e.target.value) })} className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm font-normal" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-[#0F6E56] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Issuing…" : "Issue + generate serials"}</button>
        </div>
      </div>
    </div>
  );
}
