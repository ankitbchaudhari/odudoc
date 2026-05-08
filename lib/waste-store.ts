// Biomedical waste log.
//
// Tracks every disposal action against BMW-2016 (India) / OSHA / EU
// waste-bag colour codes so the clinic can produce a monthly compliance
// report and an audit trail of who handed what to which collector.
//
// One row = one bag handed to a disposal vendor (or one batch of
// sharps containers). Weight is in grams, captured at hand-off.

import { bindPersistentArray } from "./persistent-array";

export type WasteCategory =
  /** Anatomical, soiled, infectious — autoclave/incinerate */
  | "yellow"
  /** Contaminated plastics, IV tubing, gloves — autoclave + shred */
  | "red"
  /** Glass + metal sharps (broken vials etc.) — secured + disinfected */
  | "blue"
  /** Sharps (needles, blades) in puncture-proof container */
  | "white"
  /** General municipal (food wrappers, paper) — non-biomedical */
  | "black";

export interface WasteLogEntry {
  id: string;
  /** Clinic owner email — same scoping as emr-store. */
  doctorEmail: string;
  category: WasteCategory;
  /** Free-form source (e.g. "OPD-2", "Pathology lab", "OR-1"). */
  sourceDept: string;
  /** Weight in grams at hand-off. */
  weightGrams: number;
  /** Number of bags / containers in this batch. */
  bagCount: number;
  /** Disposal vendor / collector identity. */
  vendorName?: string;
  /** Manifest / consignment / transport note number (regulatory). */
  manifestNo?: string;
  /** Staff member who logged the entry. */
  loggedBy: string;
  /** Free-form notes — incidents, special handling, witness names. */
  notes?: string;
  /** ISO timestamp of when the bag was sealed and handed over. */
  disposedAt: string;
  createdAt: string;
}

const wasteLog: WasteLogEntry[] = [];
const {
  hydrate: hydrateWaste,
  reload: reloadWasteInternal,
  flush: flushWaste,
} = bindPersistentArray<WasteLogEntry>("emr-waste-log", wasteLog, () => []);

await hydrateWaste();

export async function reloadWaste() { await reloadWasteInternal(); }

function nowIso() { return new Date().toISOString(); }

function id() {
  return `wst-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface CreateWasteEntryInput {
  doctorEmail: string;
  category: WasteCategory;
  sourceDept: string;
  weightGrams: number;
  bagCount?: number;
  vendorName?: string;
  manifestNo?: string;
  loggedBy: string;
  notes?: string;
  disposedAt?: string;
}

export async function createWasteEntry(input: CreateWasteEntryInput): Promise<WasteLogEntry> {
  const row: WasteLogEntry = {
    id: id(),
    doctorEmail: input.doctorEmail.toLowerCase(),
    category: input.category,
    sourceDept: input.sourceDept,
    weightGrams: Math.max(0, input.weightGrams),
    bagCount: Math.max(1, input.bagCount || 1),
    vendorName: input.vendorName,
    manifestNo: input.manifestNo,
    loggedBy: input.loggedBy.toLowerCase(),
    notes: input.notes,
    disposedAt: input.disposedAt || nowIso(),
    createdAt: nowIso(),
  };
  wasteLog.push(row);
  flushWaste();
  return row;
}

export interface ListWasteOptions {
  doctorEmail: string;
  category?: WasteCategory | "All";
  /** YYYY-MM month filter for compliance reporting. */
  month?: string;
}

export async function listWaste(opts: ListWasteOptions): Promise<WasteLogEntry[]> {
  await hydrateWaste();
  const e = opts.doctorEmail.toLowerCase();
  let list = wasteLog.filter((w) => w.doctorEmail === e);
  if (opts.category && opts.category !== "All") {
    list = list.filter((w) => w.category === opts.category);
  }
  if (opts.month) {
    list = list.filter((w) => w.disposedAt.slice(0, 7) === opts.month);
  }
  list.sort((a, b) => b.disposedAt.localeCompare(a.disposedAt));
  return list;
}

/** Aggregate totals for the BMW compliance card on /dashboard/biomedical. */
export interface WasteSummary {
  month: string;
  totals: Record<WasteCategory, { weightGrams: number; bagCount: number }>;
  totalWeightGrams: number;
  totalBags: number;
  byDept: Record<string, number>; // weight grams per dept
}

export async function summariseWaste(
  doctorEmail: string,
  month: string,
): Promise<WasteSummary> {
  const list = await listWaste({ doctorEmail, month });
  const totals: WasteSummary["totals"] = {
    yellow: { weightGrams: 0, bagCount: 0 },
    red:    { weightGrams: 0, bagCount: 0 },
    blue:   { weightGrams: 0, bagCount: 0 },
    white:  { weightGrams: 0, bagCount: 0 },
    black:  { weightGrams: 0, bagCount: 0 },
  };
  const byDept: Record<string, number> = {};
  let totalWeightGrams = 0;
  let totalBags = 0;
  for (const w of list) {
    totals[w.category].weightGrams += w.weightGrams;
    totals[w.category].bagCount += w.bagCount;
    totalWeightGrams += w.weightGrams;
    totalBags += w.bagCount;
    byDept[w.sourceDept] = (byDept[w.sourceDept] || 0) + w.weightGrams;
  }
  return { month, totals, totalWeightGrams, totalBags, byDept };
}
