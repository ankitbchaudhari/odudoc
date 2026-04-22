// Medical Gas Management. Tenant-scoped.
// Two entities:
//   GasAsset — a cylinder, manifold, liquid tank, or pipeline zone
//   GasLog — a pressure/level/refill/alarm event against an asset
// No patient cascade.

import { bindPersistentArray } from "../persistent-array";

export type GasType = "o2" | "n2o" | "medical_air" | "vacuum" | "co2" | "n2" | "helium_o2" | "entonox";
export type AssetType = "cylinder" | "manifold" | "liquid_tank" | "pipeline_zone" | "concentrator" | "compressor" | "vacuum_pump";
export type AssetStatus = "in_service" | "empty" | "refilling" | "maintenance" | "alarm" | "out_of_service" | "condemned";
export type LogKind = "pressure_check" | "level_check" | "refill" | "swap" | "alarm" | "maintenance" | "test" | "purity_check";
export type AlarmSeverity = "info" | "low" | "high" | "critical";

export interface GasAsset {
  id: string;                           // GAS-{suffix}-{seq}
  organizationId: string;
  assetType: AssetType;
  gasType: GasType;
  serialNumber: string;
  manufacturer?: string;
  capacityUnit: "L" | "m3" | "kg" | "bar" | "psi" | "percent";
  capacityValue?: number;               // nominal capacity
  currentLevel?: number;                // last known level (units match capacityUnit)
  currentPressureBar?: number;          // for cylinders / manifolds
  location: string;                     // "Basement LMO room", "ICU pipeline zone"
  servingZone?: string;                 // downstream area served
  status: AssetStatus;
  installedAt?: string;
  lastRefillAt?: string;
  nextRefillDueAt?: string;
  lastMaintenanceAt?: string;
  nextMaintenanceDueAt?: string;
  vendor?: string;
  vendorPhone?: string;
  contractEndDate?: string;
  purityPct?: number;                   // last measured purity
  alarmLowBar?: number;
  alarmHighBar?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GasLog {
  id: string;                           // GLG-{suffix}-{seq}
  organizationId: string;
  assetId: string;
  assetSerial: string;                  // denorm
  gasType: GasType;                     // denorm
  kind: LogKind;
  recordedAt: string;
  recordedBy: string;
  pressureBar?: number;
  level?: number;                       // units per asset
  purityPct?: number;
  alarmSeverity?: AlarmSeverity;
  alarmDescription?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  refillVolume?: number;
  refillVendor?: string;
  maintenanceNotes?: string;
  attachmentsUrl?: string;
  createdAt: string;
}

const assets: GasAsset[] = [];
const logs: GasLog[] = [];
const hA = bindPersistentArray<GasAsset>("medical-gas-assets", assets, () => []);
const hL = bindPersistentArray<GasLog>("medical-gas-logs", logs, () => []);
await hA; await hL;

export const GAS_TYPE_LABEL: Record<GasType, string> = {
  o2: "Oxygen (O₂)", n2o: "Nitrous oxide (N₂O)", medical_air: "Medical air",
  vacuum: "Vacuum", co2: "CO₂", n2: "Nitrogen", helium_o2: "Heliox", entonox: "Entonox",
};
export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  cylinder: "Cylinder", manifold: "Manifold", liquid_tank: "Liquid tank (LMO)",
  pipeline_zone: "Pipeline zone", concentrator: "Concentrator",
  compressor: "Compressor", vacuum_pump: "Vacuum pump",
};
export const STATUS_LABEL: Record<AssetStatus, string> = {
  in_service: "In service", empty: "Empty", refilling: "Refilling",
  maintenance: "Maintenance", alarm: "Alarm", out_of_service: "Out of service", condemned: "Condemned",
};
export const LOG_KIND_LABEL: Record<LogKind, string> = {
  pressure_check: "Pressure check", level_check: "Level check",
  refill: "Refill", swap: "Swap", alarm: "Alarm",
  maintenance: "Maintenance", test: "Test", purity_check: "Purity check",
};
export const SEVERITY_LABEL: Record<AlarmSeverity, string> = {
  info: "Info", low: "Low", high: "High", critical: "Critical",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Assets
export function listAssets(opts: { organizationId: string; gasType?: GasType; assetType?: AssetType; status?: AssetStatus }): GasAsset[] {
  return assets.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.gasType ? r.gasType === opts.gasType : true))
    .filter((r) => (opts.assetType ? r.assetType === opts.assetType : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .sort((a, b) => a.location.localeCompare(b.location));
}
export function createAsset(orgId: string, input: Partial<GasAsset>): { ok: true; record: GasAsset } | { ok: false; error: string } {
  if (!input.serialNumber || !input.location || !input.gasType || !input.assetType) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: GasAsset = {
    id: nextId("GAS", assets, orgId), organizationId: orgId,
    assetType: input.assetType as AssetType,
    gasType: input.gasType as GasType,
    serialNumber: input.serialNumber,
    manufacturer: input.manufacturer,
    capacityUnit: (input.capacityUnit || "bar") as GasAsset["capacityUnit"],
    capacityValue: input.capacityValue,
    currentLevel: input.currentLevel,
    currentPressureBar: input.currentPressureBar,
    location: input.location,
    servingZone: input.servingZone,
    status: (input.status || "in_service") as AssetStatus,
    installedAt: input.installedAt,
    lastRefillAt: input.lastRefillAt,
    nextRefillDueAt: input.nextRefillDueAt,
    lastMaintenanceAt: input.lastMaintenanceAt,
    nextMaintenanceDueAt: input.nextMaintenanceDueAt,
    vendor: input.vendor, vendorPhone: input.vendorPhone,
    contractEndDate: input.contractEndDate,
    purityPct: input.purityPct,
    alarmLowBar: input.alarmLowBar,
    alarmHighBar: input.alarmHighBar,
    remark: input.remark,
    createdAt: now, updatedAt: now,
  };
  assets.push(r);
  return { ok: true, record: r };
}
export function updateAsset(id: string, orgId: string, patch: Partial<GasAsset>): GasAsset | null {
  const i = assets.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const now = new Date().toISOString();
  assets.splice(i, 1, { ...assets[i], ...patch, id: assets[i].id, organizationId: assets[i].organizationId, updatedAt: now });
  return assets[i];
}
export function deleteAsset(id: string, orgId: string): boolean {
  const i = assets.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  assets.splice(i, 1);
  for (let j = logs.length - 1; j >= 0; j--) if (logs[j].assetId === id && logs[j].organizationId === orgId) logs.splice(j, 1);
  return true;
}

// Logs
export function listLogs(opts: { organizationId: string; assetId?: string; kind?: LogKind; limit?: number }): GasLog[] {
  const rows = logs.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.assetId ? r.assetId === opts.assetId : true))
    .filter((r) => (opts.kind ? r.kind === opts.kind : true))
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  return opts.limit ? rows.slice(0, opts.limit) : rows;
}
export function createLog(orgId: string, input: Partial<GasLog>): { ok: true; record: GasLog } | { ok: false; error: string } {
  if (!input.assetId || !input.kind || !input.recordedBy) return { ok: false, error: "missing_required" };
  const a = assets.find((x) => x.id === input.assetId && x.organizationId === orgId);
  if (!a) return { ok: false, error: "asset_not_found" };
  const now = new Date().toISOString();
  const r: GasLog = {
    id: nextId("GLG", logs, orgId), organizationId: orgId,
    assetId: a.id, assetSerial: a.serialNumber, gasType: a.gasType,
    kind: input.kind as LogKind,
    recordedAt: input.recordedAt || now,
    recordedBy: input.recordedBy,
    pressureBar: input.pressureBar,
    level: input.level,
    purityPct: input.purityPct,
    alarmSeverity: input.alarmSeverity,
    alarmDescription: input.alarmDescription,
    acknowledgedBy: input.acknowledgedBy,
    acknowledgedAt: input.acknowledgedAt,
    resolvedAt: input.resolvedAt,
    refillVolume: input.refillVolume,
    refillVendor: input.refillVendor,
    maintenanceNotes: input.maintenanceNotes,
    attachmentsUrl: input.attachmentsUrl,
    createdAt: now,
  };
  logs.push(r);
  // Denormalize onto asset
  if (r.pressureBar !== undefined) a.currentPressureBar = r.pressureBar;
  if (r.level !== undefined) a.currentLevel = r.level;
  if (r.purityPct !== undefined) a.purityPct = r.purityPct;
  if (r.kind === "refill") { a.lastRefillAt = r.recordedAt; if (a.status === "empty" || a.status === "refilling") a.status = "in_service"; }
  if (r.kind === "maintenance") a.lastMaintenanceAt = r.recordedAt;
  if (r.kind === "alarm" && r.alarmSeverity) a.status = "alarm";
  a.updatedAt = now;
  return { ok: true, record: r };
}
export function updateLog(id: string, orgId: string, patch: Partial<GasLog>): GasLog | null {
  const i = logs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  logs.splice(i, 1, { ...logs[i], ...patch, id: logs[i].id, organizationId: logs[i].organizationId });
  return logs[i];
}
export function deleteLog(id: string, orgId: string): boolean {
  const i = logs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  logs.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myA = assets.filter((r) => r.organizationId === orgId);
  const myL = logs.filter((r) => r.organizationId === orgId);
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000).toISOString();
  const inService = myA.filter((a) => a.status === "in_service").length;
  const empty = myA.filter((a) => a.status === "empty").length;
  const alarmActive = myA.filter((a) => a.status === "alarm").length;
  const refillsDueSoon = myA.filter((a) => a.nextRefillDueAt && a.nextRefillDueAt <= in7).length;
  const maintenanceDueSoon = myA.filter((a) => a.nextMaintenanceDueAt && a.nextMaintenanceDueAt <= in7).length;
  const contractExpiringSoon = myA.filter((a) => a.contractEndDate && a.contractEndDate <= in7).length;
  const criticalAlarms30d = myL.filter((l) => l.kind === "alarm" && l.alarmSeverity === "critical" && l.recordedAt >= new Date(now.getTime() - 30 * 86400000).toISOString()).length;
  const refillsMonth = myL.filter((l) => l.kind === "refill" && l.recordedAt >= new Date(now.getFullYear(), now.getMonth(), 1).toISOString()).length;
  return {
    totalAssets: myA.length,
    inService, empty, alarmActive,
    refillsDueSoon, maintenanceDueSoon, contractExpiringSoon,
    criticalAlarms30d, refillsMonth,
  };
}
