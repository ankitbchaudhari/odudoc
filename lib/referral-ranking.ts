// Patient GPS for referrals. Spec v6.2 §54.
//
// When a doctor types a referral, the candidate specialists are
// ranked by:
//   1. specialty match (binary — exact match wins)
//   2. insurance network overlap (binary — patient's TPA empanelled)
//   3. distance from patient's GPS (Haversine, ascending)
//   4. doctor rating (descending tie-breaker)
//
// In production we'd add wait-time signal (fastest available slot)
// and loop-closure rate (specialists who reliably send outcomes back).
// Both data points exist elsewhere in the codebase; this MVP keeps
// the ranking pluggable.

import { distanceKm } from "./ambulance-store";

export interface ReferralCandidate {
  doctorId: string;
  doctorName: string;
  specialty: string;
  lat?: number;
  lng?: number;
  /** Patient's empanelled TPAs that this doctor accepts. */
  acceptedTpaIds?: string[];
  rating?: number;
  /** Closure rate — fraction of referrals where the doctor sent an
   *  outcome note back to the referrer (0..1). */
  loopClosureRate?: number;
}

export interface ReferralContext {
  /** Required specialty match. */
  specialty: string;
  /** Patient's current GPS. Falls back to clinic address geocode. */
  patientLat?: number;
  patientLng?: number;
  /** Patient's empanelled TPA ids (drives the network filter). */
  patientTpaIds?: string[];
}

export interface ReferralRanking extends ReferralCandidate {
  /** Computed distance in km (Infinity if no GPS pair). */
  distanceKm: number;
  /** True when the doctor accepts any of the patient's TPAs. */
  inNetwork: boolean;
  /** Internal score — higher is better. */
  score: number;
}

export function rankReferralCandidates(
  candidates: ReferralCandidate[],
  ctx: ReferralContext,
): ReferralRanking[] {
  const specLower = ctx.specialty.toLowerCase();
  const patientTpa = new Set((ctx.patientTpaIds || []).map((t) => t.toLowerCase()));

  return candidates
    .filter((c) => c.specialty.toLowerCase() === specLower)
    .map<ReferralRanking>((c) => {
      const km =
        c.lat != null && c.lng != null && ctx.patientLat != null && ctx.patientLng != null
          ? distanceKm(ctx.patientLat, ctx.patientLng, c.lat, c.lng)
          : Infinity;
      const inNetwork =
        patientTpa.size > 0 && (c.acceptedTpaIds || []).some((id) => patientTpa.has(id.toLowerCase()));
      // Score:
      //   +100 if in-network (insurance is a hard prefer)
      //   max 50 from distance (50 → very close, 0 → ≥50 km away)
      //   max 25 from rating (5/5 → 25)
      //   max 25 from loop-closure rate (1.0 → 25)
      const distanceScore = Number.isFinite(km) ? Math.max(0, 50 - km) : 0;
      const ratingScore = (c.rating || 0) * 5;
      const closureScore = (c.loopClosureRate || 0) * 25;
      const score = (inNetwork ? 100 : 0) + distanceScore + ratingScore + closureScore;
      return { ...c, distanceKm: km, inNetwork, score };
    })
    .sort((a, b) => b.score - a.score);
}
