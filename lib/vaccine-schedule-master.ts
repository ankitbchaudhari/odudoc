// Vaccine schedule master. Spec v6.0 §34.
//
// Per-pod immunisation schedules. India pod uses the UIP (Universal
// Immunisation Programme) + IAP (Indian Academy of Pediatrics)
// recommended schedule. Each pod can publish its own variant; the
// patient's pod (set at registration) picks which schedule renders
// in /dashboard/vaccinations.
//
// Each entry is one vaccine occurrence — same vaccine can appear
// multiple times (e.g. DTP at 6w, 10w, 14w, 16-24mo, 4-6y). The due
// date is computed from the patient's DOB + the offset window.
//
// Adult schedule kept separate so we can compute due dates for
// flu / Covid / travel vaccines without polluting the paediatric
// timeline.

export type VaccineCohort = "infant" | "child" | "adolescent" | "adult" | "elderly" | "travel" | "pregnancy";

export interface VaccineScheduleEntry {
  /** Canonical vaccine id — used to dedupe across pods. */
  id: string;
  /** Vaccine label as it appears on the patient calendar. */
  vaccine: string;
  cohort: VaccineCohort;
  /** Due offset relative to DOB. */
  offsetDays: number;
  /** Window — patient is reminded `offsetDays - windowDays` early
   *  and a "missed" pill appears `offsetDays + windowDays` after. */
  windowDays: number;
  /** What this vaccine protects against — shown in the patient's
   *  hover card. */
  protectsAgainst: string;
  /** Indian government / IAP / WHO mandate level. */
  mandate: "uip" | "iap_recommended" | "iap_optional" | "travel";
  /** Booster series — 1 of 3 etc. */
  doseSeries?: string;
}

