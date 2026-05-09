// Coverage policy engine.
//
// Pure function. Given a procedure code, sum insured, plan-room
// category, and a few patient inputs (age band, pre-existing
// disease declared), returns an estimate of how much the policy
// will cover and what the patient's likely out-of-pocket is. Final
// numbers come from the TPA after pre-auth — this is the
// "show the patient a sticker price before they agree to admission"
// estimator that drives the booking-friction reduction.
//
// We keep the rules transparent (no LLM): each rule traces to either
// the IRDAI standard waiting-period table or the typical TPA tariff
// schedule. Hospitals tweak the tariffs in their empanelment row;
// the engine reads from the curated PROCEDURE_TARIFFS table below.

export type RoomCategory =
  | "general_ward"
  | "twin_sharing"
  | "single_ac"
  | "deluxe"
  | "icu";

export interface ProcedureTariff {
  code: string;          // internal procedure code
  name: string;          // display name
  category: "consult" | "diagnostic" | "surgical" | "ipd" | "maternity" | "dental" | "ophthalmic";
  /** Typical hospital-published tariff in INR rupees. */
  tariffRupees: number;
  /** Standard length-of-stay used for room-rent estimates. */
  losDays?: number;
  /** Common ICD-10 code attached to the procedure. */
  icd10?: string;
  /** Whether this procedure is in the IRDAI "exclusion / sub-limit"
   *  bucket. We surface a warning when so. */
  hasSubLimit?: boolean;
  /** Standard waiting period in months for this procedure. New
   *  policies don't cover before this elapses. */
  waitingPeriodMonths?: number;
}

// Curated catalogue of ~30 frequent admissions / procedures. Easy to
// extend as the platform grows.
export const PROCEDURE_TARIFFS: ProcedureTariff[] = [
  // Cardiology
  { code: "CARD-PCI", name: "Primary PCI with stent", category: "ipd", tariffRupees: 245000, losDays: 4, icd10: "I21.9" },
  { code: "CARD-CABG", name: "Coronary artery bypass graft (CABG)", category: "ipd", tariffRupees: 360000, losDays: 8, icd10: "Z95.1" },
  { code: "CARD-AGIO", name: "Coronary angiography (diagnostic)", category: "ipd", tariffRupees: 28000, losDays: 1, icd10: "Z95.5" },
  { code: "CARD-PACE", name: "Permanent pacemaker implant", category: "ipd", tariffRupees: 195000, losDays: 3, hasSubLimit: true },
  // GI / surgical
  { code: "GI-LAPCH", name: "Laparoscopic cholecystectomy", category: "surgical", tariffRupees: 75000, losDays: 2, icd10: "K80.20" },
  { code: "GI-APP",   name: "Appendicectomy", category: "surgical", tariffRupees: 55000, losDays: 2, icd10: "K35.80" },
  { code: "GI-HER",   name: "Inguinal hernia repair", category: "surgical", tariffRupees: 48000, losDays: 1, hasSubLimit: true },
  { code: "GI-PILE",  name: "Haemorrhoidectomy / piles surgery", category: "surgical", tariffRupees: 42000, losDays: 2, hasSubLimit: true, waitingPeriodMonths: 24 },
  // ENT / ortho / uro
  { code: "ENT-TONSIL", name: "Tonsillectomy", category: "surgical", tariffRupees: 35000, losDays: 1, hasSubLimit: true, waitingPeriodMonths: 24 },
  { code: "ORTHO-TKR",  name: "Total knee replacement (unilateral)", category: "ipd", tariffRupees: 235000, losDays: 5, hasSubLimit: true, waitingPeriodMonths: 24 },
  { code: "ORTHO-THR",  name: "Total hip replacement (unilateral)", category: "ipd", tariffRupees: 285000, losDays: 5, hasSubLimit: true, waitingPeriodMonths: 24 },
  { code: "ORTHO-FIX",  name: "ORIF for fracture", category: "ipd", tariffRupees: 95000, losDays: 4 },
  { code: "URO-TURP",   name: "TURP for BPH", category: "surgical", tariffRupees: 78000, losDays: 3, icd10: "N40.0", hasSubLimit: true, waitingPeriodMonths: 24 },
  { code: "URO-STONE",  name: "Lithotripsy / ureteroscopy for stone", category: "surgical", tariffRupees: 55000, losDays: 2, icd10: "N20.0" },
  // Maternity / paediatric
  { code: "MAT-NORM",   name: "Normal vaginal delivery", category: "maternity", tariffRupees: 45000, losDays: 2, waitingPeriodMonths: 9 },
  { code: "MAT-CSEC",   name: "C-section delivery", category: "maternity", tariffRupees: 75000, losDays: 4, waitingPeriodMonths: 9 },
  { code: "PED-NICU",   name: "NICU admission (per day)", category: "ipd", tariffRupees: 12000, losDays: 1 },
  // Oncology
  { code: "ONCO-CHEMO", name: "Chemotherapy cycle (day-care)", category: "ipd", tariffRupees: 35000, losDays: 1 },
  { code: "ONCO-RAD",   name: "Radiotherapy session", category: "ipd", tariffRupees: 18000, losDays: 0 },
  // Diagnostic / consult
  { code: "DIAG-MRI",   name: "MRI scan (single region)", category: "diagnostic", tariffRupees: 9500, losDays: 0 },
  { code: "DIAG-CT",    name: "CT scan with contrast", category: "diagnostic", tariffRupees: 6500, losDays: 0 },
  { code: "DIAG-USG",   name: "Ultrasonography", category: "diagnostic", tariffRupees: 1800, losDays: 0 },
  { code: "DIAG-CXR",   name: "Chest X-ray", category: "diagnostic", tariffRupees: 600, losDays: 0 },
  { code: "DIAG-LAB",   name: "Routine lab panel (CBC + LFT + KFT)", category: "diagnostic", tariffRupees: 2500, losDays: 0 },
  { code: "CON-OPD",    name: "OPD consultation", category: "consult", tariffRupees: 800, losDays: 0 },
  { code: "CON-FOLLOW", name: "Follow-up consultation", category: "consult", tariffRupees: 500, losDays: 0 },
  // Dental / ophthalmic (typically excluded — surfaced for honesty)
  { code: "DENT-RCT",   name: "Root canal treatment", category: "dental", tariffRupees: 12000, hasSubLimit: true },
  { code: "OPH-CAT",    name: "Cataract surgery", category: "ophthalmic", tariffRupees: 28000, hasSubLimit: true, waitingPeriodMonths: 24 },
  // ICU / medical
  { code: "MED-ICU",    name: "ICU admission (per day)", category: "ipd", tariffRupees: 18000, losDays: 1 },
  { code: "MED-WARD",   name: "Medical ward admission (per day)", category: "ipd", tariffRupees: 6500, losDays: 1 },
];

