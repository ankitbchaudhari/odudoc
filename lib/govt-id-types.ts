// Country → accepted government ID types.
//
// Drives the second-level dropdown in the patient-search widget when
// the operator picks "Government ID" as the search type: first the
// country, then the kind of ID, then the number itself.
//
// Catalogue is intentionally curated — common, document-able ID types
// per country, not every regional permit ever issued. Add to the list
// rather than reshaping; new entries are append-only.

export interface GovtIdType {
  /** Stable id used in the store (`Patient.governmentIds[].type`). */
  id: string;
  /** Human label shown in the dropdown. */
  label: string;
  /** Regex the raw, separator-stripped input must match. Used as a
   *  client-side hint AND a server-side validation gate. Optional —
   *  leave undefined for IDs with no canonical shape. */
  pattern?: RegExp;
  /** Placeholder for the input field. */
  placeholder?: string;
}

export interface CountryGovtIds {
  country: string;       // ISO-2, uppercase
  name: string;          // Display name
  ids: GovtIdType[];
}

// Free-text passport is recognised everywhere — emit it as a common
// trailing option per country.
const PASSPORT: GovtIdType = {
  id: "passport",
  label: "Passport",
  pattern: /^[A-Z0-9]{6,12}$/i,
  placeholder: "e.g. M1234567",
};

export const COUNTRY_GOVT_IDS: CountryGovtIds[] = [
  {
    country: "IN",
    name: "India",
    ids: [
      {
        id: "aadhaar",
        label: "Aadhaar",
        pattern: /^[0-9]{12}$/,
        placeholder: "12 digits",
      },
      {
        id: "pan",
        label: "PAN",
        pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
        placeholder: "ABCDE1234F",
      },
      {
        id: "voter-id",
        label: "Voter ID",
        pattern: /^[A-Z]{3}[0-9]{7}$/i,
        placeholder: "ABC1234567",
      },
      {
        id: "driving-licence",
        label: "Driving Licence",
        pattern: /^[A-Z]{2}[0-9A-Z]{6,14}$/i,
        placeholder: "DL14 20110012345",
      },
      PASSPORT,
    ],
  },
  {
    country: "US",
    name: "United States",
    ids: [
      {
        id: "ssn",
        label: "Social Security Number",
        pattern: /^[0-9]{9}$/,
        placeholder: "9 digits (no dashes)",
      },
      {
        id: "drivers-license",
        label: "Driver's License",
        placeholder: "State-issued ID number",
      },
      {
        id: "state-id",
        label: "State ID",
        placeholder: "State-issued ID number",
      },
      PASSPORT,
    ],
  },
  {
    country: "GB",
    name: "United Kingdom",
    ids: [
      {
        id: "nhs-number",
        label: "NHS Number",
        pattern: /^[0-9]{10}$/,
        placeholder: "10 digits",
      },
      {
        id: "national-insurance",
        label: "National Insurance",
        pattern: /^[A-Z]{2}[0-9]{6}[A-Z]$/i,
        placeholder: "QQ123456A",
      },
      {
        id: "driving-licence",
        label: "Driving Licence",
        placeholder: "DVLA licence number",
      },
      PASSPORT,
    ],
  },
  {
    country: "CA",
    name: "Canada",
    ids: [
      {
        id: "sin",
        label: "Social Insurance Number",
        pattern: /^[0-9]{9}$/,
        placeholder: "9 digits",
      },
      {
        id: "health-card",
        label: "Provincial Health Card",
        placeholder: "Provincial card number",
      },
      PASSPORT,
    ],
  },
  {
    country: "AU",
    name: "Australia",
    ids: [
      {
        id: "medicare",
        label: "Medicare Card",
        pattern: /^[0-9]{10}$/,
        placeholder: "10 digits",
      },
      {
        id: "drivers-licence",
        label: "Driver's Licence",
        placeholder: "State licence number",
      },
      PASSPORT,
    ],
  },
  {
    country: "AE",
    name: "United Arab Emirates",
    ids: [
      {
        id: "emirates-id",
        label: "Emirates ID",
        pattern: /^[0-9]{15}$/,
        placeholder: "15 digits",
      },
      PASSPORT,
    ],
  },
  {
    country: "SG",
    name: "Singapore",
    ids: [
      {
        id: "nric-fin",
        label: "NRIC / FIN",
        pattern: /^[STFG][0-9]{7}[A-Z]$/i,
        placeholder: "S1234567A",
      },
      PASSPORT,
    ],
  },
  {
    country: "DE",
    name: "Germany",
    ids: [
      {
        id: "personalausweis",
        label: "Personalausweis (national ID)",
        placeholder: "National ID number",
      },
      PASSPORT,
    ],
  },
  {
    country: "FR",
    name: "France",
    ids: [
      {
        id: "carte-vitale",
        label: "Carte Vitale (Social Security)",
        pattern: /^[0-9]{15}$/,
        placeholder: "15 digits",
      },
      {
        id: "carte-nationale",
        label: "Carte Nationale d'Identité",
        placeholder: "National ID number",
      },
      PASSPORT,
    ],
  },
  // Generic "Other" entry — passport works as a universal fallback for
  // visitors from countries not in the curated list.
  {
    country: "*",
    name: "Other / not listed",
    ids: [PASSPORT],
  },
];

export function listGovtIdCountries(): CountryGovtIds[] {
  return COUNTRY_GOVT_IDS;
}

export function govtIdTypesForCountry(country: string): GovtIdType[] {
  const c = (country || "").toUpperCase();
  const row =
    COUNTRY_GOVT_IDS.find((r) => r.country === c) ||
    COUNTRY_GOVT_IDS.find((r) => r.country === "*");
  return row ? row.ids : [PASSPORT];
}

// Normalize an input value for storage / matching — strip spaces,
// dashes, and dots; uppercase. Pattern checks use this normalized
// form, and so does the equality check inside the search lib.
export function normalizeIdValue(raw: string): string {
  return (raw || "").replace(/[\s\-.]/g, "").toUpperCase();
}
