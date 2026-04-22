// Ambulance fleet & dispatch. Tenant-scoped.
//
// Two entities:
//   AmbulanceVehicle — fleet unit with service/odometer tracking
//   DispatchCall     — an emergency/transfer call with status machine
//
// Dispatch lifecycle:
//   requested → dispatched → en_route → on_scene → transporting → completed
//                                                              ↘ cancelled
//
// Auto-timestamp rules on status transitions:
//   dispatched    → dispatchedAt
//   on_scene      → arrivedAtPatientAt
//   transporting  → departedSceneAt
//   completed     → arrivedAtDestinationAt + completedAt
//   cancelled     → cancelledAt
//
// Side effects:
//   * when a call is dispatched, linked vehicle flips to "on_call"
//   * when a call completes/cancels, linked vehicle returns to "available"
//     (unless vehicle is under_maintenance / out_of_service)

import { bindPersistentArray } from "../persistent-array";

export type VehicleType = "basic" | "als" | "bls" | "neonatal" | "mortuary";
export type VehicleStatus =
  | "available"
  | "on_call"
  | "under_maintenance"
  | "out_of_service";
export type VehicleOwnership = "owned" | "contracted" | "hired";

export type CallType = "emergency" | "transfer" | "discharge" | "non_emergency";
export type CallPriority = "code_red" | "code_yellow" | "code_green";
export type CallStatus =
  | "requested"
  | "dispatched"
  | "en_route"
  | "on_scene"
  | "transporting"
  | "completed"
  | "cancelled";

export interface AmbulanceVehicle {
  id: string;
  organizationId: string;
  vehicleCode: string; // AMB-{suffix}-{seq}
  registrationNumber: string; // e.g. MH-01-AB-1234
  make?: string;
  model?: string;
  year?: number;
  type: VehicleType;
  status: VehicleStatus;
  ownership: VehicleOwnership;
  baseLocation?: string;
  odometerKm?: number;
  lastServiceAt?: string;
  nextServiceDueAt?: string;
  insuranceExpiresAt?: string;
  puccExpiresAt?: string; // Pollution cert
  fitnessExpiresAt?: string;
  equipment?: string; // comma list
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchCall {
  id: string;
  organizationId: string;
  callNumber: string; // CALL-{suffix}-{seq}
  callType: CallType;
  priority: CallPriority;

  callerName?: string;
  callerPhone?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other";
  chiefComplaint?: string;

  pickupAddress: string;
  destinationAddress?: string;
  destinationIsFacility?: boolean;

  vehicleId?: string;
  crewLead?: string;
  paramedic?: string;
  driver?: string;

  requestedAt: string;
  dispatchedAt?: string;
  arrivedAtPatientAt?: string;
  departedSceneAt?: string;
  arrivedAtDestinationAt?: string;
  completedAt?: string;
  cancelledAt?: string;

  distanceKm?: number;
  billingAmount?: number;
  outcome?: string;
  cancelReason?: string;
  notes?: string;

  status: CallStatus;
  createdAt: string;
  updatedAt: string;
}

const vehicles: AmbulanceVehicle[] = [];
const calls: DispatchCall[] = [];

const { hydrate: hydrateV, flush: flushV } = bindPersistentArray<AmbulanceVehicle>(
  "hospital-ambulance-vehicles",
  vehicles,
  () => []
);
const { hydrate: hydrateC, flush: flushC } = bindPersistentArray<DispatchCall>(
  "hospital-ambulance-calls",
  calls,
  () => []
);
await hydrateV();
await hydrateC();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}
function nextVehicleCode(orgId: string): string {
  const n = vehicles.filter((v) => v.organizationId === orgId).length + 1;
  return `AMB-${orgSuffix(orgId)}-${String(n).padStart(3, "0")}`;
}
function nextCallNumber(orgId: string): string {
  const n = calls.filter((c) => c.organizationId === orgId).length + 1;
  return `CALL-${orgSuffix(orgId)}-${String(n).padStart(6, "0")}`;
}

export const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  basic: "Basic Transport",
  als: "Advanced Life Support",
  bls: "Basic Life Support",
  neonatal: "Neonatal",
  mortuary: "Mortuary",
};

export const PRIORITY_LABEL: Record<CallPriority, string> = {
  code_red: "Code Red (critical)",
  code_yellow: "Code Yellow (urgent)",
  code_green: "Code Green (stable)",
};

// Vehicles -----------------------------------------------------------

