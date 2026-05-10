// Indian National Immunization Schedule (UIP) — childhood doses,
// adult catch-up, and travel-relevant boosters.
//
// "dueAtDays" anchors each dose to days since birth. We deliberately
// keep this list short and standardized — region-specific extras
// (rotavirus state-by-state, JE in endemic districts, HPV gender
// rollout) layer on top via a future "extra schedule" hook.

export type VaccineCategory = "child" | "adult" | "travel";

export interface VaccineDose {
  /** Stable id — used as the key in MarkedDose.vaccineId. */
  id: string;
  vaccine: string;        // "BCG", "Hepatitis B", "DPT", ...
  doseLabel: string;      // "birth", "1st dose", "booster", "annual"
  category: VaccineCategory;
  /** Days from birth at which this dose is recommended. */
  dueAtDays: number;
  /** Window in either direction — outside this we flag overdue. */
  windowDays?: number;
  /** Free-text note shown on the row. */
  note?: string;
}

const DAY = 1;
const WEEK = 7;
const MONTH = 30;
const YEAR = 365;

// Indian National Immunization Schedule (Universal Immunization Programme)
// + IAP recommendations. dueAtDays is conservative — most sources cite
// "birth", "6 weeks", "10 weeks", "14 weeks", "9 months", etc.
export const SCHEDULE: VaccineDose[] = [
  // Child — UIP
  { id: "bcg",         vaccine: "BCG",                doseLabel: "Birth",       category: "child", dueAtDays: 0,             windowDays: 14,    note: "Single dose, intradermal, left upper arm." },
  { id: "opv-0",       vaccine: "OPV",                doseLabel: "Birth dose",  category: "child", dueAtDays: 0,             windowDays: 14,    note: "Oral polio, given within 15 days of birth." },
  { id: "hepb-0",      vaccine: "Hepatitis B",        doseLabel: "Birth dose",  category: "child", dueAtDays: 0,             windowDays: 1,     note: "Within 24 hours of birth." },
  { id: "opv-1",       vaccine: "OPV",                doseLabel: "1st dose",    category: "child", dueAtDays: 6 * WEEK,      windowDays: 14 },
  { id: "pentavalent-1", vaccine: "Pentavalent (DPT+Hib+HepB)", doseLabel: "1st dose", category: "child", dueAtDays: 6 * WEEK, windowDays: 14 },
  { id: "rotavirus-1", vaccine: "Rotavirus",          doseLabel: "1st dose",    category: "child", dueAtDays: 6 * WEEK,      windowDays: 14 },
  { id: "fipv-1",      vaccine: "Inactivated polio (fIPV)", doseLabel: "1st dose", category: "child", dueAtDays: 6 * WEEK,   windowDays: 14 },
  { id: "pcv-1",       vaccine: "PCV (pneumococcal)", doseLabel: "1st dose",    category: "child", dueAtDays: 6 * WEEK,      windowDays: 14 },
  { id: "opv-2",       vaccine: "OPV",                doseLabel: "2nd dose",    category: "child", dueAtDays: 10 * WEEK,     windowDays: 14 },
  { id: "pentavalent-2", vaccine: "Pentavalent",      doseLabel: "2nd dose",    category: "child", dueAtDays: 10 * WEEK,     windowDays: 14 },
  { id: "rotavirus-2", vaccine: "Rotavirus",          doseLabel: "2nd dose",    category: "child", dueAtDays: 10 * WEEK,     windowDays: 14 },
  { id: "opv-3",       vaccine: "OPV",                doseLabel: "3rd dose",    category: "child", dueAtDays: 14 * WEEK,     windowDays: 14 },
  { id: "pentavalent-3", vaccine: "Pentavalent",      doseLabel: "3rd dose",    category: "child", dueAtDays: 14 * WEEK,     windowDays: 14 },
  { id: "rotavirus-3", vaccine: "Rotavirus",          doseLabel: "3rd dose",    category: "child", dueAtDays: 14 * WEEK,     windowDays: 14 },
  { id: "fipv-2",      vaccine: "Inactivated polio (fIPV)", doseLabel: "2nd dose", category: "child", dueAtDays: 14 * WEEK,  windowDays: 14 },
  { id: "pcv-2",       vaccine: "PCV",                doseLabel: "2nd dose",    category: "child", dueAtDays: 14 * WEEK,     windowDays: 14 },
  { id: "mr-1",        vaccine: "Measles-Rubella",    doseLabel: "1st dose",    category: "child", dueAtDays: 9 * MONTH,     windowDays: 30,    note: "Earliest at 9 completed months." },
  { id: "pcv-booster", vaccine: "PCV",                doseLabel: "Booster",     category: "child", dueAtDays: 9 * MONTH,     windowDays: 30 },
  { id: "je-1",        vaccine: "Japanese Encephalitis", doseLabel: "1st dose", category: "child", dueAtDays: 9 * MONTH,     windowDays: 30,    note: "Endemic states only." },
  { id: "vit-a-1",     vaccine: "Vitamin A",          doseLabel: "1st mega-dose", category: "child", dueAtDays: 9 * MONTH,   windowDays: 30 },
  { id: "dpt-booster-1", vaccine: "DPT",              doseLabel: "Booster 1",   category: "child", dueAtDays: 16 * MONTH,    windowDays: 30 },
  { id: "opv-booster", vaccine: "OPV",                doseLabel: "Booster",     category: "child", dueAtDays: 16 * MONTH,    windowDays: 30 },
  { id: "mr-2",        vaccine: "Measles-Rubella",    doseLabel: "2nd dose",    category: "child", dueAtDays: 16 * MONTH,    windowDays: 30 },
  { id: "je-2",        vaccine: "Japanese Encephalitis", doseLabel: "2nd dose", category: "child", dueAtDays: 16 * MONTH,    windowDays: 30,    note: "Endemic states only." },
  { id: "dpt-booster-2", vaccine: "DPT",              doseLabel: "Booster 2",   category: "child", dueAtDays: 5 * YEAR,      windowDays: 60 },
  { id: "td-10",       vaccine: "Td",                 doseLabel: "Adolescent",  category: "child", dueAtDays: 10 * YEAR,     windowDays: 365 },
  { id: "td-16",       vaccine: "Td",                 doseLabel: "Adolescent",  category: "child", dueAtDays: 16 * YEAR,     windowDays: 365 },

  // Adult — catch-up + ongoing
  { id: "td-adult",    vaccine: "Td (tetanus-diphtheria)", doseLabel: "Every 10 years", category: "adult", dueAtDays: 18 * YEAR, windowDays: 365 * 2 },
  { id: "flu-annual",  vaccine: "Influenza",          doseLabel: "Annual",      category: "adult", dueAtDays: 18 * YEAR,    windowDays: 365,   note: "Recommended yearly, especially at-risk." },
  { id: "covid-booster", vaccine: "COVID-19",         doseLabel: "Booster",     category: "adult", dueAtDays: 18 * YEAR,    windowDays: 365 * 2 },
  { id: "hpv-1",       vaccine: "HPV",                doseLabel: "1st dose",    category: "adult", dueAtDays: 9 * YEAR,     windowDays: 365 * 6, note: "Ideal age 9-14. Catch-up to 26." },
  { id: "hpv-2",       vaccine: "HPV",                doseLabel: "2nd dose",    category: "adult", dueAtDays: 9 * YEAR + 6 * MONTH, windowDays: 365 * 6 },
  { id: "varicella-1", vaccine: "Varicella",          doseLabel: "1st dose",    category: "adult", dueAtDays: 1 * YEAR,     windowDays: 365 * 5, note: "If not received in childhood." },
  { id: "typhoid",     vaccine: "Typhoid",            doseLabel: "Every 3 years", category: "adult", dueAtDays: 2 * YEAR,    windowDays: 365 },

  // Travel
  { id: "yellow-fever", vaccine: "Yellow Fever",      doseLabel: "Single dose", category: "travel", dueAtDays: 9 * MONTH,    windowDays: 365 * 10, note: "Required for some African / South-American countries." },
  { id: "hepa",         vaccine: "Hepatitis A",       doseLabel: "1st dose",    category: "travel", dueAtDays: 1 * YEAR,     windowDays: 365 * 5, note: "Recommended before travel to endemic areas." },
  { id: "rabies-pre",   vaccine: "Rabies (pre-exposure)", doseLabel: "1st dose", category: "travel", dueAtDays: 1 * YEAR,    windowDays: 365 * 5 },
];

export type DoseStatus = "received" | "due" | "upcoming" | "overdue";

export interface ScheduledDoseView extends VaccineDose {
  /** ISO date when this dose is recommended for the given DOB. */
  dueDate: string;
  status: DoseStatus;
  receivedDate?: string;
  notes?: string;
}

export function computeSchedule(dobIso: string, marked: Record<string, { receivedDate: string; notes?: string }>, now = new Date()): ScheduledDoseView[] {
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return [];
  return SCHEDULE.map((d): ScheduledDoseView => {
    const due = new Date(dob.getTime() + d.dueAtDays * 86400_000);
    const dueIso = due.toISOString().slice(0, 10);
    const received = marked[d.id];
    if (received) {
      return { ...d, dueDate: dueIso, status: "received", receivedDate: received.receivedDate, notes: received.notes };
    }
    const window = (d.windowDays || 14) * 86400_000;
    if (now.getTime() < due.getTime() - window) {
      return { ...d, dueDate: dueIso, status: "upcoming" };
    }
    if (now.getTime() > due.getTime() + window) {
      return { ...d, dueDate: dueIso, status: "overdue" };
    }
    return { ...d, dueDate: dueIso, status: "due" };
  });
}
