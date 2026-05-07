// ISO 3166-1 alpha-2 country list with display names. Curated to ~120
// countries (drops the long tail of micro-states). Used by forms that
// need a paired (iso, name) selector — e.g. the doctor profile editor.

export interface IsoCountry {
  iso: string; // alpha-2, uppercase
  name: string;
}

export const ISO_COUNTRIES: IsoCountry[] = [
  { iso: "AF", name: "Afghanistan" },
  { iso: "AL", name: "Albania" },
  { iso: "DZ", name: "Algeria" },
  { iso: "AR", name: "Argentina" },
  { iso: "AM", name: "Armenia" },
  { iso: "AU", name: "Australia" },
  { iso: "AT", name: "Austria" },
  { iso: "AZ", name: "Azerbaijan" },
  { iso: "BH", name: "Bahrain" },
  { iso: "BD", name: "Bangladesh" },
  { iso: "BY", name: "Belarus" },
  { iso: "BE", name: "Belgium" },
  { iso: "BZ", name: "Belize" },
  { iso: "BO", name: "Bolivia" },
  { iso: "BA", name: "Bosnia and Herzegovina" },
  { iso: "BW", name: "Botswana" },
  { iso: "BR", name: "Brazil" },
  { iso: "BG", name: "Bulgaria" },
  { iso: "KH", name: "Cambodia" },
  { iso: "CM", name: "Cameroon" },
  { iso: "CA", name: "Canada" },
  { iso: "CL", name: "Chile" },
  { iso: "CN", name: "China" },
  { iso: "CO", name: "Colombia" },
  { iso: "CR", name: "Costa Rica" },
  { iso: "CI", name: "Côte d'Ivoire" },
  { iso: "HR", name: "Croatia" },
  { iso: "CU", name: "Cuba" },
  { iso: "CY", name: "Cyprus" },
  { iso: "CZ", name: "Czechia" },
  { iso: "DK", name: "Denmark" },
  { iso: "DO", name: "Dominican Republic" },
  { iso: "EC", name: "Ecuador" },
  { iso: "EG", name: "Egypt" },
  { iso: "SV", name: "El Salvador" },
  { iso: "EE", name: "Estonia" },
  { iso: "ET", name: "Ethiopia" },
  { iso: "FI", name: "Finland" },
  { iso: "FR", name: "France" },
  { iso: "GE", name: "Georgia" },
  { iso: "DE", name: "Germany" },
  { iso: "GH", name: "Ghana" },
  { iso: "GR", name: "Greece" },
  { iso: "GT", name: "Guatemala" },
  { iso: "HN", name: "Honduras" },
  { iso: "HK", name: "Hong Kong" },
  { iso: "HU", name: "Hungary" },
  { iso: "IS", name: "Iceland" },
  { iso: "IN", name: "India" },
  { iso: "ID", name: "Indonesia" },
  { iso: "IR", name: "Iran" },
  { iso: "IQ", name: "Iraq" },
  { iso: "IE", name: "Ireland" },
  { iso: "IL", name: "Israel" },
  { iso: "IT", name: "Italy" },
  { iso: "JM", name: "Jamaica" },
  { iso: "JP", name: "Japan" },
  { iso: "JO", name: "Jordan" },
  { iso: "KZ", name: "Kazakhstan" },
  { iso: "KE", name: "Kenya" },
  { iso: "KW", name: "Kuwait" },
  { iso: "KG", name: "Kyrgyzstan" },
  { iso: "LA", name: "Laos" },
  { iso: "LV", name: "Latvia" },
  { iso: "LB", name: "Lebanon" },
  { iso: "LY", name: "Libya" },
  { iso: "LT", name: "Lithuania" },
  { iso: "LU", name: "Luxembourg" },
  { iso: "MO", name: "Macao" },
  { iso: "MY", name: "Malaysia" },
  { iso: "MT", name: "Malta" },
  { iso: "MX", name: "Mexico" },
  { iso: "MD", name: "Moldova" },
  { iso: "MA", name: "Morocco" },
  { iso: "MZ", name: "Mozambique" },
  { iso: "MM", name: "Myanmar" },
  { iso: "NA", name: "Namibia" },
  { iso: "NP", name: "Nepal" },
  { iso: "NL", name: "Netherlands" },
  { iso: "NZ", name: "New Zealand" },
  { iso: "NI", name: "Nicaragua" },
  { iso: "NE", name: "Niger" },
  { iso: "NG", name: "Nigeria" },
  { iso: "MK", name: "North Macedonia" },
  { iso: "NO", name: "Norway" },
  { iso: "OM", name: "Oman" },
  { iso: "PK", name: "Pakistan" },
  { iso: "PA", name: "Panama" },
  { iso: "PY", name: "Paraguay" },
  { iso: "PE", name: "Peru" },
  { iso: "PH", name: "Philippines" },
  { iso: "PL", name: "Poland" },
  { iso: "PT", name: "Portugal" },
  { iso: "QA", name: "Qatar" },
  { iso: "RO", name: "Romania" },
  { iso: "RU", name: "Russia" },
  { iso: "RW", name: "Rwanda" },
  { iso: "SA", name: "Saudi Arabia" },
  { iso: "SN", name: "Senegal" },
  { iso: "RS", name: "Serbia" },
  { iso: "SG", name: "Singapore" },
  { iso: "SK", name: "Slovakia" },
  { iso: "SI", name: "Slovenia" },
  { iso: "ZA", name: "South Africa" },
  { iso: "KR", name: "South Korea" },
  { iso: "ES", name: "Spain" },
  { iso: "LK", name: "Sri Lanka" },
  { iso: "SD", name: "Sudan" },
  { iso: "SE", name: "Sweden" },
  { iso: "CH", name: "Switzerland" },
  { iso: "SY", name: "Syria" },
  { iso: "TW", name: "Taiwan" },
  { iso: "TZ", name: "Tanzania" },
  { iso: "TH", name: "Thailand" },
  { iso: "TT", name: "Trinidad and Tobago" },
  { iso: "TN", name: "Tunisia" },
  { iso: "TR", name: "Türkiye" },
  { iso: "TM", name: "Turkmenistan" },
  { iso: "UG", name: "Uganda" },
  { iso: "UA", name: "Ukraine" },
  { iso: "AE", name: "United Arab Emirates" },
  { iso: "GB", name: "United Kingdom" },
  { iso: "US", name: "United States" },
  { iso: "UY", name: "Uruguay" },
  { iso: "UZ", name: "Uzbekistan" },
  { iso: "VE", name: "Venezuela" },
  { iso: "VN", name: "Vietnam" },
  { iso: "YE", name: "Yemen" },
  { iso: "ZM", name: "Zambia" },
  { iso: "ZW", name: "Zimbabwe" },
];