export function findProcedure(code: string): ProcedureTariff | null {
  return PROCEDURE_TARIFFS.find((p) => p.code === code) || null;
}

// ── Room-rent caps by plan tier ─────────────────────────────────
// Most retail policies cap room rent to a percentage of sum insured.
// We codify the typical caps; specific policies may differ.
export interface RoomRentCap {
  category: RoomCategory;
  /** Cap as % of sum insured per day. */
  capPctPerDay: number;
  /** Reasonable display label. */
  label: string;
}

export const ROOM_RENT_CAPS: Record<RoomCategory, RoomRentCap> = {
  general_ward:  { category: "general_ward",  capPctPerDay: 1.0, label: "General ward" },
  twin_sharing:  { category: "twin_sharing",  capPctPerDay: 1.5, label: "Twin-sharing" },
  single_ac:     { category: "single_ac",     capPctPerDay: 2.0, label: "Single AC" },
  deluxe:        { category: "deluxe",        capPctPerDay: 2.5, label: "Deluxe / suite" },
  icu:           { category: "icu",           capPctPerDay: 3.0, label: "ICU" },
};

// ── Estimate ─────────────────────────────────────────────────────
export interface CoverageEstimateInput {
  procedureCode: string;
  sumInsuredRupees: number;
  /** Discount % the empanelled hospital extends (cuts gross). */
  empanelmentDiscountPct?: number;
  roomCategory?: RoomCategory;
  /** Patient declared this procedure as a pre-existing condition? */
  preExisting?: boolean;
  /** Months since the policy was first issued. Used for waiting-period
   *  enforcement. */
  policyAgeMonths?: number;
  /** Co-pay percentage on the patient (some senior-citizen plans
   *  include 20% mandatory co-pay). */
  coPayPct?: number;
  /** Was the procedure / condition declared a "specific exclusion"
   *  on the policy schedule? Hard zero coverage if true. */
  excluded?: boolean;
}

export interface CoverageWarning {
  severity: "block" | "warn" | "info";
  message: string;
}

export interface CoverageEstimate {
  procedure: ProcedureTariff;
  /** Bill total before any insurance application. */
  grossRupees: number;
  /** After hospital empanelment discount. */
  netRupees: number;
  /** Estimated insurer payout. */
  insurerPaysRupees: number;
  /** Estimated patient out-of-pocket. */
  patientPaysRupees: number;
  warnings: CoverageWarning[];
  /** Stretched-out itemisation for the UI. */
  breakdown: Array<{ label: string; amount: number }>;
  /** A 0-100 confidence on the estimate; lower when room category
   *  isn't known or sub-limits make outcome variable. */
  confidence: number;
}

