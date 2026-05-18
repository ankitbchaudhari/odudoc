// Ambulance dispatch — fleet + jobs + nearest-vehicle routing.
// Spec v6.0 §25.
//
// Production version uses PostGIS for spatial indexes and OSRM for
// real road routing. This MVP keeps the data model + workflow + API
// surface stable and computes nearest-vehicle with a Haversine
// distance on lat/lng (good enough up to ~50 km, off by 10-20% vs
// road distance). Swap the distanceKm() implementation for an OSRM
// call in production and the rest of the code is unchanged.

import { bindPersistentArray } from "./persistent-array";

export type AmbulanceClass = "BLS" | "ALS" | "ICU" | "MORTUARY";

export interface AmbulanceVehicle {
  id: string;
  organizationId: string;
  /** Plate number / vehicle id. */
  reg: string;
  class: AmbulanceClass;
  /** Crew on duty. Names are denormalised for the dispatch UI. */
  crew: string[];
  /** Latest reported coordinates. */
  lat: number;
  lng: number;
  /** Status — drives whether dispatcher offers this unit. */
  status: "available" | "en_route" | "on_scene" | "transporting" | "out_of_service";
  lastPingAt: string;
}

export interface AmbulanceJob {
  id: string;
  organizationId: string;
  /** Caller details. */
  callerName: string;
  callerPhone: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  /** Receiving hospital (if known). */
  destinationHospitalId?: string;
  /** Vehicle dispatched (if any). */
  vehicleId?: string;
  /** Severity — drives whether ALS / ICU is required. */
  severity: "stable" | "urgent" | "critical";
  /** Lifecycle. */
  status: "dispatched" | "en_route" | "on_scene" | "transporting" | "delivered" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const vehicles: AmbulanceVehicle[] = [];
const jobs: AmbulanceJob[] = [];

const vHy = bindPersistentArray<AmbulanceVehicle>("amb_vehicles", vehicles, () => []);
const jHy = bindPersistentArray<AmbulanceJob>("amb_jobs", jobs, () => []);
await vHy.hydrate();
await jHy.hydrate();

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Haversine distance in km between two lat/lng pairs.
// Production: swap for an OSRM /route query (road distance + ETA).
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function registerVehicle(input: Omit<AmbulanceVehicle, "id" | "lastPingAt">): AmbulanceVehicle {
  const v: AmbulanceVehicle = { id: id("amb"), lastPingAt: new Date().toISOString(), ...input };
  vehicles.push(v);
  vHy.flush();
  return v;
}

export function pingVehicle(vehicleId: string, lat: number, lng: number, status?: AmbulanceVehicle["status"]): AmbulanceVehicle | null {
  const v = vehicles.find((x) => x.id === vehicleId);
  if (!v) return null;
  v.lat = lat;
  v.lng = lng;
  if (status) v.status = status;
  v.lastPingAt = new Date().toISOString();
  vHy.flush();
  return v;
}

export function listVehicles(orgId?: string): AmbulanceVehicle[] {
  return orgId ? vehicles.filter((v) => v.organizationId === orgId) : [...vehicles];
}

// ── Dispatch: pick the nearest available unit that meets the
//    severity requirement. Critical → ICU/ALS preferred over BLS.
export function recommendVehicle(input: {
  organizationId: string;
  pickupLat: number;
  pickupLng: number;
  severity: AmbulanceJob["severity"];
}): { vehicle: AmbulanceVehicle; km: number } | null {
  const preferred: AmbulanceClass[] =
    input.severity === "critical" ? ["ICU", "ALS"] : input.severity === "urgent" ? ["ALS", "BLS"] : ["BLS", "ALS"];
  const pool = vehicles
    .filter((v) => v.organizationId === input.organizationId && v.status === "available")
    .map((v) => ({ v, km: distanceKm(input.pickupLat, input.pickupLng, v.lat, v.lng) }))
    .sort((a, b) => {
      // Sort by class preference then distance.
      const aRank = preferred.indexOf(a.v.class);
      const bRank = preferred.indexOf(b.v.class);
      if (aRank !== bRank) return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank);
      return a.km - b.km;
    });
  if (pool.length === 0) return null;
  return { vehicle: pool[0].v, km: pool[0].km };
}

export function createJob(input: Omit<AmbulanceJob, "id" | "status" | "createdAt" | "updatedAt">): AmbulanceJob {
  const at = new Date().toISOString();
  const j: AmbulanceJob = { id: id("amj"), status: "dispatched", createdAt: at, updatedAt: at, ...input };
  jobs.unshift(j);
  jHy.flush();
  if (input.vehicleId) pingVehicle(input.vehicleId, input.pickupLat, input.pickupLng, "en_route");
  return j;
}

export function updateJobStatus(jobId: string, status: AmbulanceJob["status"]): AmbulanceJob | null {
  const j = jobs.find((x) => x.id === jobId);
  if (!j) return null;
  j.status = status;
  j.updatedAt = new Date().toISOString();
  jHy.flush();
  if (j.vehicleId && status === "delivered") pingVehicle(j.vehicleId, 0, 0, "available");
  return j;
}

export function listJobs(orgId?: string, opts: { activeOnly?: boolean } = {}): AmbulanceJob[] {
  let list = orgId ? jobs.filter((j) => j.organizationId === orgId) : [...jobs];
  if (opts.activeOnly) list = list.filter((j) => j.status !== "delivered" && j.status !== "cancelled");
  return list;
}
