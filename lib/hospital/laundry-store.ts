// Linen & Laundry. Tenant-scoped.
//
// Tracks the hospital's linen inventory (bedsheets, gowns, scrubs, etc.) and
// the laundry batches that move between the hospital and in-house or
// external laundry vendors. Reconciling a returned batch automatically
// adjusts the parent LinenItem counts, so shrinkage, damage, and stock
// levels stay in sync without a manual journal.
//
// Linen stock model (per LinenItem):
//   totalQty = inUse + inLaundry + inStock + condemnedQty
// Batch flow:
//   sent (stock→laundry) → processing → returned (laundry→stock; damaged→condemned; lost deducted from total)
//                                     → closed (signed off by supervisor)

import { bindPersistentArray } from "../persistent-array";

export type LinenType =
  | "bedsheet"
  | "pillowcase"
  | "blanket"
  | "gown"
  | "towel"
  | "curtain"
  | "scrubs"
  | "drape"
  | "mop"
  | "other";

export type BatchStatus = "sent" | "processing" | "returned" | "closed";

export interface LinenItem {
  id: string;
  organizationId: string;
  linenNumber: string; // LINEN-{suffix}-{seq}
  linenType: LinenType;
  size?: string; // "single", "L", "king"
  color?: string;
  totalQty: number;
  inUse: number;
  inLaundry: number;
  inStock: number;
  condemnedQty: number;
  reorderLevel: number;
  unitCost?: number;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BatchLine {
  linenId: string;
  linenType: LinenType;
  linenLabel: string; // denormalized name + size for quick display
  sentQty: number;
  returnedQty: number;
  damagedQty: number;
  lostQty: number;
}

export interface LaundryBatch {
  id: string;
  organizationId: string;
  batchNumber: string; // BATCH-{suffix}-{seq}
  vendorName: string;
  vendorType: "internal" | "external";
  sentAt: string;
  expectedReturnAt?: string;
  returnedAt?: string;
  closedAt?: string;
  status: BatchStatus;
  lines: BatchLine[];
  totalSent: number; // pre-computed sum
  totalReturned: number;
  totalDamaged: number;
  totalLost: number;
  cost?: number;
  notes?: string;
  reconciled: boolean; // true once return flow applied to LinenItem counts
  createdAt: string;
  updatedAt: string;
}

const linens: LinenItem[] = [];
const batches: LaundryBatch[] = [];

const linenBinding = bindPersistentArray<LinenItem>(
  "hospital-linen-items",
  linens,
  () => []
);
const batchBinding = bindPersistentArray<LaundryBatch>(
  "hospital-laundry-batches",
  batches,
  () => []
);
await linenBinding.hydrate();
await batchBinding.hydrate();

const flushLinens = linenBinding.flush;
const flushBatches = batchBinding.flush;

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextLinenNumber(orgId: string): string {
  const n = linens.filter((l) => l.organizationId === orgId).length + 1;
  return `LINEN-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}
function nextBatchNumber(orgId: string): string {
  const n = batches.filter((b) => b.organizationId === orgId).length + 1;
  return `BATCH-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const LINEN_LABEL: Record<LinenType, string> = {
  bedsheet: "Bedsheet",
  pillowcase: "Pillowcase",
  blanket: "Blanket",
  gown: "Patient gown",
  towel: "Towel",
  curtain: "Curtain",
  scrubs: "Scrubs",
  drape: "Surgical drape",
  mop: "Mop head",
  other: "Other",
};

function linenLabel(item: LinenItem): string {
  const parts = [LINEN_LABEL[item.linenType]];
  if (item.size) parts.push(item.size);
  if (item.color) parts.push(item.color);
  return parts.join(" / ");
}

// ---------- LinenItem ----------

export function listLinens(organizationId: string): LinenItem[] {
  return linens
    .filter((l) => l.organizationId === organizationId)
    .sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      const low = (x: LinenItem) =>
        x.active && x.inStock <= x.reorderLevel ? 0 : 1;
      const l = low(a) - low(b);
      if (l !== 0) return l;
      return a.linenType.localeCompare(b.linenType);
    });
}

export interface LinenInput {
  linenType?: LinenType;
  size?: string;
  color?: string;
  totalQty?: number;
  inStock?: number;
  reorderLevel?: number;
  unitCost?: number;
  notes?: string;
  active?: boolean;
}

