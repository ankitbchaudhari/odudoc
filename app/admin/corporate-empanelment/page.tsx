"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CorporateClient, Preauthorization, ClientStatus, ClientType, BillingMode, PreauthStatus,
} from "@/lib/hospital/corporate-empanelment-store";
// Inlined from corporate-empanelment-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const CLIENT_STATUS_LABEL: Record<ClientStatus, string> = {
  prospect: "Prospect", negotiating: "Negotiating", active: "Active",
  suspended: "Suspended", terminated: "Terminated", expired: "Expired",
};
const CLIENT_TYPE_LABEL: Record<ClientType, string> = {
  corporate: "Corporate", tpa: "TPA", insurer: "Insurer", psu: "PSU",
  govt: "Government", cghs: "CGHS", echs: "ECHS", railway: "Railway", ngo: "NGO",
};
const BILLING_MODE_LABEL: Record<BillingMode, string> = {
  cashless: "Cashless", reimbursement: "Reimbursement", hybrid: "Hybrid", direct_billing: "Direct billing",
};
const PREAUTH_STATUS_LABEL: Record<PreauthStatus, string> = {
  draft: "Draft", submitted: "Submitted", approved: "Approved",
  partially_approved: "Partially approved", denied: "Denied",
  info_requested: "Info requested", expired: "Expired", cancelled: "Cancelled", consumed: "Consumed",
};

interface Patient { id: string; firstName: string; lastName: string; }

const CLIENT_STATUSES: ClientStatus[] = ["prospect", "negotiating", "active", "suspended", "terminated", "expired"];
const CLIENT_TYPES: ClientType[] = ["corporate", "tpa", "insurer", "psu", "govt", "cghs", "echs", "railway", "ngo"];
const BILLING_MODES: BillingMode[] = ["cashless", "reimbursement", "hybrid", "direct_billing"];
const PREAUTH_STATUSES: PreauthStatus[] = ["draft", "submitted", "approved", "partially_approved", "denied", "info_requested", "expired", "cancelled", "consumed"];

