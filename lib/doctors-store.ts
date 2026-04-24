// Doctors store — Postgres-backed via bindPersistentArray.
//
// Admin-facing record for doctors on the OduDoc platform. Tracks commission
// cut, public rating, total completed consultations, and a milestone-based
// tier (Bronze → Silver → Gold → Platinum).

import { bindPersistentArray } from "./persistent-array";

export type DoctorTier = "Bronze" | "Silver" | "Gold" | "Platinum";
export type DoctorStatus = "Active" | "Inactive";

export interface DoctorTierDefinition {
  tier: DoctorTier;
  threshold: number;
  color: string;
  defaultCommission: number;
  benefits: string[];
}

export const DOCTOR_TIERS: DoctorTierDefinition[] = [
  {
    tier: "Bronze",
    threshold: 0,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    defaultCommission: 30,
    benefits: [
      "Listed in search results",
      "Standard in-app messaging",
      "30% platform fee",
    ],
  },
  {
    tier: "Silver",
    threshold: 500,
    color: "bg-gray-100 text-gray-700 border-gray-200",
    defaultCommission: 25,
    benefits: [
      "Silver badge on public profile",
      "Priority in search results",
      "Lower 25% platform fee",
      "$50 one-time bonus",
    ],
  },
  {
    tier: "Gold",
    threshold: 1000,
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    defaultCommission: 20,
    benefits: [
      "Gold badge on public profile",
      "Featured on homepage rotation",
      "20% platform fee",
      "$150 one-time bonus",
      "Dedicated Zendesk channel",
    ],
  },
  {
    tier: "Platinum",
    threshold: 1500,
    color: "bg-purple-100 text-purple-700 border-purple-200",
    defaultCommission: 15,
    benefits: [
      "Platinum badge on public profile",
      "Permanent top-of-search placement",
      "Lowest 15% platform fee",
      "$300 one-time bonus",
      "Personal account manager",
      "Early access to new features",
    ],
  },
];

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  status: DoctorStatus;
  commission: number;
  rating: number;
  consultationCount: number;
  tier: DoctorTier;
  joinedAt: string;
  updatedAt: string;
  imageUrl?: string;
  bio?: string;
  // Public profile fields — optional so existing rows stay valid.
  qualifications?: string;
  experience?: number;
  city?: string;
  location?: string;
  fee?: number;
  gender?: "Male" | "Female";
  country?: string;
  services?: string[];
  timeSlots?: string[];
  // "I'm online now" — a self-service flag the doctor flips on their
  // dashboard so patients can surface them for instant consults. The
  // `until` field acts as a TTL; after it passes the flag is ignored
  // even if the boolean is still true (useful when a doctor closes
  // their laptop without untoggling).
  instantAvailable?: boolean;
  instantAvailableUntil?: string; // ISO timestamp
}

export function isInstantlyAvailable(d: Doctor, at: Date = new Date()): boolean {
  if (!d.instantAvailable) return false;
  if (!d.instantAvailableUntil) return false;
  return new Date(d.instantAvailableUntil).getTime() > at.getTime();
}

/** Flip the "available now" flag on a doctor record. `minutes` controls
 *  the TTL; pass 0 to go offline immediately. Returns the updated
 *  doctor or null if not found. */
export function setInstantAvailable(
  email: string,
  minutes: number,
): Doctor | null {
  const d = doctors.find((x) => x.email.toLowerCase() === email.toLowerCase());
  if (!d) return null;
  if (minutes <= 0) {
    d.instantAvailable = false;
    d.instantAvailableUntil = undefined;
  } else {
    d.instantAvailable = true;
    d.instantAvailableUntil = new Date(Date.now() + minutes * 60_000).toISOString();
  }
  d.updatedAt = now();
  flush();
  return d;
}

