// Country-aware list of acceptable government IDs for the patient
// identity-verification flow.
//
// Each ISO 3166-1 alpha-2 country code maps to the IDs that country's
// citizens commonly use. The first entry is what the dropdown
// pre-selects. "Passport" appears on every list because foreign
// nationals may upload theirs regardless of the country they're
// signed up under, and "Other" is always last as an escape hatch.
//
// `INTERNATIONAL` is the fallback shown to visitors whose country is
// either unknown or not in the map — keeps the form working for the
// long tail without requiring per-country additions every week.

export type DocTypeOption = string;

export const INTERNATIONAL_DOC_TYPES: DocTypeOption[] = [
  "Passport",
  "Driver's License",
  "National ID",
  "Other",
];

export const DOC_TYPES_BY_COUNTRY: Record<string, DocTypeOption[]> = {
  // South Asia
  IN: ["Aadhaar", "PAN Card", "Passport", "Driver's License", "Voter ID", "Other"],
  PK: ["CNIC", "Passport", "Driver's License", "Other"],
  BD: ["NID", "Passport", "Driver's License", "Other"],
  LK: ["NIC", "Passport", "Driver's License", "Other"],
  NP: ["Citizenship Card", "Passport", "Driver's License", "Other"],

  // North America
  US: ["Driver's License", "Passport", "State ID", "Permanent Resident Card", "Other"],
  CA: ["Driver's Licence", "Passport", "Provincial ID", "Permanent Resident Card", "Other"],
  MX: ["INE / IFE", "Passport", "Driver's License", "Other"],

  // Europe
  GB: ["Driving Licence", "Passport", "BRP / Residence Permit", "Other"],
  IE: ["Public Services Card", "Passport", "Driver's License", "Other"],
  FR: ["Carte Nationale d'Identité", "Passport", "Permis de Conduire", "Other"],
  DE: ["Personalausweis", "Passport", "Führerschein", "Other"],
  ES: ["DNI", "NIE", "Passport", "Driver's License", "Other"],
  IT: ["Carta d'Identità", "Passport", "Patente di Guida", "Other"],
  NL: ["Identiteitskaart", "Passport", "Rijbewijs", "Other"],
  BE: ["eID", "Passport", "Driver's License", "Other"],
  PT: ["Cartão de Cidadão", "Passport", "Driver's License", "Other"],
  CH: ["Identitätskarte", "Passport", "Führerausweis", "Other"],
  AT: ["Personalausweis", "Passport", "Führerschein", "Other"],
  SE: ["Personnummer ID", "Passport", "Driver's License", "Other"],
  NO: ["Pass / National ID", "Driver's License", "Other"],
  DK: ["CPR / Sundhedskort", "Passport", "Driver's License", "Other"],
  FI: ["Henkilökortti", "Passport", "Driver's License", "Other"],
  IS: ["Kennitala / National ID", "Passport", "Driver's License", "Other"],
  PL: ["Dowód Osobisty", "Passport", "Driver's License", "Other"],
  CZ: ["Občanský Průkaz", "Passport", "Driver's License", "Other"],
  GR: ["National ID", "Passport", "Driver's License", "Other"],
  HU: ["Személyazonosító", "Passport", "Driver's License", "Other"],
  RO: ["Carte de Identitate", "Passport", "Driver's License", "Other"],
  BG: ["Лична карта / National ID", "Passport", "Driver's License", "Other"],
  TR: ["TC Kimlik", "Passport", "Driver's License", "Other"],
  UA: ["ID-картка", "Passport", "Driver's License", "Other"],
  RU: ["Паспорт РФ", "International Passport", "Driver's License", "Other"],

  // Middle East
  AE: ["Emirates ID", "Passport", "Driver's License", "Other"],
  SA: ["National ID / Iqama", "Passport", "Driver's License", "Other"],
  QA: ["Qatari ID", "Passport", "Driver's License", "Other"],
  KW: ["Civil ID", "Passport", "Driver's License", "Other"],
  OM: ["Resident Card", "Passport", "Driver's License", "Other"],
  BH: ["CPR Card", "Passport", "Driver's License", "Other"],
  JO: ["National ID", "Passport", "Driver's License", "Other"],
  IL: ["Teudat Zehut", "Passport", "Driver's License", "Other"],
  IR: ["Melli Card", "Passport", "Driver's License", "Other"],
  IQ: ["National ID", "Passport", "Driver's License", "Other"],
  EG: ["National ID", "Passport", "Driver's License", "Other"],

  // East / SE Asia
  CN: ["居民身份证 / Resident ID", "Passport", "Driver's License", "Other"],
  HK: ["HKID", "Passport", "Driver's License", "Other"],
  TW: ["National ID", "Passport", "Driver's License", "Other"],
  JP: ["My Number Card", "Passport", "Driver's License", "Health Insurance Card", "Other"],
  KR: ["Resident Registration Card", "Passport", "Driver's License", "Other"],
  SG: ["NRIC / FIN", "Passport", "Driver's License", "Other"],
  MY: ["MyKad", "Passport", "Driver's License", "Other"],
  TH: ["Thai National ID", "Passport", "Driver's License", "Other"],
  ID: ["KTP", "Passport", "Driver's License (SIM)", "Other"],
  PH: ["PhilSys / National ID", "Passport", "Driver's License", "UMID", "Other"],
  VN: ["Căn Cước Công Dân", "Passport", "Driver's License", "Other"],

  // Oceania
  AU: ["Driver's Licence", "Passport", "Medicare Card", "Other"],
  NZ: ["Driver Licence", "Passport", "RealMe ID", "Other"],

  // Sub-Saharan Africa
  NG: ["NIN Slip", "Voter's Card", "Passport", "Driver's License", "Other"],
  KE: ["National ID", "Passport", "Driver's License", "Other"],
  GH: ["Ghana Card", "Passport", "Driver's License", "Other"],
  ZA: ["Smart ID Card", "Passport", "Driver's License", "Other"],
  TZ: ["NIDA Card", "Passport", "Driver's License", "Other"],
  UG: ["National ID", "Passport", "Driver's License", "Other"],
  ET: ["Kebele ID", "Passport", "Driver's License", "Other"],

  // LATAM
  BR: ["RG / CPF", "Passport", "CNH (Driver's License)", "Other"],
  AR: ["DNI", "Passport", "Driver's License", "Other"],
  CL: ["Cédula de Identidad", "Passport", "Driver's License", "Other"],
  CO: ["Cédula de Ciudadanía", "Passport", "Driver's License", "Other"],
  PE: ["DNI", "Passport", "Driver's License", "Other"],
  VE: ["Cédula de Identidad", "Passport", "Driver's License", "Other"],
};

/** Resolve the doc-type list for an ISO country code. Returns the
 *  international fallback when the country is empty, unknown, or not
 *  yet mapped. */
export function docTypesForCountry(iso?: string | null): DocTypeOption[] {
  if (!iso) return INTERNATIONAL_DOC_TYPES;
  const code = iso.toUpperCase().trim();
  return DOC_TYPES_BY_COUNTRY[code] || INTERNATIONAL_DOC_TYPES;
}
