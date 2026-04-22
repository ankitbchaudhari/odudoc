// Biomedical Equipment Register. Tenant-scoped.
//
// NABH "HIC" / "FMS" domain: asset lifecycle + planned preventive maintenance
// (PPM) + breakdown maintenance log. Each asset gets a unique tag number,
// tracks AMC/CMC contracts, calibration dates, and a scheduled PPM cadence.
//
// Sub-record: MaintenanceLog — PPM, breakdown, calibration, and condemnation
// events. Logging a completed PPM auto-stamps the asset's lastPpmAt and
// recomputes nextPpmDueAt from the ppmIntervalDays cadence.

import { bindPersistentArray } from "../persistent-array";

export type AssetCategory =
  | "imaging"
  | "ventilator"
  | "monitor"
  | "infusion_pump"
  | "defibrillator"
  | "anesthesia"
  | "dialysis"
  | "laboratory"
  | "surgical"
  | "dental"
  | "icu"
  | "other";

export type AssetStatus =
  | "active"
  | "under_maintenance"
  | "under_repair"
  | "standby"
  | "retired"
  | "condemned";

export type AssetRiskClass = "A" | "B" | "C" | "D"; // A = life-support, D = non-critical

export interface BiomedicalAsset {
  id: string;
  organizationId: string;
  assetTag: string; // BIO-{suffix}-{seq}
  name: string;
  category: AssetCategory;
  riskClass: AssetRiskClass;

  manufacturer?: string;
  model?: string;
  serialNumber?: string;

  location: string; // "ICU-2", "OT-1", "Radiology"
  custodian?: string; // responsible dept/person

  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiresAt?: string;

  // Annual / Comprehensive Maintenance Contract
  amcVendor?: string;
  amcStartAt?: string;
  amcExpiresAt?: string;
  amcType?: "AMC" | "CMC" | "none";

  // Calibration
  lastCalibrationAt?: string;
  nextCalibrationDueAt?: string;

  // PPM cadence
  ppmIntervalDays: number; // 0 = no scheduled PPM
  lastPpmAt?: string;
  nextPpmDueAt?: string;

  status: AssetStatus;
  retiredAt?: string;
  retiredReason?: string;

  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type LogType =
  | "ppm"
  | "breakdown"
  | "repair"
  | "calibration"
  | "inspection"
  | "relocation"
  | "condemnation";

export interface MaintenanceLog {
  id: string;
  organizationId: string;
  assetId: string;
  type: LogType;
  performedAt: string;
  performedBy: string;
  vendor?: string;
  description: string;
  partsReplaced?: string;
  cost?: number;
  downtimeHours?: number;
  nextDueAt?: string; // for calibration / inspection cycles
  notes?: string;
  createdAt: string;
}

const assets: BiomedicalAsset[] = [];
const logs: MaintenanceLog[] = [];

const { hydrate: hydrateA, flush: flushA } = bindPersistentArray<BiomedicalAsset>(
  "hospital-biomedical-assets",
  assets,
  () => []
);
const { hydrate: hydrateL, flush: flushL } = bindPersistentArray<MaintenanceLog>(
  "hospital-biomedical-logs",
  logs,
  () => []
);
await hydrateA();
await hydrateL();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextAssetTag(orgId: string): string {
  const n = assets.filter((a) => a.organizationId === orgId).length + 1;
  return `BIO-${orgSuffix(orgId)}-${String(n).padStart(4, "0")}`;
}

export const CATEGORY_LABEL: Record<AssetCategory, string> = {
  imaging: "Imaging",
  ventilator: "Ventilator",
  monitor: "Patient Monitor",
  infusion_pump: "Infusion Pump",
  defibrillator: "Defibrillator",
  anesthesia: "Anesthesia",
  dialysis: "Dialysis",
  laboratory: "Laboratory",
  surgical: "Surgical",
  dental: "Dental",
  icu: "ICU Equipment",
  other: "Other",
};

export const STATUS_LABEL: Record<AssetStatus, string> = {
  active: "Active",
  under_maintenance: "Under Maintenance",
  under_repair: "Under Repair",
  standby: "Standby",
  retired: "Retired",
  condemned: "Condemned",
};

export const LOG_TYPE_LABEL: Record<LogType, string> = {
  ppm: "PPM",
  breakdown: "Breakdown",
  repair: "Repair",
  calibration: "Calibration",
  inspection: "Inspection",
  relocation: "Relocation",
  condemnation: "Condemnation",
};

function computeNextPpm(lastPpmAt: string | undefined, intervalDays: number): string | undefined {
  if (!lastPpmAt || !intervalDays) return undefined;
  const t = new Date(lastPpmAt).getTime() + intervalDays * 86400000;
  return new Date(t).toISOString();
}

export function listAssets(opts: {
  organizationId: string;
  category?: AssetCategory;
  status?: AssetStatus;
  location?: string;
  search?: string;
}): BiomedicalAsset[] {
  let list = assets.filter((a) => a.organizationId === opts.organizationId);
  if (opts.category) list = list.filter((a) => a.category === opts.category);
  if (opts.status) list = list.filter((a) => a.status === opts.status);
  if (opts.location)
    list = list.filter((a) =>
      a.location.toLowerCase().includes(opts.location!.toLowerCase())
    );
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.assetTag.toLowerCase().includes(q) ||
        a.serialNumber?.toLowerCase().includes(q) ||
        a.manufacturer?.toLowerCase().includes(q)
    );
  }
  const statusOrder: Record<AssetStatus, number> = {
    under_repair: 0,
    under_maintenance: 1,
    active: 2,
    standby: 3,
    retired: 4,
    condemned: 5,
  };
  return list.sort((a, b) => {
    const s = statusOrder[a.status] - statusOrder[b.status];
    if (s !== 0) return s;
    return a.assetTag.localeCompare(b.assetTag);
  });
}