export const DOCTOR_SPECIALTIES = [
  "General Physician",
  "Dermatologist",
  "Gynecologist",
  "Pediatrician",
  "Dentist",
  "Orthopedist",
  "Psychiatrist",
  "Cardiologist",
  "Neurologist",
  "Endocrinologist",
  "ENT",
  "Ophthalmologist",
];

const now = () => new Date().toISOString();

function tierFor(count: number): DoctorTier {
  let current: DoctorTier = "Bronze";
  for (const t of DOCTOR_TIERS) {
    if (count >= t.threshold) current = t.tier;
  }
  return current;
}

export function tierDefinition(tier: DoctorTier): DoctorTierDefinition {
  return DOCTOR_TIERS.find((t) => t.tier === tier) ?? DOCTOR_TIERS[0];
}

export function progressTo(
  count: number
): { nextTier: DoctorTier | null; remaining: number; pct: number } {
  for (const t of DOCTOR_TIERS) {
    if (count < t.threshold) {
      const prev = DOCTOR_TIERS[DOCTOR_TIERS.indexOf(t) - 1];
      const base = prev?.threshold ?? 0;
      const span = t.threshold - base;
      const progress = count - base;
      return {
        nextTier: t.tier,
        remaining: t.threshold - count,
        pct: span > 0 ? Math.round((progress / span) * 100) : 0,
      };
    }
  }
  return { nextTier: null, remaining: 0, pct: 100 };
}

function seedRow(partial: {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  status: DoctorStatus;
  consultationCount: number;
  rating: number;
}): Doctor {
  const t = tierFor(partial.consultationCount);
  return {
    ...partial,
    tier: t,
    commission: tierDefinition(t).defaultCommission,
    joinedAt: now(),
    updatedAt: now(),
  };
}

const doctors: Doctor[] = [];
// No seed — the store starts empty. All doctors come from admin panel.
const { hydrate, reload, flush } = bindPersistentArray<Doctor>(
  "doctors",
  doctors,
  () => []
);
await hydrate();

