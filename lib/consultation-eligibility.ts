// Cross-border consultation eligibility.
//
// Business rule: a doctor licensed and practising in India can only
// consult patients who are also in India. The Indian Medical Council
// licence + telemedicine guidelines (2020) only authorise practice on
// patients within the same jurisdiction, so we hard-gate this rather
// than letting cross-border bookings slip through.
//
// We don't symmetrically restrict other countries today — a doctor in
// the US, UK, AE etc. can take any patient unless their own regulator
// requires otherwise. The shape of this helper supports future
// per-country rules without rewriting callers.

const INDIA_NAMES = new Set([
  "in",
  "ind",
  "india",
  "bharat",
  "republic of india",
]);

/** True if the given free-text or alpha-2 country represents India.
 *  Doctor.country is stored as "India" (full name) historically;
 *  User.country is stored as "IN" (alpha-2) going forward. We accept
 *  either so the helper works during the rollout. */
export function isIndia(country: string | undefined | null): boolean {
  if (!country) return false;
  return INDIA_NAMES.has(country.trim().toLowerCase());
}

/** Heuristic: does this phone number have an Indian dial code?
 *  Used as a fallback when a patient signed up before User.country
 *  was a thing — their phone is the next-best signal. */
export function hasIndianDialCode(phone: string | undefined | null): boolean {
  if (!phone) return false;
  const digits = phone.replace(/[^\d+]/g, "");
  return /^\+?91\d{10}$/.test(digits) || /^91\d{10}$/.test(digits);
}

export interface EligibilityInput {
  doctorCountry?: string;
  patientCountry?: string;
  patientPhone?: string;
}

export type EligibilityResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function checkConsultationEligibility(
  input: EligibilityInput,
): EligibilityResult {
  if (isIndia(input.doctorCountry)) {
    if (
      isIndia(input.patientCountry) ||
      hasIndianDialCode(input.patientPhone)
    ) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason:
        "This doctor is licensed in India and can only consult patients located in India. Please pick a doctor licensed in your country.",
    };
  }
  return { allowed: true };
}
