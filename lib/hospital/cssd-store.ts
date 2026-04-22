// CSSD — Central Sterile Supply Department. Tenant-scoped.
//
// NABH "HIC" (Hospital Infection Control) domain: catalogs reusable
// instrument sets and records each sterilization cycle (load) they pass
// through. A batch binds method + cycle parameters + biological/chemical
// indicator results + the list of sets/items processed.
//
// Two entities:
//   InstrumentSet  — reusable catalog (set contents, owning department)
//   SterilizationBatch — one load cycle, references sets by id
//
// Batch status machine:
//   loaded → sterilizing → sterilized → issued ↘
//                               ↘ failed  ↘ recalled
//
// If the biological indicator reads "fail", sets must be considered
// un-sterile and any downstream issue is flagged for recall.

import { bindPersistentArray } from "../persistent-array";

export type Method = "steam" | "ethylene_oxide" | "plasma" | "dry_heat" | "chemical";

export type SetStatus = "active" | "retired";

export type BatchStatus =
  | "loaded"
  | "sterilizing"
  | "sterilized"
  | "issued"
  | "failed"
  | "recalled";

export type IndicatorResult = "pass" | "fail" | "pending";

export interface InstrumentSet {
  id: string;
  organizationId: string;
  setCode: string; // SET-{suffix}-{seq}
  name: string;
  department: string; // "OT-1", "Endoscopy", "Labor Room"
  itemCount: number;
  description?: string;
  status: SetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BatchItem {
  setId: string;
  // snapshot at load time, so renaming the set doesn't rewrite history
  setCode: string;
  setName: string;
  issued?: boolean;
  issuedTo?: string;
  issuedAt?: string;
}

export interface SterilizationBatch {
  id: string;
  organizationId: string;
  loadNumber: string; // LOAD-{suffix}-{seq}
  method: Method;
  machineId?: string; // autoclave tag, e.g. BIO-...
  operator: string;

  // Cycle parameters
  temperatureC?: number;
  pressureKpa?: number;
  exposureMin?: number;

  // Indicators
  chemicalIndicator: IndicatorResult;
  biologicalIndicator: IndicatorResult;
  biologicalReadAt?: string; // BI reads take ~24h

  // Expiry — sterile shelf life, e.g. 30d for pouches
  validDays: number;
  expiresAt?: string;

  items: BatchItem[];
  status: BatchStatus;

