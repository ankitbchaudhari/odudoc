// Home healthcare service catalogue + bookings. Spec v6.0 §26.
//
// Three service families:
//   - dialysis        — at-home haemodialysis (rare; PD common).
//   - skilled_nursing — wound care, IV meds, post-op care, 4h/8h/24h
//                       shifts.
//   - physiotherapy   — per-session with progress notes.
//
// Live provider tracking ("on the way", "20 min ETA") in production
// uses the same realtime fanout as the ambulance module. MVP here
// records the booking state machine and the visit history; the
// realtime channel is stubbed (the API responds with a static ETA
// derived from distanceKm() on the patient/provider lat/lng).

import { bindPersistentArray } from "./persistent-array";

export type HomeServiceKind = "dialysis" | "skilled_nursing" | "physiotherapy";

export interface HomeService {
  id: string;
  organizationId: string;
  kind: HomeServiceKind;
  /** Display label — "8-hour skilled nursing", "Physio assessment". */
  name: string;
  description: string;
  /** Price in USD; localised at render. */
  priceUsd: number;
  /** Whether the service is part of a subscription package. */
  packageOf?: { weeks: number; sessions: number; priceUsd: number };
  active: boolean;
}

export type VisitStatus =
  | "requested"
  | "scheduled"
  | "en_route"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface HomeVisit {
  id: string;
  patientEmail: string;
  patientName: string;
  serviceId: string;
  organizationId: string;
  /** Provider (nurse / physio) assigned. */
  providerName?: string;
  /** Patient location for the visit. */
  lat?: number;
  lng?: number;
  address: string;
  scheduledFor: string;
  status: VisitStatus;
  /** Provider's progress note (added on visit completion). */
  progressNote?: string;
  createdAt: string;
  updatedAt: string;
}

const services: HomeService[] = [];
const visits: HomeVisit[] = [];

const sHy = bindPersistentArray<HomeService>("home_services", services, () => []);
const vHy = bindPersistentArray<HomeVisit>("home_visits", visits, () => []);
await sHy.hydrate();
await vHy.hydrate();

// Seed catalogue if the store is empty so /dashboard surfaces have
// something to render on a fresh deploy.
if (services.length === 0) {
  services.push(
    { id: "hs-dialysis", organizationId: "default", kind: "dialysis", name: "Peritoneal dialysis — assisted session", description: "Trained technician handles the cycle. 1 session, supplies included.", priceUsd: 90, active: true },
    { id: "hs-nursing-4h", organizationId: "default", kind: "skilled_nursing", name: "Skilled nursing — 4 hour shift", description: "Post-op wound dressing, IV meds, vitals charting.", priceUsd: 35, active: true },
    { id: "hs-nursing-8h", organizationId: "default", kind: "skilled_nursing", name: "Skilled nursing — 8 hour shift", description: "Day or night shift coverage with handover SBAR.", priceUsd: 60,
      packageOf: { weeks: 4, sessions: 28, priceUsd: 1500 }, active: true },
    { id: "hs-physio-assess", organizationId: "default", kind: "physiotherapy", name: "Physio assessment + plan", description: "Initial assessment, ROM, strength, goals, 12-week plan.", priceUsd: 45, active: true },
    { id: "hs-physio-session", organizationId: "default", kind: "physiotherapy", name: "Physio session (45 min)", description: "Plan-driven session with progress note.", priceUsd: 30,
      packageOf: { weeks: 6, sessions: 12, priceUsd: 300 }, active: true },
  );
  sHy.flush();
}

function id(p: string): string {
  return `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function listServices(opts: { kind?: HomeServiceKind } = {}): HomeService[] {
  let list = services.filter((s) => s.active);
  if (opts.kind) list = list.filter((s) => s.kind === opts.kind);
  return list;
}

export function getService(serviceId: string): HomeService | null {
  return services.find((s) => s.id === serviceId) || null;
}

export function createVisit(input: Omit<HomeVisit, "id" | "status" | "createdAt" | "updatedAt">): HomeVisit {
  const at = new Date().toISOString();
  const v: HomeVisit = { id: id("hv"), status: "requested", createdAt: at, updatedAt: at, ...input };
  visits.unshift(v);
  vHy.flush();
  return v;
}

export function listVisits(filter: { patientEmail?: string; organizationId?: string } = {}): HomeVisit[] {
  let list = [...visits];
  if (filter.patientEmail) list = list.filter((v) => v.patientEmail.toLowerCase() === filter.patientEmail!.toLowerCase());
  if (filter.organizationId) list = list.filter((v) => v.organizationId === filter.organizationId);
  return list;
}

export function updateVisitStatus(visitId: string, status: VisitStatus, patch: Partial<HomeVisit> = {}): HomeVisit | null {
  const v = visits.find((x) => x.id === visitId);
  if (!v) return null;
  Object.assign(v, patch);
  v.status = status;
  v.updatedAt = new Date().toISOString();
  vHy.flush();
  return v;
}
