// Country-by-country national health ID catalogue.
//
// India's ABHA was the first national health stack OduDoc integrated
// (see lib/abdm/). This file extends that idea worldwide: a single
// curated list of each country's official health-system identifier —
// what it's called, who issues it, how to format it, where to learn
// more — so the patient form, the patient-lookup search, and any
// future per-country integration (eligibility checks, EHR pulls,
// claim submission) all read from the same source of truth.
//
// V1 = catalogue + format validation. Per-country deep integration
// (KYC, OTP linking, EHR data pull) is a follow-up per country as
// markets expand. Same shape that ABHA's full integration uses, so a
// later upgrade slots in without breaking callers.

export interface NationalHealthIdFormat {
  /** Pattern the normalized (uppercase, no separators) value must
   *  match. Used as both a client-side hint and a server-side gate. */
  pattern: RegExp;
  /** Placeholder shown in the input. */
  placeholder: string;
  /** Long-form help text explaining the ID shape. */
  helpText?: string;
}

export interface NationalHealthIdAlternate {
  /** Stable key, e.g. "abha-address" alongside "abha-number". */
  id: string;
  /** Display name, e.g. "ABHA Address". */
  name: string;
  format: NationalHealthIdFormat;
}

export interface NationalHealthId {
  /** ISO-3166-1 alpha-2, uppercase. */
  country: string;
  /** Display name of the country. */
  countryName: string;
  /** Stable id used as `Patient.governmentIds[].type` when this
   *  health ID is filed on a patient record. */
  systemId: string;
  /** Display name shown in dropdowns / labels. */
  systemName: string;
  /** Local-language native name where it diverges from English. */
  nativeName?: string;
  /** Issuing agency / authority. */
  agency: string;
  /** Higher-level digital-health network this ID plugs into, when
   *  one exists (ABDM in India, NHS Digital in the UK, etc.). */
  digitalHealthNetwork?: string;
  format: NationalHealthIdFormat;
  /** Some systems carry both a number and a human-readable address
   *  (ABHA, Estonian e-Health). Listed so the UI can offer either. */
  alternates?: NationalHealthIdAlternate[];
  /** Public URL the user can visit to read about / get this ID. */
  learnMoreUrl?: string;
  /** Coverage flag so search-by-country knows what to surface for
   *  countries without a unified system. "national" = single
   *  country-wide ID. "subnational" = state/province-issued (e.g.
   *  Canadian provincial health cards). "voluntary" = the system
   *  exists but coverage is optional or partial. */
  coverage: "national" | "subnational" | "voluntary";
}