export function estimateCoverage(input: CoverageEstimateInput): CoverageEstimate | null {
  const proc = findProcedure(input.procedureCode);
  if (!proc) return null;

  const warnings: CoverageWarning[] = [];
  let confidence = 0.85;
  const breakdown: CoverageEstimate["breakdown"] = [];

  // ── Gross + room rent ────────────────────────────────────────
  const baseTariff = proc.tariffRupees;
  let roomRent = 0;
  if (proc.losDays && input.roomCategory) {
    const cap = ROOM_RENT_CAPS[input.roomCategory];
    roomRent = (input.sumInsuredRupees * cap.capPctPerDay / 100) * proc.losDays;
  }
  const gross = baseTariff + roomRent;
  breakdown.push({ label: `Procedure tariff: ${proc.name}`, amount: baseTariff });
  if (roomRent > 0 && input.roomCategory) {
    breakdown.push({ label: `Room rent (${ROOM_RENT_CAPS[input.roomCategory].label}, ${proc.losDays}d)`, amount: roomRent });
  }

  // ── Hospital empanelment discount ────────────────────────────
  const discount = input.empanelmentDiscountPct ?? 0;
  const net = gross * (1 - discount / 100);
  if (discount > 0) {
    breakdown.push({ label: `Empanelment discount (${discount}%)`, amount: -(gross - net) });
  }

  // ── Hard-block conditions ─────────────────────────────────────
  if (input.excluded) {
    warnings.push({ severity: "block", message: "This procedure is listed as a specific exclusion on your policy." });
    return {
      procedure: proc,
      grossRupees: Math.round(gross),
      netRupees: Math.round(net),
      insurerPaysRupees: 0,
      patientPaysRupees: Math.round(net),
      warnings,
      breakdown,
      confidence: 0.95,
    };
  }
  if (proc.waitingPeriodMonths && (input.policyAgeMonths ?? 0) < proc.waitingPeriodMonths) {
    warnings.push({
      severity: "block",
      message: `${proc.waitingPeriodMonths}-month waiting period not yet served (current age ${input.policyAgeMonths ?? 0}m). Insurer will reject the claim.`,
    });
    return {
      procedure: proc,
      grossRupees: Math.round(gross),
      netRupees: Math.round(net),
      insurerPaysRupees: 0,
      patientPaysRupees: Math.round(net),
      warnings,
      breakdown,
      confidence: 0.9,
    };
  }
  if (input.preExisting && (input.policyAgeMonths ?? 0) < 36) {
    warnings.push({
      severity: "block",
      message: "Pre-existing disease standard waiting period (36 months) not yet served.",
    });
    return {
      procedure: proc,
      grossRupees: Math.round(gross),
      netRupees: Math.round(net),
      insurerPaysRupees: 0,
      patientPaysRupees: Math.round(net),
      warnings,
      breakdown,
      confidence: 0.9,
    };
  }

  // ── Soft warnings ─────────────────────────────────────────────
  if (proc.hasSubLimit) {
    warnings.push({ severity: "warn", message: "This procedure typically has a sub-limit on retail policies — final payout may be capped." });
    confidence -= 0.15;
  }
  if (!input.roomCategory && proc.losDays) {
    warnings.push({ severity: "info", message: "Room category not selected — room-rent estimate not included." });
    confidence -= 0.1;
  }
  if (net > input.sumInsuredRupees) {
    warnings.push({
      severity: "warn",
      message: `Estimated bill (₹${Math.round(net).toLocaleString("en-IN")}) exceeds sum insured (₹${input.sumInsuredRupees.toLocaleString("en-IN")}). Patient pays the excess.`,
    });
  }

  // ── Insurer payout ────────────────────────────────────────────
  // 1. cap to sum insured
  let insurerPays = Math.min(net, input.sumInsuredRupees);
  // 2. apply co-pay
  const coPay = input.coPayPct ?? 0;
  if (coPay > 0) {
    const coPayAmount = insurerPays * (coPay / 100);
    breakdown.push({ label: `Co-pay (${coPay}% on patient)`, amount: -coPayAmount });
    insurerPays -= coPayAmount;
  }
  // 3. excess goes to patient
  const patientPays = net - insurerPays;

  breakdown.push({ label: "Insurer pays (estimated)", amount: insurerPays });
  breakdown.push({ label: "Patient pays (estimated)", amount: patientPays });

  return {
    procedure: proc,
    grossRupees: Math.round(gross),
    netRupees: Math.round(net),
    insurerPaysRupees: Math.round(insurerPays),
    patientPaysRupees: Math.round(patientPays),
    warnings,
    breakdown: breakdown.map((b) => ({ ...b, amount: Math.round(b.amount) })),
    confidence: Math.max(0.4, Math.min(0.95, confidence)),
  };
}