export function listVehicles(organizationId: string): AmbulanceVehicle[] {
  return vehicles
    .filter((v) => v.organizationId === organizationId)
    .sort((a, b) => a.registrationNumber.localeCompare(b.registrationNumber));
}

export interface VehicleInput {
  registrationNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  status?: VehicleStatus;
  ownership?: VehicleOwnership;
  baseLocation?: string;
  odometerKm?: number;
  lastServiceAt?: string;
  nextServiceDueAt?: string;
  insuranceExpiresAt?: string;
  puccExpiresAt?: string;
  fitnessExpiresAt?: string;
  equipment?: string;
  notes?: string;
  active?: boolean;
}

export function createVehicle(
  organizationId: string,
  input: VehicleInput
): AmbulanceVehicle {
  const now = new Date().toISOString();
  const v: AmbulanceVehicle = {
    id: `amb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    vehicleCode: nextVehicleCode(organizationId),
    registrationNumber: (input.registrationNumber || "").trim().toUpperCase(),
    make: input.make?.trim() || undefined,
    model: input.model?.trim() || undefined,
    year: input.year ? Math.round(Number(input.year)) : undefined,
    type: input.type || "basic",
    status: input.status || "available",
    ownership: input.ownership || "owned",
    baseLocation: input.baseLocation?.trim() || undefined,
    odometerKm: input.odometerKm !== undefined ? Math.max(0, Number(input.odometerKm)) : undefined,
    lastServiceAt: input.lastServiceAt || undefined,
    nextServiceDueAt: input.nextServiceDueAt || undefined,
    insuranceExpiresAt: input.insuranceExpiresAt || undefined,
    puccExpiresAt: input.puccExpiresAt || undefined,
    fitnessExpiresAt: input.fitnessExpiresAt || undefined,
    equipment: input.equipment?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  vehicles.unshift(v);
  flushV();
  return v;
}

export function updateVehicle(
  id: string,
  organizationId: string,
  patch: Partial<VehicleInput>
): AmbulanceVehicle | null {
  const v = vehicles.find((x) => x.id === id && x.organizationId === organizationId);
  if (!v) return null;
  if (patch.registrationNumber !== undefined)
    v.registrationNumber = patch.registrationNumber.trim().toUpperCase();
  if (patch.make !== undefined) v.make = patch.make?.trim() || undefined;
  if (patch.model !== undefined) v.model = patch.model?.trim() || undefined;
  if (patch.year !== undefined) v.year = patch.year ? Math.round(Number(patch.year)) : undefined;
  if (patch.type !== undefined) v.type = patch.type;
  if (patch.status !== undefined) v.status = patch.status;
  if (patch.ownership !== undefined) v.ownership = patch.ownership;
  if (patch.baseLocation !== undefined) v.baseLocation = patch.baseLocation?.trim() || undefined;
  if (patch.odometerKm !== undefined)
    v.odometerKm = Math.max(0, Number(patch.odometerKm));
  if (patch.lastServiceAt !== undefined) v.lastServiceAt = patch.lastServiceAt || undefined;
  if (patch.nextServiceDueAt !== undefined)
    v.nextServiceDueAt = patch.nextServiceDueAt || undefined;
  if (patch.insuranceExpiresAt !== undefined)
    v.insuranceExpiresAt = patch.insuranceExpiresAt || undefined;
  if (patch.puccExpiresAt !== undefined)
    v.puccExpiresAt = patch.puccExpiresAt || undefined;
  if (patch.fitnessExpiresAt !== undefined)
    v.fitnessExpiresAt = patch.fitnessExpiresAt || undefined;
  if (patch.equipment !== undefined) v.equipment = patch.equipment?.trim() || undefined;
  if (patch.notes !== undefined) v.notes = patch.notes?.trim() || undefined;
  if (patch.active !== undefined) v.active = patch.active;
  v.updatedAt = new Date().toISOString();
  flushV();
  return v;
}

export function deleteVehicle(id: string, organizationId: string): boolean {
  const idx = vehicles.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  // Detach from calls — keep call history, just null the ref.
  for (const c of calls) {
    if (c.vehicleId === id && c.organizationId === organizationId) {
      c.vehicleId = undefined;
    }
  }
  vehicles.splice(idx, 1);
  flushV();
  flushC();
  return true;
}

// Calls --------------------------------------------------------------

export function listCalls(opts: {
  organizationId: string;
  status?: CallStatus;
  priority?: CallPriority;
  callType?: CallType;
  vehicleId?: string;
  from?: string;
  to?: string;
}): DispatchCall[] {
  let list = calls.filter((c) => c.organizationId === opts.organizationId);
  if (opts.status) list = list.filter((c) => c.status === opts.status);
  if (opts.priority) list = list.filter((c) => c.priority === opts.priority);
  if (opts.callType) list = list.filter((c) => c.callType === opts.callType);
  if (opts.vehicleId) list = list.filter((c) => c.vehicleId === opts.vehicleId);
  if (opts.from) list = list.filter((c) => c.requestedAt >= opts.from!);
  if (opts.to) list = list.filter((c) => c.requestedAt <= opts.to!);
  return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export interface CallInput {
  callType?: CallType;
  priority?: CallPriority;
  callerName?: string;
  callerPhone?: string;
  patientName?: string;
  patientAge?: number;
  patientGender?: "male" | "female" | "other";
  chiefComplaint?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  destinationIsFacility?: boolean;
  vehicleId?: string;
  crewLead?: string;
  paramedic?: string;
  driver?: string;
  requestedAt?: string;
  dispatchedAt?: string;
  arrivedAtPatientAt?: string;
  departedSceneAt?: string;
  arrivedAtDestinationAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  distanceKm?: number;
  billingAmount?: number;
  outcome?: string;
  cancelReason?: string;
  notes?: string;
  status?: CallStatus;
}

function setVehicleOnCall(orgId: string, vehicleId: string | undefined) {
  if (!vehicleId) return;
  const v = vehicles.find((x) => x.id === vehicleId && x.organizationId === orgId);
  if (!v) return;
  if (v.status === "available") {
    v.status = "on_call";
    v.updatedAt = new Date().toISOString();
    flushV();
  }
}
function releaseVehicle(orgId: string, vehicleId: string | undefined) {
  if (!vehicleId) return;
  const v = vehicles.find((x) => x.id === vehicleId && x.organizationId === orgId);
  if (!v) return;
  if (v.status === "on_call") {
    v.status = "available";
    v.updatedAt = new Date().toISOString();
    flushV();
  }
}

export function createCall(organizationId: string, input: CallInput): DispatchCall {
  const now = new Date().toISOString();
  const status = input.status || "requested";
  const c: DispatchCall = {
    id: `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    callNumber: nextCallNumber(organizationId),
    callType: input.callType || "emergency",
    priority: input.priority || "code_yellow",
    callerName: input.callerName?.trim() || undefined,
    callerPhone: input.callerPhone?.trim() || undefined,
    patientName: input.patientName?.trim() || undefined,
    patientAge: input.patientAge !== undefined ? Math.max(0, Math.round(Number(input.patientAge))) : undefined,
    patientGender: input.patientGender || undefined,
    chiefComplaint: input.chiefComplaint?.trim() || undefined,
    pickupAddress: (input.pickupAddress || "").trim(),
    destinationAddress: input.destinationAddress?.trim() || undefined,
    destinationIsFacility: input.destinationIsFacility ?? false,
    vehicleId: input.vehicleId || undefined,
    crewLead: input.crewLead?.trim() || undefined,
    paramedic: input.paramedic?.trim() || undefined,
    driver: input.driver?.trim() || undefined,
    requestedAt: input.requestedAt || now,
    dispatchedAt: input.dispatchedAt || (status !== "requested" ? now : undefined),
    arrivedAtPatientAt: input.arrivedAtPatientAt,
    departedSceneAt: input.departedSceneAt,
    arrivedAtDestinationAt: input.arrivedAtDestinationAt,
    completedAt: input.completedAt,
    cancelledAt: input.cancelledAt,
    distanceKm: input.distanceKm !== undefined ? Math.max(0, Number(input.distanceKm)) : undefined,
    billingAmount: input.billingAmount !== undefined ? Math.max(0, Number(input.billingAmount)) : undefined,
    outcome: input.outcome?.trim() || undefined,
    cancelReason: input.cancelReason?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    status,
    createdAt: now,
    updatedAt: now,
  };
  calls.unshift(c);
  flushC();
  if (status !== "requested" && status !== "completed" && status !== "cancelled") {
    setVehicleOnCall(organizationId, c.vehicleId);
  }
  return c;
}

