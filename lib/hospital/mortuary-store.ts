// Mortuary / Morgue Management. Tenant-scoped.
//
// Two entities:
//   MortuaryUnit   — refrigerated storage compartment
//   MortuaryRecord — body custody entry (admission → release)
//
// NABH requires chain-of-custody from hospital-declared death through
// release to next-of-kin or funeral service. We track:
//   * cause of death & death certificate number
//   * whether the case is medico-legal (MLC) and police intimation
//   * autopsy requirement and completion
//   * embalming
//   * release with recipient identification
//
// Unit capacity: each unit holds at most one body. A unit has a live
// currentRecordId pointer; admitting a body assigns the unit, releasing
// it clears the pointer. Temperature logs are captured per record.
//
// Custody lifecycle:
//   admitted → in_storage → (released | autopsy_pending → autopsy_done → released)
//   at any point: embalmed flag can be set (additive)
//
// Patient cascade: deleting a patient detaches patientId but retains
// the mortuary record (death custody is a legal document).

import { bindPersistentArray } from "../persistent-array";

export type UnitStatus = "available" | "occupied" | "out_of_service" | "cleaning";

export type CustodyStatus =
  | "admitted"
  | "in_storage"
  | "autopsy_pending"
  | "autopsy_done"
  | "released";

export type ReleaseRecipientType = "next_of_kin" | "funeral_home" | "police" | "other";

