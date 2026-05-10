"use client";

import { useEffect, useState } from "react";
import type { Account, JournalEntry, JournalLine, AccountType, JournalStatus } from "@/lib/hospital/gl-store";
import { PageHero, StatGrid, StatCard, TabSwitch } from "@/components/admin/PageShell";
// Inlined from gl-store — importing runtime values pulls persistent-array → Postgres into the client bundle and crashes the page.
const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset", liability: "Liability", equity: "Equity", income: "Income", expense: "Expense",
};
const JOURNAL_STATUS_LABEL: Record<JournalStatus, string> = {
  draft: "Draft", posted: "Posted", reversed: "Reversed",
};

const TYPES: AccountType[] = ["asset", "liability", "equity", "income", "expense"];
const STATUSES: JournalStatus[] = ["draft", "posted", "reversed"];

export default function GLPage() {
  const [tab, setTab] = useState<"journals" | "accounts">("journals");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<{ accountsActive: number; drafts: number; postedMonth: number; debitMonth: number; balanceAsset: number; balanceLiability: number; balanceIncome: number; balanceExpense: number } | null>(null);
  const [showAcc, setShowAcc] = useState(false);
  const [showJrn, setShowJrn] = useState(false);
  const [editAcc, setEditAcc] = useState<Account | null>(null);
  const [editJrn, setEditJrn] = useState<JournalEntry | null>(null);

  async function load() {
    const res = await fetch("/api/hospital/gl", { cache: "no-store" });
    const data = await res.json();
    setAccounts(data.accounts || []); setJournals(data.journals || []); setStats(data.stats || null);
  }
  useEffect(() => { load(); }, []);

  async function del(id: string, recordKind?: string) {
    if (!confirm("Delete?")) return;
    await fetch("/api/hospital/gl", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, recordKind }) });
    load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHero
        icon="📒"
        eyebrow="Finance"
        title="General Ledger"
        subtitle="Chart of accounts · Journal entries · Double-entry bookkeeping"
        tone="emerald"
        secondaryAction={{ label: "+ Account", onClick: () => { setEditAcc(null); setShowAcc(true); } }}
        primaryAction={{ label: "+ Journal", onClick: () => { setEditJrn(null); setShowJrn(true); } }}
      />

      {stats && (
        <StatGrid cols={7}>
          <StatCard label="Active accounts" value={stats.accountsActive} tone="slate" icon="📁" />
          <StatCard label="Drafts" value={stats.drafts} tone="amber" icon="✎" />
          <StatCard label="Posted (mo)" value={stats.postedMonth} tone="emerald" icon="✓" />
          <StatCard label="Debit (mo)" value={stats.debitMonth} tone="indigo" icon="↑" />
          <StatCard label="Assets" value={stats.balanceAsset} tone="teal" icon="◆" />
          <StatCard label="Liabilities" value={stats.balanceLiability} tone="rose" icon="◇" />
          <StatCard label="Income" value={stats.balanceIncome} tone="emerald" icon="₹" />
          <StatCard label="Expense" value={stats.balanceExpense} tone="orange" icon="−" />
        </StatGrid>
      )}

      <TabSwitch
        active={tab}
        onSelect={(k) => setTab(k as "journals" | "accounts")}
        tabs={[
          { key: "journals", label: "Journals", count: journals.length },
          { key: "accounts", label: "Accounts", count: accounts.length },
        ]}
      />

      {tab === "accounts" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Active</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{a.code}</td>
                  <td className="px-4 py-3"><div className="font-semibold text-slate-900">{a.name}</div><div className="text-xs text-slate-500">{a.id}</div></td>
                  <td className="px-4 py-3"><Pill status={a.accountType}>{ACCOUNT_TYPE_LABEL[a.accountType]}</Pill></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{a.parentCode || "-"}</td>
                  <td className="px-4 py-3 text-xs">{a.active ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditAcc(a); setShowAcc(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                    <button onClick={() => del(a.id)} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && <tr><td colSpan={6}><Empty>No accounts yet.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "journals" && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr><th className="px-4 py-3">Entry</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Narration</th><th className="px-4 py-3">Lines</th><th className="px-4 py-3">Debit</th><th className="px-4 py-3">Credit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {journals.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{j.id}<div className="text-slate-500">{j.reference || ""}</div></td>
                  <td className="px-4 py-3 text-xs">{new Date(j.entryDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-xs text-slate-700">{j.narration}</td>
                  <td className="px-4 py-3 text-xs">{j.lines.length}</td>
                  <td className="px-4 py-3 text-xs">{j.totalDebit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{j.totalCredit.toFixed(2)}</td>
                  <td className="px-4 py-3"><Pill status={j.status}>{JOURNAL_STATUS_LABEL[j.status]}</Pill></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => { setEditJrn(j); setShowJrn(true); }} className="mr-2 text-xs font-semibold text-primary-600 hover:text-primary-700">Edit</button>
                    <button onClick={() => del(j.id, "journal")} className="text-xs font-semibold text-rose-600 hover:text-rose-700">Delete</button>
                  </td>
                </tr>
              ))}
              {journals.length === 0 && <tr><td colSpan={8}><Empty>No journals.</Empty></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showAcc && <AccountModal initial={editAcc} onClose={() => { setShowAcc(false); setEditAcc(null); }} onSaved={() => { setShowAcc(false); setEditAcc(null); load(); }} />}
      {showJrn && <JournalModal accounts={accounts} initial={editJrn} onClose={() => { setShowJrn(false); setEditJrn(null); }} onSaved={() => { setShowJrn(false); setEditJrn(null); load(); }} />}
    </div>
  );
}

function AccountModal({ initial, onClose, onSaved }: { initial: Account | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Account>>(initial ?? { accountType: "asset", active: true });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/gl", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit account" : "New account"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Code *"><input className="inp" value={form.code || ""} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
          <Field label="Type"><select className="inp" value={form.accountType || "asset"} onChange={(e) => setForm({ ...form, accountType: e.target.value as AccountType })}>{TYPES.map((t) => <option key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</option>)}</select></Field>
          <Field label="Name *" full><input className="inp" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Parent code"><input className="inp" value={form.parentCode || ""} onChange={(e) => setForm({ ...form, parentCode: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <Field label="Description" full><textarea className="inp" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function JournalModal({ accounts, initial, onClose, onSaved }: { accounts: Account[]; initial: JournalEntry | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<JournalEntry>>(
    initial ?? { status: "draft", entryDate: new Date().toISOString().slice(0, 10), lines: [{ id: "ln-1", accountCode: "", debit: 0, credit: 0 }, { id: "ln-2", accountCode: "", debit: 0, credit: 0 }] },
  );
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  function addLine() { setForm({ ...form, lines: [...(form.lines || []), { id: `ln-${Date.now()}`, accountCode: "", debit: 0, credit: 0 }] }); }
  function updLine(i: number, patch: Partial<JournalLine>) { const lines = [...(form.lines || [])]; lines[i] = { ...lines[i], ...patch }; setForm({ ...form, lines }); }
  function rmLine(i: number) { const lines = [...(form.lines || [])]; lines.splice(i, 1); setForm({ ...form, lines }); }
  const td = (form.lines || []).reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tc = (form.lines || []).reduce((s, l) => s + (Number(l.credit) || 0), 0);
  async function submit() {
    setBusy(true); setErr("");
    const method = initial ? "PATCH" : "POST";
    const payload: Record<string, unknown> = { ...form, recordKind: "journal" };
    if (initial) payload.id = initial.id;
    const res = await fetch("/api/hospital/gl", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setErr(data.error || "save_failed"); setBusy(false); return; }
    onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-6">
      <div className="my-8 w-full max-w-4xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{initial ? "Edit journal" : "New journal entry"}</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Entry date *"><input type="date" className="inp" value={(form.entryDate || "").slice(0, 10)} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} /></Field>
          <Field label="Reference"><input className="inp" value={form.reference || ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
          <Field label="Status"><select className="inp" value={form.status || "draft"} onChange={(e) => setForm({ ...form, status: e.target.value as JournalStatus })}>{STATUSES.map((s) => <option key={s} value={s}>{JOURNAL_STATUS_LABEL[s]}</option>)}</select></Field>
          <Field label="Narration *" full><input className="inp" value={form.narration || ""} onChange={(e) => setForm({ ...form, narration: e.target.value })} /></Field>
        </div>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Lines</div>
            <button onClick={addLine} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold">+ Line</button>
          </div>
          {(form.lines || []).map((l, i) => (
            <div key={l.id} className="mb-2 grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50 p-2 md:grid-cols-12">
              <select className="inp md:col-span-4" value={l.accountCode} onChange={(e) => updLine(i, { accountCode: e.target.value })}>
                <option value="">-- Account --</option>
                {accounts.filter((a) => a.active).map((a) => <option key={a.id} value={a.code}>{a.code} · {a.name}</option>)}
              </select>
              <input type="number" step="0.01" className="inp md:col-span-2" placeholder="Debit" value={l.debit} onChange={(e) => updLine(i, { debit: Number(e.target.value) || 0, credit: 0 })} />
              <input type="number" step="0.01" className="inp md:col-span-2" placeholder="Credit" value={l.credit} onChange={(e) => updLine(i, { credit: Number(e.target.value) || 0, debit: 0 })} />
              <input className="inp md:col-span-2" placeholder="Memo" value={l.memo || ""} onChange={(e) => updLine(i, { memo: e.target.value })} />
              <input className="inp md:col-span-1" placeholder="CC" value={l.costCenter || ""} onChange={(e) => updLine(i, { costCenter: e.target.value })} />
              <button onClick={() => rmLine(i)} className="rounded-lg bg-rose-50 px-2 text-xs font-semibold text-rose-700 md:col-span-1">×</button>
            </div>
          ))}
          <div className="mt-2 flex justify-end gap-6 text-xs font-semibold">
            <div>Debit: {td.toFixed(2)}</div>
            <div>Credit: {tc.toFixed(2)}</div>
            <div className={Math.abs(td - tc) < 0.01 ? "text-emerald-700" : "text-rose-700"}>Δ {(td - tc).toFixed(2)}</div>
          </div>
        </div>
        {err && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</div>}
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
          <button onClick={submit} disabled={busy} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving..." : "Save"}</button>
        </div>
      </div>
      <style jsx>{`.inp { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0.5rem 0.75rem; font-size: 0.875rem; }`}</style>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "slate" | "amber" | "rose" | "emerald" | "indigo" }) {
  const t: Record<string, string> = { slate: "bg-slate-50 text-slate-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700" };
  return <div className={`rounded-xl p-4 ${t[tone]}`}><div className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`rounded-lg px-4 py-2 text-sm font-semibold ${active ? "bg-primary-600 text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>{children}</button>; }
function Pill({ status, children }: { status: string; children: React.ReactNode }) {
  const map: Record<string, string> = { asset: "bg-emerald-100 text-emerald-700", liability: "bg-rose-100 text-rose-700", equity: "bg-indigo-100 text-indigo-700", income: "bg-emerald-100 text-emerald-700", expense: "bg-amber-100 text-amber-700", draft: "bg-slate-100 text-slate-700", posted: "bg-emerald-100 text-emerald-700", reversed: "bg-rose-100 text-rose-700" };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${map[status] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) { return <label className={`block ${full ? "md:col-span-3" : ""}`}><div className="mb-1 text-xs font-semibold text-slate-600">{label}</div>{children}</label>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="p-8 text-center text-sm text-slate-500">{children}</div>; }