export interface AssetInput {
  name: string;
  category?: AssetCategory;
  riskClass?: AssetRiskClass;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  custodian?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  warrantyExpiresAt?: string;
  amcVendor?: string;
  amcStartAt?: string;
  amcExpiresAt?: string;
  amcType?: "AMC" | "CMC" | "none";
  lastCalibrationAt?: string;
  nextCalibrationDueAt?: string;
  ppmIntervalDays?: number;
  lastPpmAt?: string;
  status?: AssetStatus;
  retiredReason?: string;
  notes?: string;
}

export function createAsset(organizationId: string, input: AssetInput): BiomedicalAsset {
  const now = new Date().toISOString();
  const ppmIntervalDays = Math.max(0, Math.round(input.ppmIntervalDays ?? 180));
  const a: BiomedicalAsset = {
    id: `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    assetTag: nextAssetTag(organizationId),
    name: input.name.trim(),
    category: input.category || "other",
    riskClass: input.riskClass || "C",
    manufacturer: input.manufacturer?.trim() || undefined,
    model: input.model?.trim() || undefined,
    serialNumber: input.serialNumber?.trim() || undefined,
    location: input.location?.trim() || "",
    custodian: input.custodian?.trim() || undefined,
    purchaseDate: input.purchaseDate || undefined,
    purchasePrice: input.purchasePrice ?? undefined,
    warrantyExpiresAt: input.warrantyExpiresAt || undefined,
    amcVendor: input.amcVendor?.trim() || undefined,
    amcStartAt: input.amcStartAt || undefined,
    amcExpiresAt: input.amcExpiresAt || undefined,
    amcType: input.amcType || "none",
    lastCalibrationAt: input.lastCalibrationAt || undefined,
    nextCalibrationDueAt: input.nextCalibrationDueAt || undefined,
    ppmIntervalDays,
    lastPpmAt: input.lastPpmAt || undefined,
    nextPpmDueAt: computeNextPpm(input.lastPpmAt, ppmIntervalDays),
    status: input.status || "active",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  assets.unshift(a);
  flushA();
  return a;
}

export function updateAsset(
  id: string,
  organizationId: string,
  patch: Partial<AssetInput>
): BiomedicalAsset | null {
  const a = assets.find((x) => x.id === id && x.organizationId === organizationId);
  if (!a) return null;
  const now = new Date().toISOString();

  if (patch.name !== undefined) a.name = patch.name.trim();
  if (patch.category !== undefined) a.category = patch.category;
  if (patch.riskClass !== undefined) a.riskClass = patch.riskClass;
  if (patch.manufacturer !== undefined)
    a.manufacturer = patch.manufacturer?.trim() || undefined;
  if (patch.model !== undefined) a.model = patch.model?.trim() || undefined;
  if (patch.serialNumber !== undefined)
    a.serialNumber = patch.serialNumber?.trim() || undefined;
  if (patch.location !== undefined) a.location = patch.location.trim();
  if (patch.custodian !== undefined) a.custodian = patch.custodian?.trim() || undefined;
  if (patch.purchaseDate !== undefined) a.purchaseDate = patch.purchaseDate || undefined;
  if (patch.purchasePrice !== undefined) a.purchasePrice = patch.purchasePrice ?? undefined;
  if (patch.warrantyExpiresAt !== undefined)
    a.warrantyExpiresAt = patch.warrantyExpiresAt || undefined;
  if (patch.amcVendor !== undefined) a.amcVendor = patch.amcVendor?.trim() || undefined;
  if (patch.amcStartAt !== undefined) a.amcStartAt = patch.amcStartAt || undefined;
  if (patch.amcExpiresAt !== undefined) a.amcExpiresAt = patch.amcExpiresAt || undefined;
  if (patch.amcType !== undefined) a.amcType = patch.amcType;
  if (patch.lastCalibrationAt !== undefined)
    a.lastCalibrationAt = patch.lastCalibrationAt || undefined;
  if (patch.nextCalibrationDueAt !== undefined)
    a.nextCalibrationDueAt = patch.nextCalibrationDueAt || undefined;
  if (patch.ppmIntervalDays !== undefined)
    a.ppmIntervalDays = Math.max(0, Math.round(patch.ppmIntervalDays));
  if (patch.lastPpmAt !== undefined) a.lastPpmAt = patch.lastPpmAt || undefined;
  // Recompute next PPM whenever cadence or last PPM changes.
  a.nextPpmDueAt = computeNextPpm(a.lastPpmAt, a.ppmIntervalDays);

  if (patch.status !== undefined && patch.status !== a.status) {
    const prev = a.status;
    a.status = patch.status;
    if ((patch.status === "retired" || patch.status === "condemned") && prev !== patch.status) {
      a.retiredAt = now;
    }
    if (
      prev === "retired" || prev === "condemned"
    ) {
      if (patch.status !== "retired" && patch.status !== "condemned") {
        a.retiredAt = undefined;
      }
    }
  }
  if (patch.retiredReason !== undefined)
    a.retiredReason = patch.retiredReason?.trim() || undefined;
  if (patch.notes !== undefined) a.notes = patch.notes?.trim() || undefined;

  a.updatedAt = now;
  flushA();
  return a;
}

export function deleteAsset(id: string, organizationId: string): boolean {
  const idx = assets.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  assets.splice(idx, 1);
  // Also clear the asset's log history.
  for (let i = logs.length - 1; i >= 0; i--) {
    if (logs[i].assetId === id && logs[i].organizationId === organizationId) {
      logs.splice(i, 1);
    }
  }
  flushA();
  flushL();
  return true;
}

export function listLogs(opts: {
  organizationId: string;
  assetId?: string;
  type?: LogType;
}): MaintenanceLog[] {
  let list = logs.filter((l) => l.organizationId === opts.organizationId);
  if (opts.assetId) list = list.filter((l) => l.assetId === opts.assetId);
  if (opts.type) list = list.filter((l) => l.type === opts.type);
  return list.sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime()
  );
}

export interface LogInput {
  assetId: string;
  type?: LogType;
  performedAt?: string;
  performedBy?: string;
  vendor?: string;
  description: string;
  partsReplaced?: string;
  cost?: number;
  downtimeHours?: number;
  nextDueAt?: string;
  notes?: string;
}

export function createLog(organizationId: string, input: LogInput): MaintenanceLog | null {
  const asset = assets.find(
    (a) => a.id === input.assetId && a.organizationId === organizationId
  );
  if (!asset) return null;
  const now = new Date().toISOString();
  const log: MaintenanceLog = {
    id: `mlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    assetId: input.assetId,
    type: input.type || "ppm",
    performedAt: input.performedAt || now,
    performedBy: input.performedBy?.trim() || "",
    vendor: input.vendor?.trim() || undefined,
    description: input.description.trim(),
    partsReplaced: input.partsReplaced?.trim() || undefined,
    cost: input.cost ?? undefined,
    downtimeHours: input.downtimeHours ?? undefined,
    nextDueAt: input.nextDueAt || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
  };
  logs.unshift(log);

  // Side effects on the asset.
  if (log.type === "ppm") {
    asset.lastPpmAt = log.performedAt;
    asset.nextPpmDueAt = computeNextPpm(asset.lastPpmAt, asset.ppmIntervalDays);
    if (asset.status === "under_maintenance") asset.status = "active";
  }
  if (log.type === "calibration") {
    asset.lastCalibrationAt = log.performedAt;
    if (log.nextDueAt) asset.nextCalibrationDueAt = log.nextDueAt;
  }
  if (log.type === "repair" && asset.status === "under_repair") {
    asset.status = "active";
  }
  if (log.type === "condemnation") {
    asset.status = "condemned";
    asset.retiredAt = now;
    asset.retiredReason = log.description;
  }
  asset.updatedAt = now;

  flushA();
  flushL();
  return log;
}

export function deleteLog(id: string, organizationId: string): boolean {
  const idx = logs.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  logs.splice(idx, 1);
  flushL();
  return true;
}