export function createLinen(
  organizationId: string,
  input: LinenInput
): LinenItem {
  const now = new Date().toISOString();
  const total = Math.max(0, input.totalQty || 0);
  const stock = Math.max(0, Math.min(total, input.inStock ?? total));
  const l: LinenItem = {
    id: `lin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    linenNumber: nextLinenNumber(organizationId),
    linenType: input.linenType || "bedsheet",
    size: input.size?.trim() || undefined,
    color: input.color?.trim() || undefined,
    totalQty: total,
    inUse: 0,
    inLaundry: 0,
    inStock: stock,
    condemnedQty: 0,
    reorderLevel: Math.max(0, input.reorderLevel ?? 0),
    unitCost: input.unitCost !== undefined ? Math.max(0, input.unitCost) : undefined,
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  linens.unshift(l);
  flushLinens();
  return l;
}

export function updateLinen(
  id: string,
  organizationId: string,
  patch: Partial<LinenInput> & { inUse?: number }
): LinenItem | null {
  const l = linens.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!l) return null;
  const now = new Date().toISOString();
  if (patch.linenType !== undefined) l.linenType = patch.linenType;
  if (patch.size !== undefined) l.size = patch.size?.trim() || undefined;
  if (patch.color !== undefined) l.color = patch.color?.trim() || undefined;
  if (patch.reorderLevel !== undefined)
    l.reorderLevel = Math.max(0, patch.reorderLevel);
  if (patch.unitCost !== undefined)
    l.unitCost = Math.max(0, patch.unitCost);
  if (patch.notes !== undefined) l.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) l.active = patch.active;

  // Allow direct adjustment of totalQty (e.g. new procurement) — never drops
  // below already-distributed quantities.
  if (patch.totalQty !== undefined) {
    const minAllowed = l.inUse + l.inLaundry + l.condemnedQty;
    const target = Math.max(minAllowed, patch.totalQty);
    const diff = target - l.totalQty;
    l.totalQty = target;
    // New stock goes into inStock bucket.
    l.inStock = Math.max(0, l.inStock + diff);
  }
  if (patch.inStock !== undefined) {
    // Manual recount — adjust totalQty to keep identity totalQty = inUse+inLaundry+inStock+condemnedQty
    l.inStock = Math.max(0, patch.inStock);
    l.totalQty = l.inUse + l.inLaundry + l.inStock + l.condemnedQty;
  }
  if (patch.inUse !== undefined) {
    const target = Math.max(0, patch.inUse);
    const diff = target - l.inUse;
    // Draw from inStock when putting into use, return to inStock when pulling out.
    if (diff > 0) {
      const take = Math.min(diff, l.inStock);
      l.inStock -= take;
      l.inUse += take;
    } else if (diff < 0) {
      const give = Math.min(-diff, l.inUse);
      l.inUse -= give;
      l.inStock += give;
    }
  }
  l.updatedAt = now;
  flushLinens();
  return l;
}

export function deleteLinen(
  id: string,
  organizationId: string
): boolean {
  const idx = linens.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  // Refuse if any open batch references this linen.
  const inOpenBatch = batches.some(
    (b) =>
      b.organizationId === organizationId &&
      b.status !== "closed" &&
      b.lines.some((l) => l.linenId === id)
  );
  if (inOpenBatch) return false;
  linens.splice(idx, 1);
  flushLinens();
  return true;
}

// ---------- Batches ----------

export function listBatches(opts: {
  organizationId: string;
  status?: BatchStatus;
  from?: string;
  to?: string;
}): LaundryBatch[] {
  let list = batches.filter(
    (b) => b.organizationId === opts.organizationId
  );
  if (opts.status) list = list.filter((b) => b.status === opts.status);
  if (opts.from) {
    const f = new Date(opts.from).getTime();
    list = list.filter((b) => new Date(b.sentAt).getTime() >= f);
  }
  if (opts.to) {
    const t = new Date(opts.to).getTime();
    list = list.filter((b) => new Date(b.sentAt).getTime() <= t);
  }
  const statusOrder: Record<BatchStatus, number> = {
    sent: 0,
    processing: 1,
    returned: 2,
    closed: 3,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime();
  });
}

interface BatchLineInput {
  linenId: string;
  sentQty?: number;
  returnedQty?: number;
  damagedQty?: number;
  lostQty?: number;
}

export interface BatchInput {
  vendorName?: string;
  vendorType?: "internal" | "external";
  sentAt?: string;
  expectedReturnAt?: string;
  lines?: BatchLineInput[];
  cost?: number;
  notes?: string;
}

function buildLines(
  organizationId: string,
  inputLines: BatchLineInput[] | undefined
): BatchLine[] {
  if (!inputLines) return [];
  const out: BatchLine[] = [];
  for (const il of inputLines) {
    const item = linens.find(
      (l) => l.id === il.linenId && l.organizationId === organizationId
    );
    if (!item) continue;
    out.push({
      linenId: item.id,
      linenType: item.linenType,
      linenLabel: linenLabel(item),
      sentQty: Math.max(0, il.sentQty || 0),
      returnedQty: Math.max(0, il.returnedQty || 0),
      damagedQty: Math.max(0, il.damagedQty || 0),
      lostQty: Math.max(0, il.lostQty || 0),
    });
  }
  return out;
}

function totals(lines: BatchLine[]) {
  return {
    totalSent: lines.reduce((s, l) => s + l.sentQty, 0),
    totalReturned: lines.reduce((s, l) => s + l.returnedQty, 0),
    totalDamaged: lines.reduce((s, l) => s + l.damagedQty, 0),
    totalLost: lines.reduce((s, l) => s + l.lostQty, 0),
  };
}

// On SEND: decrement inStock, increment inLaundry.
function applySend(organizationId: string, lines: BatchLine[]): boolean {
  for (const l of lines) {
    const item = linens.find(
      (x) => x.id === l.linenId && x.organizationId === organizationId
    );
    if (!item) return false;
    if (item.inStock < l.sentQty) return false;
  }
  for (const l of lines) {
    const item = linens.find(
      (x) => x.id === l.linenId && x.organizationId === organizationId
    )!;
    item.inStock -= l.sentQty;
    item.inLaundry += l.sentQty;
    item.updatedAt = new Date().toISOString();
  }
  return true;
}

// On RECONCILE (batch marked returned): for each line:
//   inLaundry -= sentQty
//   inStock   += returnedQty - damagedQty (damaged physically returns but is condemned)
//   Actually: returnedQty includes damaged+good. We treat:
//       good = returnedQty - damagedQty
//       inStock    += good
//       condemnedQty += damagedQty
//       totalQty   -= lostQty
//   Any mismatch (sent != returned+lost) is preserved but inLaundry is
//   reduced by sentQty fully, and any shortfall between returnedQty+lostQty
//   and sentQty is treated as additional lost (safety net to avoid negative
//   inLaundry).
function applyReconcile(
  organizationId: string,
  lines: BatchLine[]
): void {
  for (const l of lines) {
    const item = linens.find(
      (x) => x.id === l.linenId && x.organizationId === organizationId
    );
    if (!item) continue;
    const good = Math.max(0, l.returnedQty - l.damagedQty);
    const accountedFor = l.returnedQty + l.lostQty;
    const shortfall = Math.max(0, l.sentQty - accountedFor); // unexplained = treat as additional loss
    const effectiveLost = l.lostQty + shortfall;

    item.inLaundry = Math.max(0, item.inLaundry - l.sentQty);
    item.inStock += good;
    item.condemnedQty += l.damagedQty;
    item.totalQty = Math.max(0, item.totalQty - effectiveLost);
    item.updatedAt = new Date().toISOString();
  }
}

export function createBatch(
  organizationId: string,
  input: BatchInput
):
  | { ok: false; error: string }
  | { ok: true; batch: LaundryBatch } {
  if (!input.vendorName || !input.vendorName.trim()) {
    return { ok: false, error: "missing_vendor" };
  }
  const lines = buildLines(organizationId, input.lines);
  if (lines.length === 0) return { ok: false, error: "no_lines" };

  // Apply send flow — must succeed for all lines before persisting
  if (!applySend(organizationId, lines)) {
    return { ok: false, error: "insufficient_stock" };
  }
  flushLinens();

  const now = new Date().toISOString();
  const t = totals(lines);
  const b: LaundryBatch = {
    id: `bat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    batchNumber: nextBatchNumber(organizationId),
    vendorName: input.vendorName.trim(),
    vendorType: input.vendorType || "external",
    sentAt: input.sentAt || now,
    expectedReturnAt: input.expectedReturnAt || undefined,
    status: "sent",
    lines,
    totalSent: t.totalSent,
    totalReturned: 0,
    totalDamaged: 0,
    totalLost: 0,
    cost: input.cost !== undefined ? Math.max(0, input.cost) : undefined,
    notes: input.notes?.trim() || undefined,
    reconciled: false,
    createdAt: now,
    updatedAt: now,
  };
  batches.unshift(b);
  flushBatches();
  return { ok: true, batch: b };
}