// One-time cleanup: remove the 8 demo doctors that were previously seeded
// (both legacy d1..d8 IDs and the slug IDs). Admin-added doctors (any other
// ID) are preserved. Idempotent — once they're gone it's a no-op.
(function removeDemoSeed() {
  const legacy: Record<string, true> = {
    d1: true, d2: true, d3: true, d4: true, d5: true, d6: true, d7: true, d8: true,
    "dr-sarah-johnson": true,
    "dr-michael-chen": true,
    "dr-priya-patel": true,
    "dr-james-wilson": true,
    "dr-anita-sharma": true,
    "dr-robert-kumar": true,
    "dr-emily-zhang": true,
    "dr-david-brown": true,
  };
  let dirty = false;
  for (let i = doctors.length - 1; i >= 0; i--) {
    if (legacy[doctors[i].id]) {
      doctors.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

/** Force re-read from Postgres — use on public read paths to pick up writes
 *  made by other Lambdas. */
export async function reloadDoctors(): Promise<void> {
  await reload();
}

export function listDoctors(opts: {
  search?: string;
  specialty?: string;
  status?: DoctorStatus | "All";
  tier?: DoctorTier | "All";
} = {}): Doctor[] {
  let list = [...doctors];
  if (opts.specialty && opts.specialty !== "All") {
    list = list.filter((d) => d.specialty === opts.specialty);
  }
  if (opts.status && opts.status !== "All") {
    list = list.filter((d) => d.status === opts.status);
  }
  if (opts.tier && opts.tier !== "All") {
    list = list.filter((d) => d.tier === opts.tier);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.email.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q)
    );
  }
  return list;
}

export function getDoctorById(id: string): Doctor | null {
  return doctors.find((d) => d.id === id) || null;
}

export function findDoctorByEmail(email: string): Doctor | null {
  const q = email.trim().toLowerCase();
  return doctors.find((d) => d.email.toLowerCase() === q) || null;
}

export interface DoctorInput {
  name: string;
  specialty: string;
  email: string;
  phone?: string;
  status?: DoctorStatus;
  commission?: number;
  rating?: number;
  consultationCount?: number;
  bio?: string;
  imageUrl?: string;
  qualifications?: string;
  experience?: number;
  city?: string;
  location?: string;
  fee?: number;
  gender?: "Male" | "Female";
  country?: string;
  services?: string[];
  timeSlots?: string[];
}

function clampNumber(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function createDoctor(input: DoctorInput): Doctor {
  const consultationCount = Math.max(0, Math.floor(input.consultationCount || 0));
  const tier = tierFor(consultationCount);
  const d: Doctor = {
    id: `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    specialty: input.specialty,
    email: input.email.trim().toLowerCase(),
    phone: (input.phone || "").trim(),
    status: input.status || "Active",
    commission:
      input.commission !== undefined
        ? clampNumber(input.commission, 0, 100)
        : tierDefinition(tier).defaultCommission,
    rating: clampNumber(input.rating ?? 5, 0, 5),
    consultationCount,
    tier,
    joinedAt: now(),
    updatedAt: now(),
    bio: input.bio,
    imageUrl: input.imageUrl,
    qualifications: input.qualifications,
    experience: input.experience,
    city: input.city,
    location: input.location,
    fee: input.fee,
    gender: input.gender,
    country: input.country,
    services: input.services,
    timeSlots: input.timeSlots,
  };
  doctors.unshift(d);
  flush();
  return d;
}

export function updateDoctor(
  id: string,
  patch: Partial<DoctorInput>
): Doctor | null {
  const d = doctors.find((x) => x.id === id);
  if (!d) return null;
  if (patch.name !== undefined) d.name = patch.name.trim();
  if (patch.specialty !== undefined) d.specialty = patch.specialty;
  if (patch.email !== undefined) d.email = patch.email.trim().toLowerCase();
  if (patch.phone !== undefined) d.phone = patch.phone.trim();
  if (patch.status !== undefined) d.status = patch.status;
  if (patch.commission !== undefined)
    d.commission = clampNumber(Number(patch.commission), 0, 100);
  if (patch.rating !== undefined)
    d.rating = clampNumber(Number(patch.rating), 0, 5);
  if (patch.consultationCount !== undefined) {
    d.consultationCount = Math.max(0, Math.floor(Number(patch.consultationCount)));
    d.tier = tierFor(d.consultationCount);
  }
  if (patch.bio !== undefined) d.bio = patch.bio;
  if (patch.imageUrl !== undefined) d.imageUrl = patch.imageUrl;
  if (patch.qualifications !== undefined) d.qualifications = patch.qualifications;
  if (patch.experience !== undefined) d.experience = Math.max(0, Math.floor(Number(patch.experience)));
  if (patch.city !== undefined) d.city = patch.city;
  if (patch.location !== undefined) d.location = patch.location;
  if (patch.fee !== undefined) d.fee = Math.max(0, Number(patch.fee));
  if (patch.gender !== undefined) d.gender = patch.gender;
  if (patch.country !== undefined) d.country = patch.country;
  if (patch.services !== undefined) d.services = patch.services;
  if (patch.timeSlots !== undefined) d.timeSlots = patch.timeSlots;
  d.updatedAt = now();
  flush();
  return d;
}

export function deleteDoctor(id: string): boolean {
  const idx = doctors.findIndex((d) => d.id === id);
  if (idx < 0) return false;
  doctors.splice(idx, 1);
  flush();
  return true;
}

export function recordConsultation(
  id: string
): { doctor: Doctor; promoted: boolean; newTier?: DoctorTier } | null {
  const d = doctors.find((x) => x.id === id);
  if (!d) return null;
  const prevTier = d.tier;
  d.consultationCount += 1;
  d.tier = tierFor(d.consultationCount);
  d.updatedAt = now();
  flush();
  const promoted = prevTier !== d.tier;
  return { doctor: d, promoted, newTier: promoted ? d.tier : undefined };
}
