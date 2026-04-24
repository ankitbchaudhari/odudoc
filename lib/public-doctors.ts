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
  };
}

/** Public list — admin store only. */
export function getPublicDoctors(): PublicDoctor[] {
  return listAdminDoctors().map(toPublic);
}

/** Re-read the admin store from Postgres before returning — use on public
 *  read paths so new doctors added by admin show up immediately across Lambdas. */
export async function getPublicDoctorsFresh(): Promise<PublicDoctor[]> {
  await reloadDoctors();
  return getPublicDoctors();
}

export function getPublicDoctorById(id: string): PublicDoctor | null {
  return getPublicDoctors().find((d) => d.id === id) || null;
}

export async function getPublicDoctorByIdFresh(id: string): Promise<PublicDoctor | null> {
  await reloadDoctors();
  return getPublicDoctorById(id);
}