export interface MortuaryUnit {
  id: string;
  organizationId: string;
  unitCode: string; // MORT-{suffix}-{seq}
  label: string; // "Cooler-1 Drawer A"
  temperatureC?: number; // last recorded temperature
  temperatureRecordedAt?: string;
  status: UnitStatus;
  currentRecordId?: string;
  location?: string; // "Basement — Pathology block"
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MortuaryRecord {
  id: string;
  organizationId: string;
  recordNumber: string; // MR-{suffix}-{seq}
  patientId?: string;
  decedentName: string;
  decedentAge?: number;
  decedentGender?: "male" | "female" | "other";
  decedentAddress?: string;

  deathDateTime: string;
  deathLocation?: string; // "ICU-2", "ER"
  declaredBy?: string; // doctor name
  causeOfDeath?: string;
  deathCertificateNumber?: string;

  isMedicoLegal: boolean;
  policeIntimationNumber?: string;
  policeStation?: string;
  firNumber?: string;

  autopsyRequired: boolean;
  autopsyDoneAt?: string;
  autopsyFindings?: string;

  embalmed: boolean;
  embalmedAt?: string;
  embalmedBy?: string;

  unitId?: string;
  admittedAt: string;
  admittedBy?: string;

  releasedAt?: string;
  releasedBy?: string;
  recipientType?: ReleaseRecipientType;
  recipientName?: string;
  recipientRelation?: string;
  recipientIdProof?: string;
  recipientPhone?: string;

  status: CustodyStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const units: MortuaryUnit[] = [];
const records: MortuaryRecord[] = [];

const { hydrate: hydrateU, flush: flushU } = bindPersistentArray<MortuaryUnit>(
  "hospital-mortuary-units",
  units,
  () => []
);
const { hydrate: hydrateR, flush: flushR } = bindPersistentArray<MortuaryRecord>(
  "hospital-mortuary-records",
  records,
  () => []
);
await hydrateU();
await hydrateR();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextUnitCode(orgId: string): string {
  const n = units.filter((u) => u.organizationId === orgId).length + 1;
  return `MORT-${orgSuffix(orgId)}-${String(n).padStart(2, "0")}`;
}
function nextRecordNumber(orgId: string): string {
  const n = records.filter((r) => r.organizationId === orgId).length + 1;
  return `MR-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

// Units --------------------------------------------------------------

export function listUnits(organizationId: string): MortuaryUnit[] {
  return units
    .filter((u) => u.organizationId === organizationId)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface UnitInput {
  label?: string;
  temperatureC?: number;
  status?: UnitStatus;
  location?: string;
  notes?: string;
  active?: boolean;
}

export function createUnit(organizationId: string, input: UnitInput): MortuaryUnit {
  const now = new Date().toISOString();
  const u: MortuaryUnit = {
    id: `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    unitCode: nextUnitCode(organizationId),
    label: (input.label || "Unit").trim(),
    temperatureC: input.temperatureC !== undefined ? Number(input.temperatureC) : undefined,
    temperatureRecordedAt: input.temperatureC !== undefined ? now : undefined,
    status: input.status || "available",
    currentRecordId: undefined,
    location: input.location?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  units.unshift(u);
  flushU();
  return u;
}

export function updateUnit(
  id: string,
  organizationId: string,
  patch: Partial<UnitInput>
): MortuaryUnit | null {
  const u = units.find((x) => x.id === id && x.organizationId === organizationId);
  if (!u) return null;
  const now = new Date().toISOString();
  if (patch.label !== undefined) u.label = patch.label.trim();
  if (patch.temperatureC !== undefined) {
    u.temperatureC = Number(patch.temperatureC);
    u.temperatureRecordedAt = now;
  }
  if (patch.status !== undefined) u.status = patch.status;
  if (patch.location !== undefined) u.location = patch.location?.trim() || undefined;
  if (patch.notes !== undefined) u.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) u.active = patch.active;
  u.updatedAt = now;
  flushU();
  return u;
}

export function deleteUnit(id: string, organizationId: string): boolean {
  const u = units.find((x) => x.id === id && x.organizationId === organizationId);
  if (!u) return false;
  if (u.currentRecordId) return false; // refuse if occupied
  const idx = units.findIndex((x) => x.id === id);
  units.splice(idx, 1);
  flushU();
  return true;
}

// Records ------------------------------------------------------------

export function listRecords(opts: {
  organizationId: string;
  status?: CustodyStatus;
  unitId?: string;
  mlcOnly?: boolean;
  from?: string;
  to?: string;
}): MortuaryRecord[] {
  let list = records.filter((r) => r.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((r) => r.status === opts.status);
  if (opts.unitId) list = list.filter((r) => r.unitId === opts.unitId);
  if (opts.mlcOnly) list = list.filter((r) => r.isMedicoLegal);
  if (opts.from) list = list.filter((r) => r.admittedAt >= opts.from!);
  if (opts.to) list = list.filter((r) => r.admittedAt <= opts.to!);
  return list.sort((a, b) => b.admittedAt.localeCompare(a.admittedAt));
}

export interface RecordInput {
  patientId?: string;
  decedentName?: string;
  decedentAge?: number;
  decedentGender?: "male" | "female" | "other";
  decedentAddress?: string;
  deathDateTime?: string;
  deathLocation?: string;
  declaredBy?: string;
  causeOfDeath?: string;
  deathCertificateNumber?: string;
  isMedicoLegal?: boolean;
  policeIntimationNumber?: string;
  policeStation?: string;
  firNumber?: string;
  autopsyRequired?: boolean;
  autopsyDoneAt?: string;
  autopsyFindings?: string;
  embalmed?: boolean;
  embalmedAt?: string;
  embalmedBy?: string;
  unitId?: string;
  admittedAt?: string;
  admittedBy?: string;
  releasedAt?: string;
  releasedBy?: string;
  recipientType?: ReleaseRecipientType;
  recipientName?: string;
  recipientRelation?: string;
  recipientIdProof?: string;
  recipientPhone?: string;
  status?: CustodyStatus;
  notes?: string;
}

function assignUnit(
  unitId: string | undefined,
  recordId: string,
  organizationId: string
): "ok" | "not_found" | "occupied" | "unavailable" {
  if (!unitId) return "ok";
  const u = units.find((x) => x.id === unitId && x.organizationId === organizationId);
  if (!u) return "not_found";
  if (u.currentRecordId && u.currentRecordId !== recordId) return "occupied";
  if (u.status === "out_of_service") return "unavailable";
  u.currentRecordId = recordId;
  if (u.status === "available") u.status = "occupied";
  u.updatedAt = new Date().toISOString();
  flushU();
  return "ok";
}

function releaseUnit(unitId: string | undefined, organizationId: string) {
  if (!unitId) return;
  const u = units.find((x) => x.id === unitId && x.organizationId === organizationId);
  if (!u) return;
  u.currentRecordId = undefined;
  if (u.status === "occupied") u.status = "cleaning";
  u.updatedAt = new Date().toISOString();
  flushU();
}

export function createRecord(
  organizationId: string,
  input: RecordInput
): { ok: boolean; record?: MortuaryRecord; error?: string } {
  const now = new Date().toISOString();
  const id = `mr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const r: MortuaryRecord = {
    id,
    organizationId,
    recordNumber: nextRecordNumber(organizationId),
    patientId: input.patientId || undefined,
    decedentName: (input.decedentName || "").trim(),
    decedentAge: input.decedentAge !== undefined ? Math.max(0, Math.round(Number(input.decedentAge))) : undefined,
    decedentGender: input.decedentGender || undefined,
    decedentAddress: input.decedentAddress?.trim() || undefined,
    deathDateTime: input.deathDateTime || now,
    deathLocation: input.deathLocation?.trim() || undefined,
    declaredBy: input.declaredBy?.trim() || undefined,
    causeOfDeath: input.causeOfDeath?.trim() || undefined,
    deathCertificateNumber: input.deathCertificateNumber?.trim() || undefined,
    isMedicoLegal: input.isMedicoLegal ?? false,
    policeIntimationNumber: input.policeIntimationNumber?.trim() || undefined,
    policeStation: input.policeStation?.trim() || undefined,
    firNumber: input.firNumber?.trim() || undefined,
    autopsyRequired: input.autopsyRequired ?? false,
    autopsyDoneAt: input.autopsyDoneAt || undefined,
    autopsyFindings: input.autopsyFindings?.trim() || undefined,
    embalmed: input.embalmed ?? false,
    embalmedAt: input.embalmedAt || undefined,
    embalmedBy: input.embalmedBy?.trim() || undefined,
    unitId: input.unitId || undefined,
    admittedAt: input.admittedAt || now,
    admittedBy: input.admittedBy?.trim() || undefined,
    releasedAt: undefined,
    releasedBy: undefined,
    recipientType: undefined,
    recipientName: undefined,
    recipientRelation: undefined,
    recipientIdProof: undefined,
    recipientPhone: undefined,
    status: input.status || "in_storage",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  const assignResult = assignUnit(r.unitId, id, organizationId);
  if (assignResult !== "ok") {
    return {
      ok: false,
      error: assignResult === "not_found" ? "unit_not_found"
        : assignResult === "occupied" ? "unit_occupied"
        : "unit_unavailable",
    };
  }

  // Derive default status.
  if (r.autopsyRequired && !input.status) r.status = "autopsy_pending";

  records.unshift(r);
  flushR();
  return { ok: true, record: r };
}

export function updateRecord(
  id: string,
  organizationId: string,
  patch: Partial<RecordInput>
): { ok: boolean; record?: MortuaryRecord; error?: string } {
  const r = records.find((x) => x.id === id && x.organizationId === organizationId);
  if (!r) return { ok: false, error: "not_found" };
  const now = new Date().toISOString();
  const prevUnitId = r.unitId;

  if (patch.patientId !== undefined) r.patientId = patch.patientId || undefined;
  if (patch.decedentName !== undefined) r.decedentName = patch.decedentName.trim();
  if (patch.decedentAge !== undefined)
    r.decedentAge = Math.max(0, Math.round(Number(patch.decedentAge)));
  if (patch.decedentGender !== undefined) r.decedentGender = patch.decedentGender || undefined;
  if (patch.decedentAddress !== undefined)
    r.decedentAddress = patch.decedentAddress?.trim() || undefined;
  if (patch.deathDateTime !== undefined) r.deathDateTime = patch.deathDateTime || r.deathDateTime;
  if (patch.deathLocation !== undefined)
    r.deathLocation = patch.deathLocation?.trim() || undefined;
  if (patch.declaredBy !== undefined) r.declaredBy = patch.declaredBy?.trim() || undefined;
  if (patch.causeOfDeath !== undefined)
    r.causeOfDeath = patch.causeOfDeath?.trim() || undefined;
  if (patch.deathCertificateNumber !== undefined)
    r.deathCertificateNumber = patch.deathCertificateNumber?.trim() || undefined;
  if (patch.isMedicoLegal !== undefined) r.isMedicoLegal = patch.isMedicoLegal;
  if (patch.policeIntimationNumber !== undefined)
    r.policeIntimationNumber = patch.policeIntimationNumber?.trim() || undefined;
  if (patch.policeStation !== undefined)
    r.policeStation = patch.policeStation?.trim() || undefined;
  if (patch.firNumber !== undefined) r.firNumber = patch.firNumber?.trim() || undefined;

  if (patch.autopsyRequired !== undefined) r.autopsyRequired = patch.autopsyRequired;
  if (patch.autopsyDoneAt !== undefined) r.autopsyDoneAt = patch.autopsyDoneAt || undefined;
  if (patch.autopsyFindings !== undefined)
    r.autopsyFindings = patch.autopsyFindings?.trim() || undefined;

  if (patch.embalmed !== undefined) {
    r.embalmed = patch.embalmed;
    if (patch.embalmed && !r.embalmedAt) r.embalmedAt = now;
  }
  if (patch.embalmedAt !== undefined) r.embalmedAt = patch.embalmedAt || undefined;
  if (patch.embalmedBy !== undefined) r.embalmedBy = patch.embalmedBy?.trim() || undefined;

  if (patch.unitId !== undefined && patch.unitId !== r.unitId) {
    const newUnitId = patch.unitId || undefined;
    const res = assignUnit(newUnitId, r.id, organizationId);
    if (res !== "ok") {
      return {
        ok: false,
        error: res === "not_found" ? "unit_not_found"
          : res === "occupied" ? "unit_occupied"
          : "unit_unavailable",
      };
    }
    if (prevUnitId && prevUnitId !== newUnitId) releaseUnit(prevUnitId, organizationId);
    r.unitId = newUnitId;
  }

  if (patch.admittedAt !== undefined) r.admittedAt = patch.admittedAt || r.admittedAt;
  if (patch.admittedBy !== undefined) r.admittedBy = patch.admittedBy?.trim() || undefined;

  if (patch.recipientType !== undefined) r.recipientType = patch.recipientType || undefined;
  if (patch.recipientName !== undefined)
    r.recipientName = patch.recipientName?.trim() || undefined;
  if (patch.recipientRelation !== undefined)
    r.recipientRelation = patch.recipientRelation?.trim() || undefined;
  if (patch.recipientIdProof !== undefined)
    r.recipientIdProof = patch.recipientIdProof?.trim() || undefined;
  if (patch.recipientPhone !== undefined)
    r.recipientPhone = patch.recipientPhone?.trim() || undefined;
  if (patch.releasedBy !== undefined) r.releasedBy = patch.releasedBy?.trim() || undefined;
  if (patch.releasedAt !== undefined) r.releasedAt = patch.releasedAt || undefined;

  if (patch.autopsyDoneAt !== undefined && patch.autopsyDoneAt && r.status === "autopsy_pending") {
    r.status = "autopsy_done";
  }

  if (patch.status !== undefined && patch.status !== r.status) {
    r.status = patch.status;
    if (patch.status === "released") {
      if (!r.releasedAt) r.releasedAt = now;
      if (r.unitId) releaseUnit(r.unitId, organizationId);
      r.unitId = undefined;
    }
    if (patch.status === "autopsy_done" && !r.autopsyDoneAt) r.autopsyDoneAt = now;
  }

  if (patch.notes !== undefined) r.notes = patch.notes?.trim() || undefined;

  r.updatedAt = now;
  flushR();
  return { ok: true, record: r };
}

export function deleteRecord(id: string, organizationId: string): boolean {
  const idx = records.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  const r = records[idx];
  if (r.unitId) releaseUnit(r.unitId, organizationId);
  records.splice(idx, 1);
  flushR();
  return true;
}

/** Detach patient from mortuary records — custody record is legally retained. */
export function detachPatientFromMortuary(patientId: string, organizationId: string): number {
  let n = 0;
  for (const r of records) {
    if (r.patientId === patientId && r.organizationId === organizationId) {
      r.patientId = undefined;
      r.updatedAt = new Date().toISOString();
      n++;
    }
  }
  if (n > 0) flushR();
  return n;
}