  startedAt: string;
  completedAt?: string;
  failedReason?: string;
  recalledAt?: string;
  recalledReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const sets: InstrumentSet[] = [];
const batches: SterilizationBatch[] = [];

const { hydrate: hydrateS, flush: flushS } = bindPersistentArray<InstrumentSet>(
  "hospital-cssd-sets",
  sets,
  () => []
);
const { hydrate: hydrateB, flush: flushB } = bindPersistentArray<SterilizationBatch>(
  "hospital-cssd-batches",
  batches,
  () => []
);
await hydrateS();
await hydrateB();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextSetCode(orgId: string): string {
  const n = sets.filter((s) => s.organizationId === orgId).length + 1;
  return `SET-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}
function nextLoadNumber(orgId: string): string {
  const n = batches.filter((b) => b.organizationId === orgId).length + 1;
  return `LOAD-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

export const METHOD_LABEL: Record<Method, string> = {
  steam: "Steam / Autoclave",
  ethylene_oxide: "Ethylene Oxide (ETO)",
  plasma: "Hydrogen Peroxide Plasma",
  dry_heat: "Dry Heat",
  chemical: "Chemical",
};

export const BATCH_STATUS_LABEL: Record<BatchStatus, string> = {
  loaded: "Loaded",
  sterilizing: "Sterilizing",
  sterilized: "Sterilized",
  issued: "Issued",
  failed: "Failed",
  recalled: "Recalled",
};

// Sets ---------------------------------------------------------------

export function listSets(opts: {
  organizationId: string;
  status?: SetStatus;
  department?: string;
  search?: string;
}): InstrumentSet[] {
  let list = sets.filter((s) => s.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((s) => s.status === opts.status);
  if (opts.department)
    list = list.filter((s) =>
      s.department.toLowerCase().includes(opts.department!.toLowerCase())
    );
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.setCode.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => a.setCode.localeCompare(b.setCode));
}

export interface SetInput {
  name: string;
  department?: string;
  itemCount?: number;
  description?: string;
  status?: SetStatus;
}

export function createSet(organizationId: string, input: SetInput): InstrumentSet {
  const now = new Date().toISOString();
  const s: InstrumentSet = {
    id: `cset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    setCode: nextSetCode(organizationId),
    name: input.name.trim(),
    department: input.department?.trim() || "",
    itemCount: Math.max(0, Math.round(input.itemCount ?? 0)),
    description: input.description?.trim() || undefined,
    status: input.status || "active",
    createdAt: now,
    updatedAt: now,
  };
  sets.unshift(s);
  flushS();
  return s;
}

export function updateSet(
  id: string,
  organizationId: string,
  patch: Partial<SetInput>
): InstrumentSet | null {
  const s = sets.find((x) => x.id === id && x.organizationId === organizationId);
  if (!s) return null;
  if (patch.name !== undefined) s.name = patch.name.trim();
  if (patch.department !== undefined) s.department = patch.department.trim();
  if (patch.itemCount !== undefined)
    s.itemCount = Math.max(0, Math.round(patch.itemCount));
  if (patch.description !== undefined)
    s.description = patch.description?.trim() || undefined;
  if (patch.status !== undefined) s.status = patch.status;
  s.updatedAt = new Date().toISOString();
  flushS();
  return s;
}

export function deleteSet(id: string, organizationId: string): boolean {
  const idx = sets.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  sets.splice(idx, 1);
  flushS();
  return true;
}

// Batches ------------------------------------------------------------

function computeExpiry(completedAt: string | undefined, validDays: number): string | undefined {
  if (!completedAt || !validDays) return undefined;
  return new Date(new Date(completedAt).getTime() + validDays * 86400000).toISOString();
}

export function listBatches(opts: {
  organizationId: string;
  status?: BatchStatus;
  method?: Method;
}): SterilizationBatch[] {
  let list = batches.filter((b) => b.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((b) => b.status === opts.status);
  if (opts.method) list = list.filter((b) => b.method === opts.method);
  const statusOrder: Record<BatchStatus, number> = {
    failed: 0,
    recalled: 1,
    sterilizing: 2,
    loaded: 3,
    sterilized: 4,
    issued: 5,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
  });
}

export interface BatchInput {
  method?: Method;
  machineId?: string;
  operator?: string;
  temperatureC?: number;
  pressureKpa?: number;
  exposureMin?: number;
  chemicalIndicator?: IndicatorResult;
  biologicalIndicator?: IndicatorResult;
  biologicalReadAt?: string;
  validDays?: number;
  items?: Array<{ setId: string }>;
  status?: BatchStatus;
  startedAt?: string;
  completedAt?: string;
  failedReason?: string;
  recalledReason?: string;
  notes?: string;
}

function hydrateItems(
  organizationId: string,
  rawItems: Array<{ setId: string }> | undefined
): BatchItem[] {
  if (!rawItems || !Array.isArray(rawItems)) return [];
  const out: BatchItem[] = [];
  for (const r of rawItems) {
    if (!r?.setId) continue;
    const s = sets.find((x) => x.id === r.setId && x.organizationId === organizationId);
    if (!s) continue;
    if (out.some((o) => o.setId === r.setId)) continue;
    out.push({ setId: s.id, setCode: s.setCode, setName: s.name });
  }
  return out;
}

export function createBatch(
  organizationId: string,
  input: BatchInput
): SterilizationBatch {
  const now = new Date().toISOString();
  const validDays = Math.max(0, Math.round(input.validDays ?? 30));
  const status = input.status || "loaded";
  const completedAt = status === "sterilized" || status === "issued" ? (input.completedAt || now) : input.completedAt;
  const b: SterilizationBatch = {
    id: `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    loadNumber: nextLoadNumber(organizationId),
    method: input.method || "steam",
    machineId: input.machineId?.trim() || undefined,
    operator: input.operator?.trim() || "",
    temperatureC: input.temperatureC ?? undefined,
    pressureKpa: input.pressureKpa ?? undefined,
    exposureMin: input.exposureMin ?? undefined,
    chemicalIndicator: input.chemicalIndicator || "pending",
    biologicalIndicator: input.biologicalIndicator || "pending",
    biologicalReadAt: input.biologicalReadAt || undefined,
    validDays,
    expiresAt: computeExpiry(completedAt, validDays),
    items: hydrateItems(organizationId, input.items),
    status,
    startedAt: input.startedAt || now,
    completedAt,
    failedReason: input.failedReason?.trim() || undefined,
    recalledReason: input.recalledReason?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  batches.unshift(b);
  flushB();
  return b;
}

export function updateBatch(
  id: string,
  organizationId: string,
  patch: Partial<BatchInput>
): SterilizationBatch | null {
  const b = batches.find((x) => x.id === id && x.organizationId === organizationId);
  if (!b) return null;
  const now = new Date().toISOString();

  if (patch.method !== undefined) b.method = patch.method;
  if (patch.machineId !== undefined) b.machineId = patch.machineId?.trim() || undefined;
  if (patch.operator !== undefined) b.operator = patch.operator.trim();
  if (patch.temperatureC !== undefined) b.temperatureC = patch.temperatureC ?? undefined;
  if (patch.pressureKpa !== undefined) b.pressureKpa = patch.pressureKpa ?? undefined;
  if (patch.exposureMin !== undefined) b.exposureMin = patch.exposureMin ?? undefined;
  if (patch.chemicalIndicator !== undefined) b.chemicalIndicator = patch.chemicalIndicator;
  if (patch.biologicalIndicator !== undefined) {
    b.biologicalIndicator = patch.biologicalIndicator;
    if (patch.biologicalIndicator === "pass" || patch.biologicalIndicator === "fail") {
      b.biologicalReadAt = patch.biologicalReadAt || now;
    }
    // Auto-fail the batch if BI reads fail.
    if (patch.biologicalIndicator === "fail" && b.status !== "recalled") {
      b.status = "failed";
      b.failedReason = b.failedReason || "Biological indicator failed";
    }
  }
  if (patch.biologicalReadAt !== undefined)
    b.biologicalReadAt = patch.biologicalReadAt || undefined;
  if (patch.validDays !== undefined)
    b.validDays = Math.max(0, Math.round(patch.validDays));
  if (patch.items !== undefined)
    b.items = hydrateItems(organizationId, patch.items);
  if (patch.startedAt !== undefined) b.startedAt = patch.startedAt || b.startedAt;
  if (patch.completedAt !== undefined) b.completedAt = patch.completedAt || undefined;
  if (patch.failedReason !== undefined)
    b.failedReason = patch.failedReason?.trim() || undefined;
  if (patch.recalledReason !== undefined)
    b.recalledReason = patch.recalledReason?.trim() || undefined;
  if (patch.notes !== undefined) b.notes = patch.notes?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== b.status) {
    const prev = b.status;
    b.status = patch.status;
    if (patch.status === "sterilized" && !b.completedAt) {
      b.completedAt = now;
    }
    if (patch.status === "recalled" && prev !== "recalled") {
      b.recalledAt = now;
    }
  }

  // Recompute expiry from completedAt + validDays.
  b.expiresAt = computeExpiry(b.completedAt, b.validDays);

  b.updatedAt = now;
  flushB();
  return b;
}

export function deleteBatch(id: string, organizationId: string): boolean {
  const idx = batches.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  batches.splice(idx, 1);
  flushB();
  return true;
}

export function issueItem(
  batchId: string,
  setId: string,
  issuedTo: string,
  organizationId: string
): SterilizationBatch | null {
  const b = batches.find((x) => x.id === batchId && x.organizationId === organizationId);
  if (!b) return null;
  if (b.status !== "sterilized" && b.status !== "issued") return null;
  const item = b.items.find((i) => i.setId === setId);
  if (!item) return null;
  const now = new Date().toISOString();
  item.issued = true;
  item.issuedTo = issuedTo.trim() || "—";
  item.issuedAt = now;
  // If every item is issued, flip batch to issued.
  if (b.items.length > 0 && b.items.every((i) => i.issued)) {
    b.status = "issued";
  }
  b.updatedAt = now;
  flushB();
  return b;
}
