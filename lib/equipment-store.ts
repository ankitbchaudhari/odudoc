// Biomedical equipment registry + maintenance log.
// Tracks every monitor / ventilator / autoclave / pump etc. plus the
// preventive-maintenance and calibration history. Alerts driven off
// nextMaintenanceDate / nextCalibrationDate fields on the row.

import { bindPersistentArray } from "./persistent-array";

export interface EquipmentItem {
  id: string;
  doctorEmail: string;
  /** Free-form asset tag, ideally physically labelled on the device. */
  assetTag: string;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNo?: string;
  /** Where the device lives (OPD-1, OR-2, ICU bed 4, …). */
  location?: string;
  category?: string;        // "Monitor", "Ventilator", "Pump", "Autoclave"
  purchaseDate?: string;    // ISO date
  warrantyEnd?: string;     // ISO date
  amcVendor?: string;       // Annual Maintenance Contract vendor
  amcEnd?: string;
  nextMaintenanceDate?: string;
  nextCalibrationDate?: string;
  status: "active" | "under_maintenance" | "out_of_service" | "retired";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  doctorEmail: string;
  kind: "preventive" | "corrective" | "calibration" | "inspection";
  performedAt: string;
  performedBy?: string;     // technician name / vendor
  cost?: number;
  notes?: string;
  /** Set the next due date in one shot — convenience field. */
  nextDueAt?: string;
  createdAt: string;
}

const equipment: EquipmentItem[] = [];
const maintenance: MaintenanceLog[] = [];

const {
  hydrate: hydrateEquip, reload: reloadEquipInternal, flush: flushEquip,
} = bindPersistentArray<EquipmentItem>("emr-equipment", equipment, () => []);
const {
  hydrate: hydrateMaint, reload: reloadMaintInternal, flush: flushMaint,
} = bindPersistentArray<MaintenanceLog>("emr-equipment-maint", maintenance, () => []);

await hydrateEquip();
await hydrateMaint();

export async function reloadEquipment() { await reloadEquipInternal(); }
export async function reloadMaintenance() { await reloadMaintInternal(); }

const nowIso = () => new Date().toISOString();
const id = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export async function createEquipment(input: Omit<EquipmentItem, "id" | "createdAt" | "updatedAt" | "status"> & { status?: EquipmentItem["status"] }): Promise<EquipmentItem> {
  const row: EquipmentItem = {
    ...input,
    id: id("eq"),
    doctorEmail: input.doctorEmail.toLowerCase(),
    status: input.status || "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  equipment.push(row);
  flushEquip();
  return row;
}

export async function listEquipment(opts: { doctorEmail: string; status?: EquipmentItem["status"] | "All"; search?: string }): Promise<EquipmentItem[]> {
  await hydrateEquip();
  const e = opts.doctorEmail.toLowerCase();
  let list = equipment.filter((r) => r.doctorEmail === e);
  if (opts.status && opts.status !== "All") list = list.filter((r) => r.status === opts.status);
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) => r.assetTag.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || (r.location || "").toLowerCase().includes(q),
    );
  }
  list.sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

export async function updateEquipment(rowId: string, doctorEmail: string, patch: Partial<EquipmentItem>): Promise<EquipmentItem | null> {
  await hydrateEquip();
  const r = equipment.find((x) => x.id === rowId && x.doctorEmail === doctorEmail.toLowerCase());
  if (!r) return null;
  Object.assign(r, patch, { updatedAt: nowIso() });
  flushEquip();
  return r;
}

export async function logMaintenance(input: Omit<MaintenanceLog, "id" | "createdAt">): Promise<MaintenanceLog> {
  const row: MaintenanceLog = {
    ...input,
    id: id("mnt"),
    doctorEmail: input.doctorEmail.toLowerCase(),
    createdAt: nowIso(),
  };
  maintenance.push(row);
  flushMaint();
  // Bump nextMaintenanceDate / nextCalibrationDate on the equipment row.
  if (input.nextDueAt) {
    const eq = equipment.find((x) => x.id === input.equipmentId);
    if (eq) {
      if (input.kind === "calibration") eq.nextCalibrationDate = input.nextDueAt;
      else eq.nextMaintenanceDate = input.nextDueAt;
      eq.updatedAt = nowIso();
      flushEquip();
    }
  }
  return row;
}

export async function listMaintenance(equipmentId: string): Promise<MaintenanceLog[]> {
  await hydrateMaint();
  return maintenance.filter((m) => m.equipmentId === equipmentId).sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export interface EquipmentSummary {
  total: number;
  active: number;
  underMaintenance: number;
  outOfService: number;
  maintenanceDueSoon: number;   // within 14 days
  calibrationDueSoon: number;
}

export async function summariseEquipment(doctorEmail: string): Promise<EquipmentSummary> {
  const list = await listEquipment({ doctorEmail });
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  let active = 0, underMaintenance = 0, outOfService = 0, maintenanceDueSoon = 0, calibrationDueSoon = 0;
  for (const e of list) {
    if (e.status === "active") active += 1;
    if (e.status === "under_maintenance") underMaintenance += 1;
    if (e.status === "out_of_service") outOfService += 1;
    const dueSoon = (iso?: string) => {
      if (!iso) return false;
      const t = Date.parse(iso);
      return Number.isFinite(t) && t - now < 14 * day;
    };
    if (dueSoon(e.nextMaintenanceDate)) maintenanceDueSoon += 1;
    if (dueSoon(e.nextCalibrationDate)) calibrationDueSoon += 1;
  }
  return { total: list.length, active, underMaintenance, outOfService, maintenanceDueSoon, calibrationDueSoon };
}