export function updateCall(
  id: string,
  organizationId: string,
  patch: Partial<CallInput>
): DispatchCall | null {
  const c = calls.find((x) => x.id === id && x.organizationId === organizationId);
  if (!c) return null;
  const now = new Date().toISOString();
  const prevVehicleId = c.vehicleId;
  const prevStatus = c.status;

  if (patch.callType !== undefined) c.callType = patch.callType;
  if (patch.priority !== undefined) c.priority = patch.priority;
  if (patch.callerName !== undefined) c.callerName = patch.callerName?.trim() || undefined;
  if (patch.callerPhone !== undefined) c.callerPhone = patch.callerPhone?.trim() || undefined;
  if (patch.patientName !== undefined) c.patientName = patch.patientName?.trim() || undefined;
  if (patch.patientAge !== undefined)
    c.patientAge = patch.patientAge !== null ? Math.max(0, Math.round(Number(patch.patientAge))) : undefined;
  if (patch.patientGender !== undefined) c.patientGender = patch.patientGender || undefined;
  if (patch.chiefComplaint !== undefined)
    c.chiefComplaint = patch.chiefComplaint?.trim() || undefined;
  if (patch.pickupAddress !== undefined) c.pickupAddress = patch.pickupAddress.trim();
  if (patch.destinationAddress !== undefined)
    c.destinationAddress = patch.destinationAddress?.trim() || undefined;
  if (patch.destinationIsFacility !== undefined)
    c.destinationIsFacility = patch.destinationIsFacility;
  if (patch.vehicleId !== undefined) c.vehicleId = patch.vehicleId || undefined;
  if (patch.crewLead !== undefined) c.crewLead = patch.crewLead?.trim() || undefined;
  if (patch.paramedic !== undefined) c.paramedic = patch.paramedic?.trim() || undefined;
  if (patch.driver !== undefined) c.driver = patch.driver?.trim() || undefined;
  if (patch.requestedAt !== undefined) c.requestedAt = patch.requestedAt || c.requestedAt;
  if (patch.dispatchedAt !== undefined) c.dispatchedAt = patch.dispatchedAt || undefined;
  if (patch.arrivedAtPatientAt !== undefined)
    c.arrivedAtPatientAt = patch.arrivedAtPatientAt || undefined;
  if (patch.departedSceneAt !== undefined)
    c.departedSceneAt = patch.departedSceneAt || undefined;
  if (patch.arrivedAtDestinationAt !== undefined)
    c.arrivedAtDestinationAt = patch.arrivedAtDestinationAt || undefined;
  if (patch.completedAt !== undefined) c.completedAt = patch.completedAt || undefined;
  if (patch.cancelledAt !== undefined) c.cancelledAt = patch.cancelledAt || undefined;
  if (patch.distanceKm !== undefined)
    c.distanceKm = Math.max(0, Number(patch.distanceKm));
  if (patch.billingAmount !== undefined)
    c.billingAmount = Math.max(0, Number(patch.billingAmount));
  if (patch.outcome !== undefined) c.outcome = patch.outcome?.trim() || undefined;
  if (patch.cancelReason !== undefined) c.cancelReason = patch.cancelReason?.trim() || undefined;
  if (patch.notes !== undefined) c.notes = patch.notes?.trim() || undefined;

  if (patch.status !== undefined && patch.status !== c.status) {
    c.status = patch.status;
    if (patch.status === "dispatched" && !c.dispatchedAt) c.dispatchedAt = now;
    if (patch.status === "on_scene" && !c.arrivedAtPatientAt) c.arrivedAtPatientAt = now;
    if (patch.status === "transporting" && !c.departedSceneAt) c.departedSceneAt = now;
    if (patch.status === "completed") {
      if (!c.arrivedAtDestinationAt) c.arrivedAtDestinationAt = now;
      if (!c.completedAt) c.completedAt = now;
    }
    if (patch.status === "cancelled" && !c.cancelledAt) c.cancelledAt = now;
  }

  // Vehicle assignment side effects.
  if (prevVehicleId !== c.vehicleId) {
    releaseVehicle(organizationId, prevVehicleId);
  }
  if (c.status === "completed" || c.status === "cancelled") {
    releaseVehicle(organizationId, c.vehicleId);
  } else if (c.status !== "requested" && c.vehicleId) {
    setVehicleOnCall(organizationId, c.vehicleId);
  }
  // If status moved to terminal from active, release (already covered above).
  void prevStatus;

  c.updatedAt = now;
  flushC();
  return c;
}

export function deleteCall(id: string, organizationId: string): boolean {
  const idx = calls.findIndex((x) => x.id === id && x.organizationId === organizationId);
  if (idx < 0) return false;
  const c = calls[idx];
  if (c.status !== "completed" && c.status !== "cancelled") {
    releaseVehicle(organizationId, c.vehicleId);
  }
  calls.splice(idx, 1);
  flushC();
  return true;
}
