// IANA time zone catalogue for dropdown selectors.
//
// The full tzdata list has ~400 zones; most are obscure aliases or
// regional sub-zones nobody picks manually (America/Indiana/Vincennes,
// etc.). This file curates the ~80 zones that cover essentially every
// business locale on Earth, with the major OduDoc markets hoisted to
// the top so an operator doesn't have to scroll past Africa/Asmara.
//
// Each entry's `label` includes the city + the current standard-time
// UTC offset so the selector is self-explanatory without a separate
// offset column. Offsets here are STANDARD time — DST is rendered by
// `Intl.DateTimeFormat` at runtime, so the label is just a hint.

export interface TimeZone {
  /** IANA identifier, e.g. "Asia/Kolkata". */
  id: string;
  /** Display label, e.g. "(UTC+05:30) Kolkata, Mumbai, New Delhi". */
  label: string;
}

// Hoist OduDoc-relevant markets first.
const TOP: TimeZone[] = [
  { id: "Asia/Kolkata",          label: "(UTC+05:30) Kolkata, Mumbai, New Delhi, Chennai" },
  { id: "America/New_York",      label: "(UTC-05:00) New York, Eastern Time (US & Canada)" },
  { id: "America/Chicago",       label: "(UTC-06:00) Chicago, Central Time (US & Canada)" },
  { id: "America/Denver",        label: "(UTC-07:00) Denver, Mountain Time (US & Canada)" },
  { id: "America/Los_Angeles",   label: "(UTC-08:00) Los Angeles, Pacific Time (US & Canada)" },
  { id: "Europe/London",         label: "(UTC+00:00) London, Edinburgh, Dublin" },
  { id: "Asia/Dubai",            label: "(UTC+04:00) Dubai, Abu Dhabi, Muscat" },
  { id: "Asia/Singapore",        label: "(UTC+08:00) Singapore, Kuala Lumpur" },
  { id: "Australia/Sydney",      label: "(UTC+10:00) Sydney, Melbourne, Canberra" },
  { id: "Europe/Berlin",         label: "(UTC+01:00) Berlin, Munich, Frankfurt" },
];