export interface BatchUpdateInput {
  status?: BatchStatus;
  vendorName?: string;
  expectedReturnAt?: string;
  lines?: BatchLineInput[]; // for entering return qtys
  cost?: number;
  notes?: string;
}

export function updateBatch(
  id: string,
  organizationId: string,
  patch: BatchUpdateInput
): LaundryBatch | null {
  const b = batches.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!b) return null;
  const now = new Date().toISOString();

  if (patch.vendorName !== undefined) b.vendorName = patch.vendorName.trim();
  if (patch.expectedReturnAt !== undefined)
    b.expectedReturnAt = patch.expectedReturnAt || undefined;
  if (patch.cost !== undefined) b.cost = Math.max(0, patch.cost);
  if (patch.notes !== undefined) b.notes = patch.notes?.trim() || undefined;

  // Line-level updates (return qtys, damaged, lost). Sent qty is immutable.
  if (patch.lines) {
    for (const inp of patch.lines) {
      const line = b.lines.find((l) => l.linenId === inp.linenId);
      if (!line) continue;
      if (inp.returnedQty !== undefined)
        line.returnedQty = Math.max(0, inp.returnedQty);
      if (inp.damagedQty !== undefined)
        line.damagedQty = Math.max(0, inp.damagedQty);
      if (inp.lostQty !== undefined)
        line.lostQty = Math.max(0, inp.lostQty);
    }
    const t = totals(b.lines);
    b.totalReturned = t.totalReturned;
    b.totalDamaged = t.totalDamaged;
    b.totalLost = t.totalLost;
  }

  if (patch.status !== undefined && patch.status !== b.status) {
    const prev = b.status;
    b.status = patch.status;
    if (patch.status === "returned" && prev !== "returned" && !b.reconciled) {
      applyReconcile(organizationId, b.lines);
      b.reconciled = true;
      b.returnedAt = now;
      flushLinens();
    }
    if (patch.status === "closed" && prev !== "closed") {
      b.closedAt = now;
    }
  }

  b.updatedAt = now;
  flushBatches();
  return b;
}

