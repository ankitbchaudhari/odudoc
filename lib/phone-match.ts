// Phone-number matching for the patient-claim flow.
//
// Reception staff often type the patient's local mobile number
// ("9876543210") while the patient later signs up with the full
// international form ("+91 98765 43210"). A naive
// digits-only comparison would miss those matches and leave clinic
// visits unclaimed. This helper builds a canonical key that absorbs
// the common country-code variants we see in OduDoc's primary markets.

const COMMON_CC = [
  { cc: "91", localDigits: 10 },  // India
  { cc: "971", localDigits: 9 },  // UAE
  { cc: "966", localDigits: 9 },  // Saudi Arabia
  { cc: "974", localDigits: 8 },  // Qatar
  { cc: "65",  localDigits: 8 },  // Singapore
  { cc: "44",  localDigits: 10 }, // UK
  { cc: "1",   localDigits: 10 }, // US/CA
  { cc: "61",  localDigits: 9 },  // Australia
];

/** Strip everything to digits, drop leading zeros, then if the result
 *  starts with a known country code and the trailing length matches
 *  that country's local-number length, return the trailing local part.
 *  Otherwise return the digits-only form. */
export function phoneKey(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "").replace(/^0+/, "");
  if (!digits) return "";
  for (const { cc, localDigits } of COMMON_CC) {
    if (digits.length === cc.length + localDigits && digits.startsWith(cc)) {
      return digits.slice(cc.length);
    }
  }
  return digits;
}

/** Two phone strings match if they normalize to the same key. */
export function phonesMatch(a: string, b: string): boolean {
  const ka = phoneKey(a);
  const kb = phoneKey(b);
  return ka !== "" && ka === kb;
}
