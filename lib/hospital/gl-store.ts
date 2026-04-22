// General Ledger: Chart of Accounts + Journal Entries. Tenant-scoped.
import { bindPersistentArray } from "../persistent-array";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";
export type JournalStatus = "draft" | "posted" | "reversed";

export interface Account {
  id: string; organizationId: string;
  code: string; name: string;
  accountType: AccountType;
  parentCode?: string;
  active: boolean;
  description?: string;
  createdAt: string; updatedAt: string;
}

export interface JournalLine {
  id: string;
  accountCode: string;
  accountName?: string;
  debit: number;
  credit: number;
  memo?: string;
  costCenter?: string;
}

export interface JournalEntry {
  id: string; organizationId: string;
  entryDate: string;
  reference?: string;
  narration: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  status: JournalStatus;
  postedBy?: string;
  postedAt?: string;
  reversedById?: string;
  sourceModule?: string;
  createdAt: string; updatedAt: string;
}

const accounts: Account[] = [];
const journals: JournalEntry[] = [];
const hA = bindPersistentArray<Account>("gl-accounts", accounts, () => []);
const hJ = bindPersistentArray<JournalEntry>("gl-journals", journals, () => []);
await hA; await hJ;

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  asset: "Asset", liability: "Liability", equity: "Equity", income: "Income", expense: "Expense",
};
export const JOURNAL_STATUS_LABEL: Record<JournalStatus, string> = {
  draft: "Draft", posted: "Posted", reversed: "Reversed",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

export function listAccounts(opts: { organizationId: string; accountType?: AccountType; active?: boolean }): Account[] {
  return accounts.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.accountType ? r.accountType === opts.accountType : true))
    .filter((r) => (opts.active === undefined ? true : r.active === opts.active))
    .sort((a, b) => a.code.localeCompare(b.code));
}
export function createAccount(orgId: string, input: Partial<Account>): { ok: true; record: Account } | { ok: false; error: string } {
  if (!input.code || !input.name || !input.accountType) return { ok: false, error: "missing_required" };
  if (accounts.some((a) => a.organizationId === orgId && a.code === input.code)) return { ok: false, error: "duplicate_code" };
  const now = new Date().toISOString();
  const r: Account = {
    id: nextId("ACC", accounts, orgId), organizationId: orgId,
    code: input.code, name: input.name,
    accountType: input.accountType as AccountType,
    parentCode: input.parentCode,
    active: input.active ?? true,
    description: input.description,
    createdAt: now, updatedAt: now,
  };
  accounts.push(r); return { ok: true, record: r };
}
export function updateAccount(id: string, orgId: string, patch: Partial<Account>): Account | null {
  const i = accounts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  accounts.splice(i, 1, { ...accounts[i], ...patch, id: accounts[i].id, organizationId: accounts[i].organizationId, updatedAt: new Date().toISOString() });
  return accounts[i];
}
export function deleteAccount(id: string, orgId: string): boolean {
  const i = accounts.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  accounts.splice(i, 1); return true;
}

export function listJournals(opts: { organizationId: string; status?: JournalStatus; from?: string; to?: string }): JournalEntry[] {
  return journals.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.from ? r.entryDate >= opts.from : true))
    .filter((r) => (opts.to ? r.entryDate <= opts.to : true))
    .sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}
export function createJournal(orgId: string, input: Partial<JournalEntry>): { ok: true; record: JournalEntry } | { ok: false; error: string } {
  if (!input.entryDate || !input.narration || !input.lines || input.lines.length < 2) return { ok: false, error: "missing_required" };
  const lines: JournalLine[] = input.lines.map((l, idx) => {
    const acc = accounts.find((a) => a.organizationId === orgId && a.code === l.accountCode);
    return { id: l.id || `ln-${Date.now()}-${idx}`, accountCode: l.accountCode, accountName: acc?.name, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo, costCenter: l.costCenter };
  });
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) return { ok: false, error: "unbalanced" };
  const now = new Date().toISOString();
  const r: JournalEntry = {
    id: nextId("JRN", journals, orgId), organizationId: orgId,
    entryDate: input.entryDate, reference: input.reference, narration: input.narration,
    lines, totalDebit, totalCredit,
    status: (input.status || "draft") as JournalStatus,
    postedBy: input.postedBy, postedAt: input.postedAt,
    sourceModule: input.sourceModule,
    createdAt: now, updatedAt: now,
  };
  journals.push(r); return { ok: true, record: r };
}
export function updateJournal(id: string, orgId: string, patch: Partial<JournalEntry>): JournalEntry | null {
  const i = journals.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = journals[i];
  const next = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  if (patch.lines) {
    next.lines = patch.lines.map((l, idx) => {
      const acc = accounts.find((a) => a.organizationId === orgId && a.code === l.accountCode);
      return { id: l.id || `ln-${Date.now()}-${idx}`, accountCode: l.accountCode, accountName: acc?.name, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo, costCenter: l.costCenter };
    });
    next.totalDebit = next.lines.reduce((s, l) => s + l.debit, 0);
    next.totalCredit = next.lines.reduce((s, l) => s + l.credit, 0);
  }
  journals[i] = next; return next;
}
export function deleteJournal(id: string, orgId: string): boolean {
  const i = journals.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  journals.splice(i, 1); return true;
}

export function computeStats(orgId: string) {
  const myA = accounts.filter((r) => r.organizationId === orgId);
  const myJ = journals.filter((r) => r.organizationId === orgId);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const posted = myJ.filter((j) => j.status === "posted");
  const balances: Record<AccountType, number> = { asset: 0, liability: 0, equity: 0, income: 0, expense: 0 };
  for (const j of posted) {
    for (const l of j.lines) {
      const acc = myA.find((a) => a.code === l.accountCode);
      if (!acc) continue;
      const sign = (acc.accountType === "asset" || acc.accountType === "expense") ? 1 : -1;
      balances[acc.accountType] += sign * (l.debit - l.credit);
    }
  }
  return {
    accountsActive: myA.filter((a) => a.active).length,
    drafts: myJ.filter((j) => j.status === "draft").length,
    postedMonth: myJ.filter((j) => j.status === "posted" && j.entryDate >= monthStart).length,
    debitMonth: Math.round(myJ.filter((j) => j.entryDate >= monthStart).reduce((s, j) => s + j.totalDebit, 0)),
    balanceAsset: Math.round(balances.asset),
    balanceLiability: Math.round(balances.liability),
    balanceIncome: Math.round(balances.income),
    balanceExpense: Math.round(balances.expense),
  };
}
