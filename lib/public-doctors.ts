// Public doctor view — admin store is the ONLY source of truth. Every doctor
// on the public site comes from /admin/doctors. Fields the admin didn't fill
// get sensible per-doctor defaults; nothing is merged from static seed data.
//
// Server-only: imports from doctors-store which uses top-level await.

import {
  listDoctors as listAdminDoctors,
  reloadDoctors,
  isInstantlyAvailable,
  type Doctor as AdminDoctor,
} from "@/lib/doctors-store";
import type { Doctor as PublicDoctor } from "@/lib/data";

export type { PublicDoctor };

function toPublic(admin: AdminDoctor): PublicDoctor {
  const initials = admin.name
    .replace(/^Dr\.?\s*/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return {
    id: admin.id,
    name: admin.name,
    specialty: admin.specialty,
    qualifications: admin.qualifications || "",
    experience: admin.experience ?? 0,
    location: admin.location || "",
    city: admin.city || "",
    rating: admin.rating,
    reviewCount: admin.consultationCount,
    fee: admin.fee ?? 0,
    available: admin.status === "Active",
    gender: admin.gender || "Male",
    about: admin.bio || "",
    services: admin.services && admin.services.length ? admin.services : [],
    timeSlots:
      admin.timeSlots && admin.timeSlots.length
        ? admin.timeSlots
        : ["9:00 AM", "10:00 AM", "11:00 AM", "2:00 PM", "3:00 PM", "4:00 PM"],
    country: admin.country || "",
    imageColor: "bg-primary-500",
    initials: initials || "DR",
    photoUrl: admin.imageUrl,
    instantAvailable: isInstantlyAvailable(admin),
    verified: admin.verified === true,
  };
}

/** Public list — admin store only. */
export function getPublicDoctors(): PublicDoctor[] {
  return listAdminDoctors().map(toPublic);
}

/** Re-read the admin store from Postgres before returning — use on public
 *  read paths so new doctors added by admin show up immediately across
 *  Lambdas. Safe-by-default: a Postgres outage / auth failure no longer
 *  bubbles up and crashes the whole homepage tree. We log and fall back
 *  to whatever's in the in-memory doctors array (possibly empty on a
 *  cold start, but better than a 500 page). */
export async function getPublicDoctorsFresh(): Promise<PublicDoctor[]> {
  try {
    await reloadDoctors();
  } catch (err) {
    const { log } = await import("./log");
    log.error("public_doctors.reload_failed", err);
  }
  try {
    return getPublicDoctors();
  } catch (err) {
    const { log } = await import("./log");
    log.error("public_doctors.list_failed", err);
    return [];
  }
}

/** Friendly URL slug derived from name + last 4 chars of id for
 *  uniqueness. "Dr. Ankit Chaudhari" id="d-mouf6key-zg2u" →
 *  "dr-ankit-chaudhari-zg2u". Two doctors with identical names can't
 *  collide because the id suffix is randomised at create time. */
export function friendlyDoctorSlug(name: string, id: string): string {
  const namePart = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // Take the trailing token of the id ("zg2u" from "d-mouf6key-zg2u").
  const idSuffix = id.split("-").pop() || id.slice(-4);
  return namePart ? `${namePart}-${idSuffix}` : id;
}

export function getPublicDoctorById(id: string): PublicDoctor | null {
  // Try the canonical id first (legacy links), then fall back to a
  // friendly-slug match so "/doctors/dr-ankit-chaudhari-zg2u" resolves.
  const doctors = getPublicDoctors();
  const direct = doctors.find((d) => d.id === id);
  if (direct) return direct;
  // Match by slug — case-insensitive against either the id suffix or
  // a fully-formed friendly slug.
  const lower = id.toLowerCase();
  return doctors.find((d) => friendlyDoctorSlug(d.name, d.id) === lower) || null;
}

export async function getPublicDoctorByIdFresh(id: string): Promise<PublicDoctor | null> {
  await reloadDoctors();
  return getPublicDoctorById(id);
}
