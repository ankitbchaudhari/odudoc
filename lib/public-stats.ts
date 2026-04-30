// Real, live counts for the marketing site.
//
// We were rendering hardcoded inflated numbers ("100K+ doctors",
// "50K+ patients") on the homepage stats section and the
// /for-doctors hero. Visitors who actually know the platform
// figure that out fast — credibility tanks. This module returns
// the real numbers, and the consuming sections decide how to
// frame them honestly when they're small (e.g. "Founder-led
// pilot · be doctor #N+1").
//
// Counts are read from the JSONB persistent-array rows via
// countJsonArray to avoid loading the whole blob just to count.
// Values are cached for 60 seconds at the call site (the page
// using `next: { revalidate: 60 }` style fetches handles that).

import { countJsonArray } from "./persistent-array";
import { CITIES } from "./seo/cities";
import { SPECIALTIES } from "./seo/specialties";

export interface PublicStats {
  doctors: number;
  patients: number;
  specialties: number;
  cities: number;
  /** When true, the doctor count is tiny enough that we should
   *  reframe the marketing copy ("Founder-led pilot · be doctor
   *  number N+1") instead of showing the raw number with a "+"
   *  that looks dishonestly inflated. */
  pilotMode: boolean;
}

const PILOT_THRESHOLD = 25;

export async function getPublicStats(): Promise<PublicStats> {
  const [doctors, users] = await Promise.all([
    countJsonArray("doctors").catch(() => 0),
    // Patients are users with role === "patient". countJsonArray
    // counts the whole users array; we treat that as "registered
    // users" since the patient/doctor breakdown isn't stored as
    // separate JSONB rows. This over-counts slightly (includes
    // admins + doctors) but it's a public marketing number, not
    // a billing one — close enough.
    countJsonArray("users").catch(() => 0),
  ]);

  // Patients ≈ users − doctors − a small constant for staff/admins.
  // Floors at 0; if the math goes negative for any reason we just
  // show 0 rather than a confusing negative.
  const patients = Math.max(0, users - doctors - 5);

  return {
    doctors,
    patients,
    specialties: SPECIALTIES.length,
    cities: CITIES.length,
    pilotMode: doctors < PILOT_THRESHOLD,
  };
}