// India pod schedule — combination of UIP (universal) + IAP
// recommended. Sourced from the IAP 2024 immunisation chart.
export const INDIA_SCHEDULE: VaccineScheduleEntry[] = [
  // ─ Birth ────────────────────────────────────────────────
  { id: "bcg-birth",        vaccine: "BCG",                   cohort: "infant", offsetDays: 0,    windowDays: 7,   protectsAgainst: "Tuberculosis",                 mandate: "uip" },
  { id: "hep-b-birth",      vaccine: "Hepatitis B",           cohort: "infant", offsetDays: 0,    windowDays: 7,   protectsAgainst: "Hepatitis B",                  mandate: "uip", doseSeries: "1 of 4" },
  { id: "opv-birth",        vaccine: "OPV (zero dose)",       cohort: "infant", offsetDays: 0,    windowDays: 7,   protectsAgainst: "Polio",                        mandate: "uip" },

  // ─ 6 weeks ──────────────────────────────────────────────
  { id: "dtwp-1",           vaccine: "DTwP / DTaP",           cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Diphtheria, Pertussis, Tetanus", mandate: "uip", doseSeries: "1 of 5" },
  { id: "hib-1",            vaccine: "Hib",                   cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Haemophilus influenzae b",     mandate: "uip", doseSeries: "1 of 3" },
  { id: "ipv-1",            vaccine: "IPV / OPV",             cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Polio",                        mandate: "uip", doseSeries: "1 of 3" },
  { id: "hep-b-1",          vaccine: "Hepatitis B",           cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Hepatitis B",                  mandate: "uip", doseSeries: "2 of 4" },
  { id: "rotavirus-1",      vaccine: "Rotavirus",             cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Rotavirus gastroenteritis",    mandate: "uip", doseSeries: "1 of 3" },
  { id: "pcv-1",            vaccine: "PCV",                   cohort: "infant", offsetDays: 42,   windowDays: 7,   protectsAgainst: "Pneumococcus",                 mandate: "iap_recommended", doseSeries: "1 of 3" },

  // ─ 10 weeks ─────────────────────────────────────────────
  { id: "dtwp-2",           vaccine: "DTwP / DTaP",           cohort: "infant", offsetDays: 70,   windowDays: 7,   protectsAgainst: "Diphtheria, Pertussis, Tetanus", mandate: "uip", doseSeries: "2 of 5" },
  { id: "hib-2",            vaccine: "Hib",                   cohort: "infant", offsetDays: 70,   windowDays: 7,   protectsAgainst: "Haemophilus influenzae b",     mandate: "uip", doseSeries: "2 of 3" },
  { id: "ipv-2",            vaccine: "IPV / OPV",             cohort: "infant", offsetDays: 70,   windowDays: 7,   protectsAgainst: "Polio",                        mandate: "uip", doseSeries: "2 of 3" },
  { id: "rotavirus-2",      vaccine: "Rotavirus",             cohort: "infant", offsetDays: 70,   windowDays: 7,   protectsAgainst: "Rotavirus",                    mandate: "uip", doseSeries: "2 of 3" },
  { id: "pcv-2",            vaccine: "PCV",                   cohort: "infant", offsetDays: 70,   windowDays: 7,   protectsAgainst: "Pneumococcus",                 mandate: "iap_recommended", doseSeries: "2 of 3" },

  // ─ 14 weeks ─────────────────────────────────────────────
  { id: "dtwp-3",           vaccine: "DTwP / DTaP",           cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Diphtheria, Pertussis, Tetanus", mandate: "uip", doseSeries: "3 of 5" },
  { id: "hib-3",            vaccine: "Hib",                   cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Haemophilus influenzae b",     mandate: "uip", doseSeries: "3 of 3" },
  { id: "ipv-3",            vaccine: "IPV / OPV",             cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Polio",                        mandate: "uip", doseSeries: "3 of 3" },
  { id: "hep-b-2",          vaccine: "Hepatitis B",           cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Hepatitis B",                  mandate: "uip", doseSeries: "3 of 4" },
  { id: "rotavirus-3",      vaccine: "Rotavirus",             cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Rotavirus",                    mandate: "uip", doseSeries: "3 of 3" },
  { id: "pcv-3",            vaccine: "PCV",                   cohort: "infant", offsetDays: 98,   windowDays: 7,   protectsAgainst: "Pneumococcus",                 mandate: "iap_recommended", doseSeries: "3 of 3" },

  // ─ 6 months ─────────────────────────────────────────────
  { id: "flu-6mo",          vaccine: "Influenza (yearly)",    cohort: "infant", offsetDays: 180,  windowDays: 30,  protectsAgainst: "Seasonal flu",                 mandate: "iap_recommended", doseSeries: "annual" },

  // ─ 9 months ─────────────────────────────────────────────
  { id: "mr-1",             vaccine: "Measles, Rubella (MR)", cohort: "infant", offsetDays: 270,  windowDays: 14,  protectsAgainst: "Measles, Rubella",             mandate: "uip", doseSeries: "1 of 2" },
  { id: "je-1",             vaccine: "JE (endemic areas)",    cohort: "infant", offsetDays: 270,  windowDays: 14,  protectsAgainst: "Japanese encephalitis",        mandate: "uip", doseSeries: "1 of 2" },

  // ─ 12-15 months ─────────────────────────────────────────
  { id: "hep-a-1",          vaccine: "Hepatitis A",           cohort: "infant", offsetDays: 365,  windowDays: 30,  protectsAgainst: "Hepatitis A",                  mandate: "iap_recommended", doseSeries: "1 of 2" },
  { id: "varicella-1",      vaccine: "Varicella",             cohort: "infant", offsetDays: 450,  windowDays: 30,  protectsAgainst: "Chickenpox",                   mandate: "iap_recommended", doseSeries: "1 of 2" },

  // ─ 16-18 months booster ─────────────────────────────────
  { id: "dtwp-4",           vaccine: "DTwP / DTaP booster",   cohort: "child",  offsetDays: 540,  windowDays: 60,  protectsAgainst: "Diphtheria, Pertussis, Tetanus", mandate: "uip", doseSeries: "4 of 5" },
  { id: "mr-2",             vaccine: "Measles, Rubella (MR)", cohort: "child",  offsetDays: 540,  windowDays: 60,  protectsAgainst: "Measles, Rubella",             mandate: "uip", doseSeries: "2 of 2" },

  // ─ 2 years ──────────────────────────────────────────────
  { id: "typhoid-1",        vaccine: "Typhoid conjugate",     cohort: "child",  offsetDays: 730,  windowDays: 60,  protectsAgainst: "Typhoid",                      mandate: "iap_recommended" },

  // ─ 4-6 years ────────────────────────────────────────────
  { id: "dtwp-5",           vaccine: "DTwP / DTaP booster",   cohort: "child",  offsetDays: 1825, windowDays: 180, protectsAgainst: "Diphtheria, Pertussis, Tetanus", mandate: "uip", doseSeries: "5 of 5" },

  // ─ 10-12 years ──────────────────────────────────────────
  { id: "tdap",             vaccine: "Tdap",                  cohort: "adolescent", offsetDays: 3650, windowDays: 365, protectsAgainst: "Tetanus, Diphtheria, Pertussis", mandate: "iap_recommended" },
  { id: "hpv-1",            vaccine: "HPV",                   cohort: "adolescent", offsetDays: 3285, windowDays: 365, protectsAgainst: "Cervical cancer (HPV)",   mandate: "iap_recommended", doseSeries: "1 of 2" },
  { id: "hpv-2",            vaccine: "HPV",                   cohort: "adolescent", offsetDays: 3450, windowDays: 365, protectsAgainst: "Cervical cancer (HPV)",   mandate: "iap_recommended", doseSeries: "2 of 2" },

  // ─ Adult — annual ───────────────────────────────────────
  { id: "flu-adult",        vaccine: "Influenza (annual)",    cohort: "adult",      offsetDays: 6570, windowDays: 60,  protectsAgainst: "Seasonal flu",            mandate: "iap_recommended", doseSeries: "annual" },
  { id: "td-booster",       vaccine: "Td (10-yearly)",        cohort: "adult",      offsetDays: 7300, windowDays: 365, protectsAgainst: "Tetanus, Diphtheria",     mandate: "iap_recommended", doseSeries: "10 yr" },

  // ─ Elderly ─────────────────────────────────────────────
  { id: "pneumo-65",        vaccine: "Pneumococcal (PPSV23)", cohort: "elderly",    offsetDays: 23725, windowDays: 365, protectsAgainst: "Pneumococcal disease",  mandate: "iap_recommended" },
  { id: "zoster-50",        vaccine: "Herpes zoster",         cohort: "elderly",    offsetDays: 18250, windowDays: 365, protectsAgainst: "Shingles",              mandate: "iap_recommended" },

  // ─ Travel ──────────────────────────────────────────────
  { id: "yellow-fever",     vaccine: "Yellow fever",          cohort: "travel",     offsetDays: 0,    windowDays: 0,   protectsAgainst: "Yellow fever (Africa/SA travel)", mandate: "travel" },
  { id: "rabies-pre-exp",   vaccine: "Rabies (pre-exposure)", cohort: "travel",     offsetDays: 0,    windowDays: 0,   protectsAgainst: "Rabies",                  mandate: "travel" },
  { id: "typhoid-travel",   vaccine: "Typhoid (travel)",      cohort: "travel",     offsetDays: 0,    windowDays: 0,   protectsAgainst: "Typhoid (Asia/Africa travel)", mandate: "travel" },

  // ─ Pregnancy ───────────────────────────────────────────
  { id: "tdap-pregnancy",   vaccine: "Tdap (pregnancy)",      cohort: "pregnancy",  offsetDays: 0,    windowDays: 0,   protectsAgainst: "Pertussis (newborn)",     mandate: "iap_recommended" },
  { id: "flu-pregnancy",    vaccine: "Influenza (pregnancy)", cohort: "pregnancy",  offsetDays: 0,    windowDays: 0,   protectsAgainst: "Influenza in pregnancy",  mandate: "iap_recommended" },
];

/** Build the patient's vaccine calendar — each entry with computed
 *  due date relative to DOB + whether it's upcoming / missed / done. */
export function buildSchedule(input: {
  dob: string;
  sex?: "M" | "F" | "X";
  pregnant?: boolean;
  alreadyTaken?: string[]; // entry ids already administered
}): Array<VaccineScheduleEntry & { dueAt: string; status: "upcoming" | "due_now" | "missed" | "done" }> {
  const dob = new Date(input.dob).getTime();
  if (isNaN(dob)) return [];
  const now = Date.now();
  const taken = new Set(input.alreadyTaken || []);

  return INDIA_SCHEDULE
    .filter((e) => {
      // Filter cohorts that don't apply.
      if (e.cohort === "pregnancy" && !input.pregnant) return false;
      if (e.cohort === "travel") return false; // surfaced separately
      // HPV is female-specific in IAP (males optional).
      if (e.id.startsWith("hpv") && input.sex === "M") return false;
      return true;
    })
    .map((e) => {
      const dueAt = new Date(dob + e.offsetDays * 86400000).toISOString();
      const dueAtMs = new Date(dueAt).getTime();
      const windowMs = e.windowDays * 86400000;
      let status: "upcoming" | "due_now" | "missed" | "done";
      if (taken.has(e.id)) status = "done";
      else if (dueAtMs - windowMs > now) status = "upcoming";
      else if (dueAtMs + windowMs < now) status = "missed";
      else status = "due_now";
      return { ...e, dueAt, status };
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
}