/** Resolve a country name from an ISO alpha-2 code. Returns the code
 *  itself if not found so the UI never renders an empty cell. */
export function isoToName(iso: string | null | undefined): string {
  if (!iso) return "";
  const upper = iso.toUpperCase();
  return ISO_COUNTRIES.find((c) => c.iso === upper)?.name || upper;
}

/** Best-effort browser-side detection. navigator.language → IANA TZ
 *  fallback. Used to pre-select a country on first edit. */
export function detectIsoCountry(): string {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "US";
  }
  const lang =
    navigator.language || (navigator.languages && navigator.languages[0]);
  if (lang && lang.includes("-")) {
    const region = lang.split("-").pop();
    if (region && region.length === 2) {
      const iso = region.toUpperCase();
      if (ISO_COUNTRIES.find((c) => c.iso === iso)) return iso;
    }
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzMap: Record<string, string> = {
      "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
      "Asia/Karachi": "PK", "Asia/Dhaka": "BD", "Asia/Dubai": "AE",
      "Asia/Riyadh": "SA", "Asia/Singapore": "SG", "Asia/Hong_Kong": "HK",
      "Asia/Tokyo": "JP", "Asia/Seoul": "KR", "Asia/Shanghai": "CN",
      "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE",
      "Europe/Madrid": "ES", "Europe/Rome": "IT", "Europe/Amsterdam": "NL",
      "America/New_York": "US", "America/Los_Angeles": "US",
      "America/Chicago": "US", "America/Toronto": "CA",
      "Australia/Sydney": "AU", "Africa/Lagos": "NG",
      "Africa/Cairo": "EG", "Africa/Johannesburg": "ZA",
      "America/Sao_Paulo": "BR", "America/Mexico_City": "MX",
    };
    if (tz && tzMap[tz]) return tzMap[tz];
  } catch {
    // Intl can throw on legacy browsers.
  }
  return "US";
}