// Curated to OduDoc's launch markets + every G20 country with a
// recognised national health ID. Add rather than reshape — the
// systemId values are persisted on patient records.
export const NATIONAL_HEALTH_IDS: NationalHealthId[] = [
  // ── South Asia ─────────────────────────────────────────────────────
  {
    country: "IN",
    countryName: "India",
    systemId: "abha-number",
    systemName: "ABHA Number",
    nativeName: "आभा संख्या",
    agency: "National Health Authority (NHA)",
    digitalHealthNetwork: "ABDM",
    format: {
      pattern: /^[0-9]{14}$/,
      placeholder: "14 digits (e.g. 91-1234-5678-9012)",
      helpText:
        "Ayushman Bharat Health Account — 14 digits. Issued via abdm.gov.in.",
    },
    alternates: [
      {
        id: "abha-address",
        name: "ABHA Address",
        format: {
          pattern: /^[a-z0-9._-]{3,40}@(abdm|sbx|hcx)$/i,
          placeholder: "your.name@abdm",
        },
      },
    ],
    learnMoreUrl: "https://abdm.gov.in/",
    coverage: "national",
  },
  {
    country: "BD",
    countryName: "Bangladesh",
    systemId: "shasthya-card",
    systemName: "Shastho Surokkha (Health Card)",
    agency: "Directorate General of Health Services (DGHS)",
    format: {
      pattern: /^[A-Z0-9]{8,16}$/,
      placeholder: "Card number",
    },
    coverage: "voluntary",
  },
  {
    country: "PK",
    countryName: "Pakistan",
    systemId: "sehat-card",
    systemName: "Sehat Card (Sehat Sahulat)",
    agency: "State Life Insurance / provincial health depts",
    format: {
      pattern: /^[0-9]{13}$/,
      placeholder: "CNIC-linked 13 digits",
    },
    coverage: "subnational",
  },
  {
    country: "LK",
    countryName: "Sri Lanka",
    systemId: "phn",
    systemName: "Personal Health Number (PHN)",
    agency: "Ministry of Health",
    format: {
      pattern: /^[A-Z0-9]{6,12}$/,
      placeholder: "Hospital-issued PHN",
    },
    coverage: "voluntary",
  },

  // ── East / Southeast Asia ─────────────────────────────────────────
  {
    country: "CN",
    countryName: "China",
    systemId: "sscard",
    systemName: "Social Security Card (社保卡)",
    nativeName: "社会保障卡",
    agency: "Ministry of Human Resources and Social Security",
    format: {
      pattern: /^[0-9]{9,12}$/,
      placeholder: "Card number",
    },
    coverage: "national",
  },
  {
    country: "JP",
    countryName: "Japan",
    systemId: "hokenshou",
    systemName: "Health Insurance Card (健康保険証)",
    nativeName: "健康保険証",
    agency: "Various — kenpo-kai / kokuho",
    format: {
      pattern: /^[A-Z0-9]{4,16}$/,
      placeholder: "Insurance number",
      helpText:
        "Number printed on the kenkō-hokenshō. Now being unified under the My Number Card scheme.",
    },
    coverage: "national",
  },
  {
    country: "KR",
    countryName: "South Korea",
    systemId: "rrn",
    systemName: "Resident Registration Number",
    nativeName: "주민등록번호",
    agency: "Ministry of the Interior and Safety",
    digitalHealthNetwork: "HIRA",
    format: {
      pattern: /^[0-9]{13}$/,
      placeholder: "13 digits (YYMMDD-NNNNNNN)",
    },
    coverage: "national",
  },
  {
    country: "TW",
    countryName: "Taiwan",
    systemId: "nhi-card",
    systemName: "NHI Card",
    nativeName: "全民健康保險卡",
    agency: "National Health Insurance Administration",
    format: {
      pattern: /^[A-Z][12][0-9]{8}$/,
      placeholder: "A123456789",
    },
    coverage: "national",
  },
  {
    country: "HK",
    countryName: "Hong Kong",
    systemId: "ehealth-account",
    systemName: "eHealth Account",
    agency: "Hospital Authority / DH",
    format: {
      pattern: /^[A-Z]{1,2}[0-9]{6,7}[A0-9]$/,
      placeholder: "HKID-linked account",
    },
    coverage: "voluntary",
  },
  {
    country: "SG",
    countryName: "Singapore",
    systemId: "nric-health",
    systemName: "NRIC / FIN (HealthHub)",
    agency: "Ministry of Health (MOH) / IHiS",
    digitalHealthNetwork: "NEHR",
    format: {
      pattern: /^[STFG][0-9]{7}[A-Z]$/,
      placeholder: "S1234567A",
    },
    coverage: "national",
  },
  {
    country: "TH",
    countryName: "Thailand",
    systemId: "nhso-id",
    systemName: "National ID (NHSO)",
    nativeName: "บัตรประจำตัวประชาชน",
    agency: "National Health Security Office",
    format: {
      pattern: /^[0-9]{13}$/,
      placeholder: "13 digits",
    },
    coverage: "national",
  },
  {
    country: "VN",
    countryName: "Vietnam",
    systemId: "hi-card",
    systemName: "Health Insurance Card",
    nativeName: "Thẻ bảo hiểm y tế",
    agency: "Vietnam Social Security",
    format: {
      pattern: /^[A-Z]{2}[0-9]{13}$/,
      placeholder: "Card number",
    },
    coverage: "national",
  },
  {
    country: "MY",
    countryName: "Malaysia",
    systemId: "mykad",
    systemName: "MyKad",
    agency: "National Registration Department",
    format: {
      pattern: /^[0-9]{12}$/,
      placeholder: "12 digits",
    },
    coverage: "national",
  },
  {
    country: "ID",
    countryName: "Indonesia",
    systemId: "bpjs-number",
    systemName: "BPJS Kesehatan Number",
    agency: "BPJS Kesehatan",
    format: {
      pattern: /^[0-9]{13}$/,
      placeholder: "13 digits",
    },
    coverage: "national",
  },
  {
    country: "PH",
    countryName: "Philippines",
    systemId: "philhealth",
    systemName: "PhilHealth Number (PIN)",
    agency: "Philippine Health Insurance Corporation",
    format: {
      pattern: /^[0-9]{12}$/,
      placeholder: "12 digits",
    },
    coverage: "national",
  },

  // ── Middle East ───────────────────────────────────────────────────
  {
    country: "AE",
    countryName: "United Arab Emirates",
    systemId: "emirates-id-health",
    systemName: "Emirates ID (DHA / MOHAP)",
    agency: "Federal Authority for Identity & Citizenship",
    digitalHealthNetwork: "Riayati / NABIDH / Malaffi",
    format: {
      pattern: /^[0-9]{15}$/,
      placeholder: "15 digits",
    },
    coverage: "national",
  },
  {
    country: "SA",
    countryName: "Saudi Arabia",
    systemId: "sehhaty",
    systemName: "National ID (Sehhaty)",
    nativeName: "صحتي",
    agency: "Ministry of Health",
    format: {
      pattern: /^[12][0-9]{9}$/,
      placeholder: "10 digits",
    },
    coverage: "national",
  },
  {
    country: "IL",
    countryName: "Israel",
    systemId: "teudat-zehut",
    systemName: "Teudat Zehut",
    nativeName: "תעודת זהות",
    agency: "Ministry of Interior",
    format: {
      pattern: /^[0-9]{9}$/,
      placeholder: "9 digits",
    },
    coverage: "national",
  },
  {
    country: "TR",
    countryName: "Türkiye",
    systemId: "tc-kimlik",
    systemName: "T.C. Kimlik No (e-Nabız)",
    agency: "Ministry of Health",
    format: {
      pattern: /^[1-9][0-9]{10}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "EG",
    countryName: "Egypt",
    systemId: "national-id",
    systemName: "National ID (UHI)",
    nativeName: "الرقم القومي",
    agency: "Universal Health Insurance Authority",
    format: {
      pattern: /^[23][0-9]{13}$/,
      placeholder: "14 digits",
    },
    coverage: "national",
  },

  // ── Africa ────────────────────────────────────────────────────────
  {
    country: "ZA",
    countryName: "South Africa",
    systemId: "sa-id-health",
    systemName: "ID Number (NHI)",
    agency: "Department of Home Affairs",
    format: {
      pattern: /^[0-9]{13}$/,
      placeholder: "13 digits",
    },
    coverage: "subnational",
  },
  {
    country: "KE",
    countryName: "Kenya",
    systemId: "nhif",
    systemName: "NHIF Member Number",
    agency: "National Health Insurance Fund",
    format: {
      pattern: /^[0-9]{6,10}$/,
      placeholder: "NHIF number",
    },
    coverage: "national",
  },
  {
    country: "NG",
    countryName: "Nigeria",
    systemId: "nhia-id",
    systemName: "NHIA ID / NIN",
    agency: "National Health Insurance Authority",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "voluntary",
  },
  {
    country: "GH",
    countryName: "Ghana",
    systemId: "nhis",
    systemName: "NHIS Membership Number",
    agency: "National Health Insurance Authority",
    format: {
      pattern: /^[0-9]{8,12}$/,
      placeholder: "Member number",
    },
    coverage: "national",
  },

  // ── Americas ──────────────────────────────────────────────────────
  {
    country: "US",
    countryName: "United States",
    systemId: "mbi",
    systemName: "Medicare Beneficiary Identifier (MBI)",
    agency: "CMS",
    format: {
      pattern: /^[1-9][AC-HJKMNP-RT-Z][0-9AC-HJKMNP-RT-Z][0-9][AC-HJKMNP-RT-Z][0-9AC-HJKMNP-RT-Z][0-9][AC-HJKMNP-RT-Z]{2}[0-9]{2}$/,
      placeholder: "1EG4-TE5-MK73",
      helpText:
        "The 11-character Medicare ID printed on Medicare cards. The USA has no universal national health ID — Medicare covers 65+ and ESRD patients.",
    },
    coverage: "subnational",
  },
  {
    country: "CA",
    countryName: "Canada",
    systemId: "provincial-health-card",
    systemName: "Provincial Health Card",
    agency: "Provincial ministries of health",
    format: {
      pattern: /^[A-Z0-9-]{6,14}$/,
      placeholder: "1234-567-890-XX",
      helpText:
        "Issued by your province (OHIP in Ontario, MSP in BC, RAMQ in Quebec, AHCIP in Alberta, etc.).",
    },
    coverage: "subnational",
  },
  {
    country: "BR",
    countryName: "Brazil",
    systemId: "cns",
    systemName: "Cartão Nacional de Saúde (CNS)",
    nativeName: "Cartão Nacional de Saúde",
    agency: "DATASUS",
    format: {
      pattern: /^[0-9]{15}$/,
      placeholder: "15 digits",
    },
    coverage: "national",
  },
  {
    country: "MX",
    countryName: "Mexico",
    systemId: "imss-nss",
    systemName: "IMSS NSS / CURP",
    agency: "Instituto Mexicano del Seguro Social",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits (NSS) or 18-char CURP",
    },
    coverage: "national",
  },
  {
    country: "AR",
    countryName: "Argentina",
    systemId: "dni-health",
    systemName: "DNI (SISA)",
    agency: "Ministerio de Salud",
    format: {
      pattern: /^[0-9]{7,8}$/,
      placeholder: "DNI number",
    },
    coverage: "national",
  },
  {
    country: "CL",
    countryName: "Chile",
    systemId: "rut",
    systemName: "RUN/RUT (FONASA)",
    agency: "FONASA / ISAPRE",
    format: {
      pattern: /^[0-9]{7,8}[0-9K]$/,
      placeholder: "12345678-9",
    },
    coverage: "national",
  },

  // ── Europe ────────────────────────────────────────────────────────
  {
    country: "GB",
    countryName: "United Kingdom",
    systemId: "nhs-number",
    systemName: "NHS Number",
    agency: "NHS Digital",
    digitalHealthNetwork: "NHS Spine",
    format: {
      pattern: /^[0-9]{10}$/,
      placeholder: "10 digits (e.g. 485 777 3456)",
    },
    learnMoreUrl: "https://www.nhs.uk/nhs-services/online-services/find-nhs-number/",
    coverage: "national",
  },
  {
    country: "IE",
    countryName: "Ireland",
    systemId: "ihi",
    systemName: "Individual Health Identifier (IHI)",
    agency: "HSE",
    format: {
      pattern: /^[0-9]{7}$/,
      placeholder: "7 digits",
    },
    coverage: "national",
  },
  {
    country: "FR",
    countryName: "France",
    systemId: "carte-vitale",
    systemName: "Carte Vitale (NIR)",
    nativeName: "Numéro de Sécurité Sociale",
    agency: "CNAM",
    digitalHealthNetwork: "Mon Espace Santé",
    format: {
      pattern: /^[12][0-9]{14}$/,
      placeholder: "15 digits",
    },
    coverage: "national",
  },
  {
    country: "DE",
    countryName: "Germany",
    systemId: "kvnr",
    systemName: "Krankenversichertennummer (KVNR)",
    agency: "Gesetzliche Krankenversicherung",
    digitalHealthNetwork: "Telematikinfrastruktur",
    format: {
      pattern: /^[A-Z][0-9]{9}$/,
      placeholder: "A123456789",
    },
    coverage: "national",
  },
  {
    country: "IT",
    countryName: "Italy",
    systemId: "tessera-sanitaria",
    systemName: "Tessera Sanitaria",
    agency: "Ministero della Salute",
    format: {
      pattern: /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/,
      placeholder: "16-char codice fiscale",
    },
    coverage: "national",
  },
  {
    country: "ES",
    countryName: "Spain",
    systemId: "tsi",
    systemName: "Tarjeta Sanitaria Individual (TSI)",
    agency: "Sistema Nacional de Salud",
    format: {
      pattern: /^[A-Z]{3}[A-Z0-9]{9,12}$/,
      placeholder: "Regional TSI number",
    },
    coverage: "subnational",
  },
  {
    country: "PT",
    countryName: "Portugal",
    systemId: "numero-utente",
    systemName: "Número de Utente",
    agency: "Serviço Nacional de Saúde",
    format: {
      pattern: /^[0-9]{9}$/,
      placeholder: "9 digits",
    },
    coverage: "national",
  },
  {
    country: "NL",
    countryName: "Netherlands",
    systemId: "bsn",
    systemName: "Burger Service Nummer (BSN)",
    agency: "Government of the Netherlands",
    format: {
      pattern: /^[0-9]{9}$/,
      placeholder: "9 digits",
    },
    coverage: "national",
  },
  {
    country: "BE",
    countryName: "Belgium",
    systemId: "nrn",
    systemName: "Rijksregisternummer (NRN)",
    agency: "Federal Public Service",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "SE",
    countryName: "Sweden",
    systemId: "personnummer",
    systemName: "Personnummer",
    agency: "Skatteverket",
    format: {
      pattern: /^[0-9]{10,12}$/,
      placeholder: "YYMMDD-XXXX",
    },
    coverage: "national",
  },
  {
    country: "NO",
    countryName: "Norway",
    systemId: "fodselsnummer",
    systemName: "Fødselsnummer",
    agency: "Skatteetaten",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "DK",
    countryName: "Denmark",
    systemId: "cpr",
    systemName: "CPR Number",
    agency: "CPR Office",
    digitalHealthNetwork: "Sundhed.dk",
    format: {
      pattern: /^[0-9]{10}$/,
      placeholder: "DDMMYY-XXXX",
    },
    coverage: "national",
  },
  {
    country: "FI",
    countryName: "Finland",
    systemId: "henkilotunnus",
    systemName: "Henkilötunnus",
    agency: "DVV",
    digitalHealthNetwork: "Kanta",
    format: {
      pattern: /^[0-9]{6}[A+-][0-9]{3}[0-9A-Z]$/,
      placeholder: "DDMMYY-NNNX",
    },
    coverage: "national",
  },
  {
    country: "EE",
    countryName: "Estonia",
    systemId: "isikukood",
    systemName: "Isikukood",
    agency: "Estonian Police and Border Guard Board",
    digitalHealthNetwork: "Estonian e-Health",
    format: {
      pattern: /^[1-6][0-9]{10}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "PL",
    countryName: "Poland",
    systemId: "pesel",
    systemName: "PESEL",
    agency: "MSWiA",
    digitalHealthNetwork: "P1 (IKP)",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "CZ",
    countryName: "Czech Republic",
    systemId: "rodne-cislo",
    systemName: "Rodné číslo",
    agency: "Ministerstvo zdravotnictví",
    format: {
      pattern: /^[0-9]{9,10}$/,
      placeholder: "Birth number",
    },
    coverage: "national",
  },
  {
    country: "RO",
    countryName: "Romania",
    systemId: "cnp",
    systemName: "CNP (CNAS)",
    agency: "Casa Națională de Asigurări de Sănătate",
    format: {
      pattern: /^[1-9][0-9]{12}$/,
      placeholder: "13 digits",
    },
    coverage: "national",
  },
  {
    country: "GR",
    countryName: "Greece",
    systemId: "amka",
    systemName: "AMKA",
    nativeName: "ΑΜΚΑ",
    agency: "IDIKA",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "HU",
    countryName: "Hungary",
    systemId: "taj",
    systemName: "TAJ szám",
    agency: "NEAK",
    format: {
      pattern: /^[0-9]{9}$/,
      placeholder: "9 digits",
    },
    coverage: "national",
  },
  {
    country: "HR",
    countryName: "Croatia",
    systemId: "oib",
    systemName: "OIB (HZZO)",
    agency: "HZZO",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "CH",
    countryName: "Switzerland",
    systemId: "ahv",
    systemName: "AHV-Nummer",
    agency: "Bundesamt für Sozialversicherungen",
    format: {
      pattern: /^756[0-9]{10}$/,
      placeholder: "756.XXXX.XXXX.XX",
    },
    coverage: "national",
  },
  {
    country: "AT",
    countryName: "Austria",
    systemId: "evn",
    systemName: "e-card / Sozialversicherungsnummer",
    agency: "Hauptverband",
    format: {
      pattern: /^[0-9]{10}$/,
      placeholder: "10 digits",
    },
    coverage: "national",
  },
  {
    country: "IS",
    countryName: "Iceland",
    systemId: "kennitala",
    systemName: "Kennitala",
    agency: "Þjóðskrá Íslands",
    format: {
      pattern: /^[0-9]{10}$/,
      placeholder: "10 digits",
    },
    coverage: "national",
  },

  // ── Oceania ───────────────────────────────────────────────────────
  {
    country: "AU",
    countryName: "Australia",
    systemId: "medicare",
    systemName: "Medicare Card",
    agency: "Services Australia",
    digitalHealthNetwork: "My Health Record",
    format: {
      pattern: /^[0-9]{10,11}$/,
      placeholder: "10 digits + IRN",
    },
    coverage: "national",
  },
  {
    country: "NZ",
    countryName: "New Zealand",
    systemId: "nhi",
    systemName: "NHI Number",
    agency: "Te Whatu Ora — Health NZ",
    format: {
      pattern: /^[A-HJ-NP-Z]{3}[0-9]{4}$/,
      placeholder: "ABC1234",
    },
    coverage: "national",
  },

  // ── Eurasia / CIS ─────────────────────────────────────────────────
  {
    country: "RU",
    countryName: "Russia",
    systemId: "snils",
    systemName: "СНИЛС",
    nativeName: "СНИЛС",
    agency: "Pension Fund of Russia",
    format: {
      pattern: /^[0-9]{11}$/,
      placeholder: "11 digits",
    },
    coverage: "national",
  },
  {
    country: "UA",
    countryName: "Ukraine",
    systemId: "ehealth-ua",
    systemName: "eHealth Patient ID",
    agency: "Ministry of Health of Ukraine",
    format: {
      pattern: /^[A-Z0-9]{8,16}$/,
      placeholder: "eHealth ID",
    },
    coverage: "national",
  },
  {
    country: "KZ",
    countryName: "Kazakhstan",
    systemId: "iin-health",
    systemName: "IIN (Individual Identification Number)",
    agency: "Ministry of Healthcare",
    format: {
      pattern: /^[0-9]{12}$/,
      placeholder: "12 digits",
    },
    coverage: "national",
  },
];

export function listNationalHealthIdCountries(): NationalHealthId[] {
  return NATIONAL_HEALTH_IDS;
}

export function healthIdForCountry(
  country: string,
): NationalHealthId | undefined {
  const c = (country || "").toUpperCase();
  return NATIONAL_HEALTH_IDS.find((h) => h.country === c);
}

export function healthIdBySystemId(
  systemId: string,
): NationalHealthId | undefined {
  return NATIONAL_HEALTH_IDS.find((h) => h.systemId === systemId);
}

/** Normalize a value for storage / matching — strip whitespace,
 *  dashes, dots; uppercase. Matches the equivalent helper in
 *  govt-id-types.ts so search by either source treats values the
 *  same way. */
export function normalizeHealthIdValue(raw: string): string {
  return (raw || "").replace(/[\s\-.]/g, "").toUpperCase();
}