// Alphabetical rest, grouped by macro-region in the labels.
const REST: TimeZone[] = [
  // ── Africa ─────────────────────────────────────────────────────
  { id: "Africa/Cairo",          label: "(UTC+02:00) Cairo, Egypt" },
  { id: "Africa/Johannesburg",   label: "(UTC+02:00) Johannesburg, South Africa" },
  { id: "Africa/Lagos",          label: "(UTC+01:00) Lagos, Nigeria" },
  { id: "Africa/Nairobi",        label: "(UTC+03:00) Nairobi, Kenya" },
  { id: "Africa/Casablanca",     label: "(UTC+00:00) Casablanca, Morocco" },
  { id: "Africa/Tunis",          label: "(UTC+01:00) Tunis, Tunisia" },
  { id: "Africa/Addis_Ababa",    label: "(UTC+03:00) Addis Ababa, Ethiopia" },
  // ── Americas ───────────────────────────────────────────────────
  { id: "America/Anchorage",     label: "(UTC-09:00) Anchorage, Alaska" },
  { id: "America/Argentina/Buenos_Aires", label: "(UTC-03:00) Buenos Aires, Argentina" },
  { id: "America/Bogota",        label: "(UTC-05:00) Bogotá, Colombia" },
  { id: "America/Caracas",       label: "(UTC-04:00) Caracas, Venezuela" },
  { id: "America/Halifax",       label: "(UTC-04:00) Halifax, Atlantic Time" },
  { id: "America/Havana",        label: "(UTC-05:00) Havana, Cuba" },
  { id: "America/Lima",          label: "(UTC-05:00) Lima, Peru" },
  { id: "America/Mexico_City",   label: "(UTC-06:00) Mexico City" },
  { id: "America/Montevideo",    label: "(UTC-03:00) Montevideo, Uruguay" },
  { id: "America/Panama",        label: "(UTC-05:00) Panama City" },
  { id: "America/Phoenix",       label: "(UTC-07:00) Phoenix, Arizona (no DST)" },
  { id: "America/Sao_Paulo",     label: "(UTC-03:00) São Paulo, Brazil" },
  { id: "America/Santiago",      label: "(UTC-04:00) Santiago, Chile" },
  { id: "America/Toronto",       label: "(UTC-05:00) Toronto, Canada Eastern" },
  { id: "America/Vancouver",     label: "(UTC-08:00) Vancouver, Canada Pacific" },
  // ── Asia ───────────────────────────────────────────────────────
  { id: "Asia/Almaty",           label: "(UTC+06:00) Almaty, Kazakhstan" },
  { id: "Asia/Amman",            label: "(UTC+02:00) Amman, Jordan" },
  { id: "Asia/Baghdad",          label: "(UTC+03:00) Baghdad, Iraq" },
  { id: "Asia/Baku",             label: "(UTC+04:00) Baku, Azerbaijan" },
  { id: "Asia/Bangkok",          label: "(UTC+07:00) Bangkok, Hanoi, Jakarta" },
  { id: "Asia/Beirut",           label: "(UTC+02:00) Beirut, Lebanon" },
  { id: "Asia/Colombo",          label: "(UTC+05:30) Colombo, Sri Lanka" },
  { id: "Asia/Dhaka",            label: "(UTC+06:00) Dhaka, Bangladesh" },
  { id: "Asia/Hong_Kong",        label: "(UTC+08:00) Hong Kong, Taipei" },
  { id: "Asia/Jakarta",          label: "(UTC+07:00) Jakarta, Indonesia" },
  { id: "Asia/Jerusalem",        label: "(UTC+02:00) Jerusalem, Israel" },
  { id: "Asia/Karachi",          label: "(UTC+05:00) Karachi, Islamabad" },
  { id: "Asia/Kathmandu",        label: "(UTC+05:45) Kathmandu, Nepal" },
  { id: "Asia/Kuwait",           label: "(UTC+03:00) Kuwait City, Riyadh" },
  { id: "Asia/Manila",           label: "(UTC+08:00) Manila, Philippines" },
  { id: "Asia/Riyadh",           label: "(UTC+03:00) Riyadh, Saudi Arabia" },
  { id: "Asia/Seoul",            label: "(UTC+09:00) Seoul, South Korea" },
  { id: "Asia/Shanghai",         label: "(UTC+08:00) Shanghai, Beijing, China" },
  { id: "Asia/Taipei",           label: "(UTC+08:00) Taipei, Taiwan" },
  { id: "Asia/Tashkent",         label: "(UTC+05:00) Tashkent, Uzbekistan" },
  { id: "Asia/Tehran",           label: "(UTC+03:30) Tehran, Iran" },
  { id: "Asia/Tokyo",            label: "(UTC+09:00) Tokyo, Osaka" },
  { id: "Asia/Yangon",           label: "(UTC+06:30) Yangon, Myanmar" },
  { id: "Asia/Yerevan",          label: "(UTC+04:00) Yerevan, Armenia" },
  // ── Atlantic ───────────────────────────────────────────────────
  { id: "Atlantic/Azores",       label: "(UTC-01:00) Azores, Portugal" },
  { id: "Atlantic/Cape_Verde",   label: "(UTC-01:00) Cape Verde" },
  { id: "Atlantic/Reykjavik",    label: "(UTC+00:00) Reykjavik, Iceland" },
  // ── Australia/Pacific ──────────────────────────────────────────
  { id: "Australia/Adelaide",    label: "(UTC+09:30) Adelaide, South Australia" },
  { id: "Australia/Brisbane",    label: "(UTC+10:00) Brisbane, Queensland" },
  { id: "Australia/Darwin",      label: "(UTC+09:30) Darwin, Northern Territory" },
  { id: "Australia/Perth",       label: "(UTC+08:00) Perth, Western Australia" },
  { id: "Pacific/Auckland",      label: "(UTC+12:00) Auckland, Wellington" },
  { id: "Pacific/Fiji",          label: "(UTC+12:00) Suva, Fiji" },
  { id: "Pacific/Guam",          label: "(UTC+10:00) Guam, Saipan" },
  { id: "Pacific/Honolulu",      label: "(UTC-10:00) Honolulu, Hawaii" },
  { id: "Pacific/Port_Moresby",  label: "(UTC+10:00) Port Moresby, PNG" },
  // ── Europe ─────────────────────────────────────────────────────
  { id: "Europe/Amsterdam",      label: "(UTC+01:00) Amsterdam, Netherlands" },
  { id: "Europe/Athens",         label: "(UTC+02:00) Athens, Greece" },
  { id: "Europe/Belgrade",       label: "(UTC+01:00) Belgrade, Serbia" },
  { id: "Europe/Brussels",       label: "(UTC+01:00) Brussels, Belgium" },
  { id: "Europe/Bucharest",      label: "(UTC+02:00) Bucharest, Romania" },
  { id: "Europe/Budapest",       label: "(UTC+01:00) Budapest, Hungary" },
  { id: "Europe/Copenhagen",     label: "(UTC+01:00) Copenhagen, Denmark" },
  { id: "Europe/Helsinki",       label: "(UTC+02:00) Helsinki, Finland" },
  { id: "Europe/Istanbul",       label: "(UTC+03:00) Istanbul, Turkey" },
  { id: "Europe/Kiev",           label: "(UTC+02:00) Kyiv, Ukraine" },
  { id: "Europe/Lisbon",         label: "(UTC+00:00) Lisbon, Portugal" },
  { id: "Europe/Madrid",         label: "(UTC+01:00) Madrid, Spain" },
  { id: "Europe/Moscow",         label: "(UTC+03:00) Moscow, Russia" },
  { id: "Europe/Oslo",           label: "(UTC+01:00) Oslo, Norway" },
  { id: "Europe/Paris",          label: "(UTC+01:00) Paris, France" },
  { id: "Europe/Prague",         label: "(UTC+01:00) Prague, Czech Republic" },
  { id: "Europe/Rome",           label: "(UTC+01:00) Rome, Italy" },
  { id: "Europe/Stockholm",      label: "(UTC+01:00) Stockholm, Sweden" },
  { id: "Europe/Vienna",         label: "(UTC+01:00) Vienna, Austria" },
  { id: "Europe/Warsaw",         label: "(UTC+01:00) Warsaw, Poland" },
  { id: "Europe/Zurich",         label: "(UTC+01:00) Zurich, Switzerland" },
  // ── UTC ────────────────────────────────────────────────────────
  { id: "UTC",                   label: "(UTC+00:00) Coordinated Universal Time" },
];

/** Curated catalogue — top markets first, alphabetical rest. */
export const TIME_ZONES: TimeZone[] = [...TOP, ...REST];

/** Lookup by IANA id. */
export function findTimeZone(id: string | null | undefined): TimeZone | undefined {
  if (!id) return undefined;
  return TIME_ZONES.find((t) => t.id === id);
}
