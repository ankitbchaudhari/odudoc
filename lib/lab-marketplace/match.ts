// Match a lab order (list of test codes) to nearby labs.
//
// Returns one offer per lab that can fulfil the order, ranked by:
//   1. Coverage — how many tests does this lab carry
//   2. Total price after discount
//   3. Reporting time (lower is better)
//   4. Same-pincode bonus when patient pincode is supplied
//   5. NABL accreditation tiebreaker

import { findTestsByCode, type LabTestEntry } from "./lab-store";

export interface OrderTest {
  testCode: string;
  /** Optional display name from the doctor's order. Used for the
   *  fallback "test not stocked at this lab" line. */
  displayName?: string;
}

export interface MatchedTest extends OrderTest {
  available: boolean;
  pricedRupees?: number;
  mrpRupees?: number;
  reportingHours?: number;
  fastingHours?: number;
  testEntryId?: string;
}

export interface LabOffer {
  labId: string;
  labName: string;
  city?: string;
  pincode?: string;
  tests: MatchedTest[];
  coveragePct: number;
  totalRupees: number;
  totalMrpRupees: number;
  savingsRupees: number;
  /** Worst reporting-hours across stocked tests (slowest gates the
   *  package). */
  reportingHours: number;
  /** Worst fasting requirement so the patient sees one consolidated
   *  pre-test instruction. */
  fastingHoursMax?: number;
  homeCollection: boolean;
  homeCollectionFeeRupees: number;
  nablAccredited: boolean;
  effectiveDiscountPct: number;
  score: number;
  samePincode: boolean;
}

export interface MatchInput {
  tests: OrderTest[];
  patientPincode?: string;
  /** When true, surface partial-coverage labs at the bottom too. */
  includePartial?: boolean;
}

export function matchLabOrder(input: MatchInput): LabOffer[] {
  const offersByLab = new Map<string, LabOffer>();

  for (let i = 0; i < input.tests.length; i++) {
    const t = input.tests[i];
    const candidates = findTestsByCode(t.testCode);
    // Group by lab, prefer cheapest option per lab.
    const byLab = new Map<string, LabTestEntry>();
    for (const c of candidates) {
      const existing = byLab.get(c.labId);
      if (!existing) { byLab.set(c.labId, c); continue; }
      const existingPrice = existing.mrpRupees * (1 - existing.discountPct / 100);
      const cPrice = c.mrpRupees * (1 - c.discountPct / 100);
      if (cPrice < existingPrice) byLab.set(c.labId, c);
    }
    for (const [labId, entry] of byLab) {
      let offer = offersByLab.get(labId);
      if (!offer) {
        offer = {
          labId,
          labName: entry.labName,
          city: entry.city,
          pincode: entry.pincode,
          tests: input.tests.map((x) => ({ ...x, available: false })),
          coveragePct: 0,
          totalRupees: 0,
          totalMrpRupees: 0,
          savingsRupees: 0,
          reportingHours: 0,
          homeCollection: true,
          homeCollectionFeeRupees: entry.homeCollectionFeeRupees ?? 99,
          nablAccredited: entry.nablAccredited === true,
          effectiveDiscountPct: 0,
          score: 0,
          samePincode: false,
        };
        offersByLab.set(labId, offer);
      }
      const priced = entry.mrpRupees * (1 - entry.discountPct / 100);
      offer.tests[i] = {
        ...input.tests[i],
        available: true,
        pricedRupees: Math.round(priced),
        mrpRupees: entry.mrpRupees,
        reportingHours: entry.reportingHours,
        fastingHours: entry.fastingHours,
        testEntryId: entry.id,
      };
      offer.totalRupees += priced;
      offer.totalMrpRupees += entry.mrpRupees;
      offer.reportingHours = Math.max(offer.reportingHours, entry.reportingHours);
      offer.fastingHoursMax = Math.max(offer.fastingHoursMax || 0, entry.fastingHours || 0);
      // Home collection only if EVERY stocked test supports it.
      if (!entry.homeCollection) offer.homeCollection = false;
      // NABL conservative — drop the badge if any stocked test lacks it.
      if (entry.nablAccredited === false) offer.nablAccredited = false;
    }
  }

  const totalTests = input.tests.length || 1;
  const offers: LabOffer[] = [];
  for (const offer of offersByLab.values()) {
    const stocked = offer.tests.filter((t) => t.available).length;
    offer.coveragePct = Math.round((stocked / totalTests) * 100);
    offer.savingsRupees = Math.round(offer.totalMrpRupees - offer.totalRupees);
    offer.totalRupees = Math.round(offer.totalRupees);
    offer.totalMrpRupees = Math.round(offer.totalMrpRupees);
    offer.effectiveDiscountPct =
      offer.totalMrpRupees > 0 ? Math.round((offer.savingsRupees / offer.totalMrpRupees) * 100) : 0;
    if (input.patientPincode && offer.pincode === input.patientPincode) {
      offer.samePincode = true;
    }
    if (!input.includePartial && offer.coveragePct < 100) continue;
    let score = offer.coveragePct * 100;
    score -= Math.min(80, offer.totalRupees / 80);
    score -= offer.reportingHours * 0.5;
    if (offer.samePincode) score += 30;
    if (offer.nablAccredited) score += 10;
    if (offer.homeCollection) score += 5;
    offer.score = Math.round(score);
    offers.push(offer);
  }
  offers.sort((a, b) => b.score - a.score);
  return offers;
}