export function deleteBatch(
  id: string,
  organizationId: string
): boolean {
  const idx = batches.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (idx < 0) return false;
  const b = batches[idx];
  // If batch is still out (sent/processing), reverse the send flow so stock
  // counts don't leak. Once reconciled, deletion leaves counts as-is
  // (audit has already closed the loop).
  if (!b.reconciled) {
    for (const l of b.lines) {
      const item = linens.find(
        (x) => x.id === l.linenId && x.organizationId === organizationId
      );
      if (item) {
        item.inLaundry = Math.max(0, item.inLaundry - l.sentQty);
        item.inStock += l.sentQty;
        item.updatedAt = new Date().toISOString();
      }
    }
    flushLinens();
  }
  batches.splice(idx, 1);
  flushBatches();
  return true;
}

// ---------- Stats ----------

export interface LaundryStats {
  totalLinenValue: number; // sum of totalQty * unitCost across active items
  itemsLowStock: number; // inStock <= reorderLevel
  batchesInTransit: number; // sent / processing
  overdueBatches: number; // sent/processing with expectedReturnAt < now
  damagedThisMonth: number;
  lostThisMonth: number;
}

export function computeStats(organizationId: string): LaundryStats {
  const now = Date.now();
  const thisMonth = new Date();
  thisMonth.setDate(1);
  thisMonth.setHours(0, 0, 0, 0);
  const monthStart = thisMonth.getTime();

  const orgLinens = linens.filter(
    (l) => l.organizationId === organizationId && l.active
  );
  const orgBatches = batches.filter((b) => b.organizationId === organizationId);

  const totalLinenValue = orgLinens.reduce(
    (s, l) => s + (l.unitCost || 0) * l.totalQty,
    0
  );
  const itemsLowStock = orgLinens.filter(
    (l) => l.inStock <= l.reorderLevel
  ).length;
  const batchesInTransit = orgBatches.filter(
    (b) => b.status === "sent" || b.status === "processing"
  ).length;
  const overdueBatches = orgBatches.filter(
    (b) =>
      (b.status === "sent" || b.status === "processing") &&
      b.expectedReturnAt &&
      new Date(b.expectedReturnAt).getTime() < now
  ).length;
  const damagedThisMonth = orgBatches
    .filter(
      (b) => b.reconciled && b.returnedAt && new Date(b.returnedAt).getTime() >= monthStart
    )
    .reduce((s, b) => s + b.totalDamaged, 0);
  const lostThisMonth = orgBatches
    .filter(
      (b) => b.reconciled && b.returnedAt && new Date(b.returnedAt).getTime() >= monthStart
    )
    .reduce((s, b) => s + b.totalLost, 0);

  return {
    totalLinenValue: Math.round(totalLinenValue * 100) / 100,
    itemsLowStock,
    batchesInTransit,
    overdueBatches,
    damagedThisMonth,
    lostThisMonth,
  };
}