export default function CorporateEmpanelmentPage() {
  const [tab, setTab] = useState<"clients" | "preauths">("clients");
  const [clients, setClients] = useState<CorporateClient[]>([]);
  const [preauths, setPreauths] = useState<Preauthorization[]>([]);
  const [stats, setStats] = useState<{ activeClients: number; prospects: number; expiringSoon: number; totalLives: number; pendingPreauths: number; approvedMonth: number; approvedAmountMonth: number; deniedMonth: number } | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showClient, setShowClient] = useState(false);
  const [showPreauth, setShowPreauth] = useState(false);
  const [editClient, setEditClient] = useState<CorporateClient | null>(null);
  const [editPreauth, setEditPreauth] = useState<Preauthorization | null>(null);
  const [filterStatus, setFilterStatus] = useState<ClientStatus | "">("");
  const [filterPreauthStatus, setFilterPreauthStatus] = useState<PreauthStatus | "">("");

  async function load() {
    const res = await fetch("/api/hospital/corporate-empanelment", { cache: "no-store" });
    const data = await res.json();
    setClients(data.clients || []);
    setPreauths(data.preauths || []);
    setStats(data.stats || null);
  }
  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      const data = await res.json();
      setPatients(data.patients || []);
    } catch {}
  }
  useEffect(() => { load(); loadPatients(); }, []);

  async function removeClient(id: string) {
    if (!confirm("Delete client and all its preauths?")) return;
    await fetch("/api/hospital/corporate-empanelment", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }
  async function removePreauth(id: string) {
    if (!confirm("Delete preauthorization?")) return;
    await fetch("/api/hospital/corporate-empanelment", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, kind: "preauth" }) });
    load();
  }

  const filteredClients = useMemo(
    () => clients.filter((c) => (filterStatus ? c.status === filterStatus : true)),
    [clients, filterStatus],
  );
  const filteredPreauths = useMemo(
    () => preauths.filter((p) => (filterPreauthStatus ? p.status === filterPreauthStatus : true)),
    [preauths, filterPreauthStatus],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Corporate Empanelment</h1>
          <p className="text-sm text-slate-500">TPA / insurer contracts, tariffs, and cashless preauthorizations</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditClient(null); setShowClient(true); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">+ Client</button>
          <button onClick={() => { setEditPreauth(null); setShowPreauth(true); }} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">+ Preauth</button>
        </div>
      </div>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          <StatTile label="Active clients" value={stats.activeClients} tone="emerald" />
          <StatTile label="Prospects" value={stats.prospects} tone="indigo" />
          <StatTile label="Expiring ≤30d" value={stats.expiringSoon} tone="amber" />
          <StatTile label="Total lives" value={stats.totalLives} tone="slate" />
          <StatTile label="Pending preauth" value={stats.pendingPreauths} tone="amber" />
          <StatTile label="Approved (mth)" value={stats.approvedMonth} tone="emerald" />
          <StatTile label="Approved ₹ (mth)" value={stats.approvedAmountMonth} tone="slate" />
          <StatTile label="Denied (mth)" value={stats.deniedMonth} tone="rose" />
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <TabBtn active={tab === "clients"} onClick={() => setTab("clients")}>Clients ({clients.length})</TabBtn>
        <TabBtn active={tab === "preauths"} onClick={() => setTab("preauths")}>Preauthorizations ({preauths.length})</TabBtn>
      </div>

      {tab === "clients" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={filterStatus === ""} onClick={() => setFilterStatus("")}>All</FilterPill>
            {CLIENT_STATUSES.map((s) => (
              <FilterPill key={s} active={filterStatus === s} onClick={() => setFilterStatus(s)}>{CLIENT_STATUS_LABEL[s]}</FilterPill>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Billing</th>
                  <th className="px-4 py-3">Contract</th>
                  <th className="px-4 py-3">Lives</th>
                  <th className="px-4 py-3">Tariff</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.id}{c.shortCode ? ` · ${c.shortCode}` : ""} · {c.contactPerson}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{CLIENT_TYPE_LABEL[c.clientType]}</td>
                    <td className="px-4 py-3 text-slate-700">{BILLING_MODE_LABEL[c.billingMode]}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <div>{new Date(c.contractStartDate).toLocaleDateString()}</div>
                      {c.contractEndDate && <div>to {new Date(c.contractEndDate).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.employeeHeadcount ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{c.tariffItems.length} items</td>
                    <td className="px-4 py-3"><Pill status={c.status}>{CLIENT_STATUS_LABEL[c.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditClient(c); setShowClient(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => removeClient(c.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && <tr><td colSpan={8}><Empty>No clients yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "preauths" && (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <FilterPill active={filterPreauthStatus === ""} onClick={() => setFilterPreauthStatus("")}>All</FilterPill>
            {PREAUTH_STATUSES.map((s) => (
              <FilterPill key={s} active={filterPreauthStatus === s} onClick={() => setFilterPreauthStatus(s)}>{PREAUTH_STATUS_LABEL[s]}</FilterPill>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Diagnosis</th>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Approved</th>
                  <th className="px-4 py-3">Valid</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPreauths.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.patientName}</div>
                      <div className="text-xs text-slate-500">{p.id}{p.policyNumber ? ` · ${p.policyNumber}` : ""}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{p.clientName}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{p.diagnosis}</div>
                      {p.plannedProcedure && <div className="text-xs text-slate-500">{p.plannedProcedure}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">₹{p.requestedAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-emerald-700">{p.approvedAmount ? `₹${p.approvedAmount.toLocaleString()}` : "-"}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.validUntil ? new Date(p.validUntil).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3"><Pill status={p.status}>{PREAUTH_STATUS_LABEL[p.status]}</Pill></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditPreauth(p); setShowPreauth(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                      <button onClick={() => removePreauth(p.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                    </td>
                  </tr>
                ))}
                {filteredPreauths.length === 0 && <tr><td colSpan={8}><Empty>No preauthorizations yet.</Empty></td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showClient && (
        <ClientModal
          initial={editClient}
          onClose={() => { setShowClient(false); setEditClient(null); }}
          onSaved={() => { setShowClient(false); setEditClient(null); load(); }}
        />
      )}
      {showPreauth && (
        <PreauthModal
          clients={clients}
          patients={patients}
          initial={editPreauth}
          onClose={() => { setShowPreauth(false); setEditPreauth(null); }}
          onSaved={() => { setShowPreauth(false); setEditPreauth(null); load(); }}
        />
      )}
    </div>
  );
}

function ClientModal({ initial, onClose, onSaved }: { initial: CorporateClient | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<CorporateClient>>(
    initial ?? {
      clientType: "corporate", status: "prospect", billingMode: "cashless",
      contractStartDate: new Date().toISOString().slice(0, 10),
      tariffItems: [], preauthRequired: true, creditDays: 30,
    },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function addTariff() {
    const items = [...(form.tariffItems || [])];
    items.push({ id: `tf-${Date.now()}`, description: "", negotiatedPrice: 0 });
    setForm({ ...form, tariffItems: items });
  }
  function updTariff(i: number, patch: Partial<{ code: string; description: string; standardPrice: number; negotiatedPrice: number; discountPct: number; cashlessLimit: number; notes: string }>) {
    const items = [...(form.tariffItems || [])];
    items[i] = { ...items[i], ...patch };
    setForm({ ...form, tariffItems: items });
  }
  function rmTariff(i: number) {
    const items = [...(form.tariffItems || [])];
    items.splice(i, 1);
    setForm({ ...form, tariffItems: items });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/corporate-empanelment", {
      method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit client" : "New empanelled client"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Name *"><input className="inp" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Short code"><input className="inp" value={form.shortCode || ""} onChange={(e) => setForm({ ...form, shortCode: e.target.value })} /></Field>
          <Field label="Type"><select className="inp" value={form.clientType || "corporate"} onChange={(e) => setForm({ ...form, clientType: e.target.value as ClientType })}>{CLIENT_TYPES.map((t) => <option key={t} value={t}>{CLIENT_TYPE_LABEL[t]}</option>)}</select></Field>
          <Field label="Status"><select className="inp" value={form.status || "prospect"} onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}>{CLIENT_STATUSES.map((s) => <option key={s} value={s}>{CLIENT_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Billing mode"><select className="inp" value={form.billingMode || "cashless"} onChange={(e) => setForm({ ...form, billingMode: e.target.value as BillingMode })}>{BILLING_MODES.map((b) => <option key={b} value={b}>{BILLING_MODE_LABEL[b]}</option>)}</select></Field>
          <Field label="GSTIN"><input className="inp" value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} /></Field>
          <Field label="PAN"><input className="inp" value={form.pan || ""} onChange={(e) => setForm({ ...form, pan: e.target.value })} /></Field>
          <Field label="Contact person *"><input className="inp" value={form.contactPerson || ""} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} /></Field>
          <Field label="Contact email"><input className="inp" value={form.contactEmail || ""} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} /></Field>
          <Field label="Contact phone"><input className="inp" value={form.contactPhone || ""} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></Field>
          <Field label="City"><input className="inp" value={form.city || ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
          <Field label="State"><input className="inp" value={form.state || ""} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Field>
          <Field label="Pincode"><input className="inp" value={form.pincode || ""} onChange={(e) => setForm({ ...form, pincode: e.target.value })} /></Field>
          <Field label="Contract start *"><input type="date" className="inp" value={(form.contractStartDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, contractStartDate: e.target.value })} /></Field>
          <Field label="Contract end"><input type="date" className="inp" value={(form.contractEndDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} /></Field>
          <Field label="Employee headcount"><input type="number" className="inp" value={form.employeeHeadcount ?? ""} onChange={(e) => setForm({ ...form, employeeHeadcount: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Sum insured / life"><input type="number" className="inp" value={form.coverageSumInsured ?? ""} onChange={(e) => setForm({ ...form, coverageSumInsured: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Credit limit"><input type="number" className="inp" value={form.creditLimit ?? ""} onChange={(e) => setForm({ ...form, creditLimit: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Credit days"><input type="number" className="inp" value={form.creditDays ?? ""} onChange={(e) => setForm({ ...form, creditDays: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Cashless threshold"><input type="number" className="inp" value={form.cashlessThreshold ?? ""} onChange={(e) => setForm({ ...form, cashlessThreshold: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Room category"><input className="inp" value={form.roomCategory || ""} onChange={(e) => setForm({ ...form, roomCategory: e.target.value })} /></Field>
          <div className="md:col-span-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.dependentsCovered} onChange={(e) => setForm({ ...form, dependentsCovered: e.target.checked })} /> Dependents covered</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} /> Auto-renew</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.preauthRequired} onChange={(e) => setForm({ ...form, preauthRequired: e.target.checked })} /> Preauth required</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.kycDocsComplete} onChange={(e) => setForm({ ...form, kycDocsComplete: e.target.checked })} /> KYC complete</label>
          </div>
          <Field label="Inclusions" full><textarea className="inp" rows={2} value={form.inclusions || ""} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} /></Field>
          <Field label="Exclusions" full><textarea className="inp" rows={2} value={form.exclusions || ""} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} /></Field>
          <Field label="MOU URL"><input className="inp" value={form.mouUrl || ""} onChange={(e) => setForm({ ...form, mouUrl: e.target.value })} /></Field>
          <Field label="Rate card URL"><input className="inp" value={form.rateCardUrl || ""} onChange={(e) => setForm({ ...form, rateCardUrl: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>

        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Tariff items</div>
            <button onClick={addTariff} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Add item</button>
          </div>
          {(form.tariffItems || []).length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">No tariff items yet.</div>}
          {(form.tariffItems || []).map((t, i) => (
            <div key={t.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-12">
              <input className="inp md:col-span-2" placeholder="Code" value={t.code || ""} onChange={(e) => updTariff(i, { code: e.target.value })} />
              <input className="inp md:col-span-4" placeholder="Description" value={t.description} onChange={(e) => updTariff(i, { description: e.target.value })} />
              <input type="number" className="inp md:col-span-2" placeholder="Std ₹" value={t.standardPrice ?? ""} onChange={(e) => updTariff(i, { standardPrice: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <input type="number" className="inp md:col-span-2" placeholder="Neg ₹" value={t.negotiatedPrice} onChange={(e) => updTariff(i, { negotiatedPrice: Number(e.target.value) || 0 })} />
              <input type="number" className="inp md:col-span-1" placeholder="%" value={t.discountPct ?? ""} onChange={(e) => updTariff(i, { discountPct: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <button onClick={() => rmTariff(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 md:col-span-1">×</button>
            </div>
          ))}
        </div>

        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function PreauthModal({ clients, patients, initial, onClose, onSaved }: { clients: CorporateClient[]; patients: Patient[]; initial: Preauthorization | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Preauthorization>>(
    initial ?? { status: "draft", requestedAmount: 0 },
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function onPatient(id: string) {
    const p = patients.find((x) => x.id === id);
    setForm({ ...form, patientId: id, patientName: p ? `${p.firstName} ${p.lastName}` : form.patientName });
  }

  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, kind: "preauth" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/corporate-empanelment", {
      method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit preauthorization" : "New preauthorization"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Client *">
            <select className="inp" value={form.clientId || ""} onChange={(e) => {
              const c = clients.find((x) => x.id === e.target.value);
              setForm({ ...form, clientId: e.target.value, clientName: c?.name || form.clientName });
            }}>
              <option value="">-- Select --</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
            </select>
          </Field>
          <Field label="Patient *">
            <select className="inp" value={form.patientId || ""} onChange={(e) => onPatient(e.target.value)}>
              <option value="">-- Select --</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.id})</option>)}
            </select>
          </Field>
          <Field label="Employee ID"><input className="inp" value={form.employeeId || ""} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} /></Field>
          <Field label="Policy number"><input className="inp" value={form.policyNumber || ""} onChange={(e) => setForm({ ...form, policyNumber: e.target.value })} /></Field>
          <Field label="Admission ID"><input className="inp" value={form.admissionId || ""} onChange={(e) => setForm({ ...form, admissionId: e.target.value })} /></Field>
          <Field label="ICD-10"><input className="inp" value={form.icd10Code || ""} onChange={(e) => setForm({ ...form, icd10Code: e.target.value })} /></Field>
          <Field label="Diagnosis *" full><input className="inp" value={form.diagnosis || ""} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></Field>
          <Field label="Planned procedure" full><input className="inp" value={form.plannedProcedure || ""} onChange={(e) => setForm({ ...form, plannedProcedure: e.target.value })} /></Field>
          <Field label="Requested amount ₹ *"><input type="number" className="inp" value={form.requestedAmount ?? 0} onChange={(e) => setForm({ ...form, requestedAmount: Number(e.target.value) || 0 })} /></Field>
          <Field label="Approved amount ₹"><input type="number" className="inp" value={form.approvedAmount ?? ""} onChange={(e) => setForm({ ...form, approvedAmount: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as PreauthStatus })}>{PREAUTH_STATUSES.map((s) => <option key={s} value={s}>{PREAUTH_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Valid until"><input type="date" className="inp" value={(form.validUntil || "").slice(0, 10)} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} /></Field>
          <Field label="Approval code"><input className="inp" value={form.approvalCode || ""} onChange={(e) => setForm({ ...form, approvalCode: e.target.value })} /></Field>
          <Field label="Submitted by *"><input className="inp" value={form.submittedBy || ""} onChange={(e) => setForm({ ...form, submittedBy: e.target.value })} /></Field>
          <Field label="Denial reason" full><textarea className="inp" rows={2} value={form.denialReason || ""} onChange={(e) => setForm({ ...form, denialReason: e.target.value })} /></Field>
          <Field label="Info requested by TPA" full><textarea className="inp" rows={2} value={form.infoRequested || ""} onChange={(e) => setForm({ ...form, infoRequested: e.target.value })} /></Field>
          <Field label="Notes" full><textarea className="inp" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = {
    slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <div className={`rounded-xl p-4 ${t[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>;
}
function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-primary-600 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{children}</button>;
}
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    prospect: "bg-slate-100 text-slate-700", negotiating: "bg-indigo-100 text-indigo-700",
    active: "bg-emerald-100 text-emerald-700", suspended: "bg-amber-100 text-amber-700",
    terminated: "bg-rose-100 text-rose-700", expired: "bg-rose-100 text-rose-700",
    draft: "bg-slate-100 text-slate-700", submitted: "bg-indigo-100 text-indigo-700",
    approved: "bg-emerald-100 text-emerald-700", partially_approved: "bg-emerald-100 text-emerald-700",
    denied: "bg-rose-100 text-rose-700", info_requested: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-700", consumed: "bg-slate-100 text-slate-700",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
