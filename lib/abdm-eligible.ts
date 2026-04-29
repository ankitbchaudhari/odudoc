// ABDM eligibility helpers.
//
// ABDM (Ayushman Bharat Digital Mission) is the Government of India's
// digital health stack. Every feature it exposes — ABHA health ID,
// HPR doctor verification, HFR clinic registration, HIP/HIU consent
// flows — is by definition India-only. We hide every ABDM surface
// from non-Indian users so a doctor in Lagos or São Paulo doesn't
// see "Verify with HPR" buttons that don't apply to them.
//
// All gating runs through these two predicates so the rule lives in
// one place.

import { isIndia } from "./consultation-eligibility";

export function isAbdmEligibleUser(input: {
  country?: string;
  phone?: string;
}): boolean {
  return isIndia(input.country);
}

export function isAbdmEligibleDoctor(input: {
  country?: string;
}): boolean {
  return isIndia(input.country);
}
