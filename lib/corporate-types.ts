// Single source of truth for the 13 corporate sub-types referenced
// across the public site, the For organisations header mega menu, the
// /signup/corporate picker, and each sub-type landing page.
//
// Spec: v6.3 Section 58 / Cowork_Complete Section 3 / Header_Footer_Final
// Section 3.

export interface CorporateType {
  slug: string;          // /signup/corporate/<slug>
  name: string;          // "Hospitals"
  singular: string;      // "Hospital" — used in hero + body copy
  emoji: string;
  group: "Healthcare" | "Commerce" | "Education";
  tier: "Starter" | "Clinic Pro" | "Hospital" | "Enterprise";
  tagline: string;       // One-line value prop
  heroLine: string;      // Headline for the landing page hero
  features: string[];    // 6–10 bullets for the landing page body
  whoFor: string;        // Who this is right for
  /** Whether this sub-type accepts self-signup. Student/intern is
   *  invitation-only; everything else has a Get-started CTA. */
  selfSignup: boolean;
}

export const CORPORATE_TYPES: CorporateType[] = [
  // ── Healthcare ─────────────────────────────────────────────────
  {
    slug: "hospital",
    name: "Hospitals",
    singular: "Hospital",
    emoji: "🏥",
    group: "Healthcare",
    tier: "Hospital",
    tagline: "Full hospital management system — OPD, IPD, OT, ICU, ER on one platform.",
    heroLine: "Run your entire hospital on a single AI-powered platform.",
    features: [
      "Full HMS with 11 admin groups (Identity / Clinical / Pharmacy / Finance / Quality / Integrations / Notifications / Reports / Configuration / Departments / Overview)",
      "OPD queue + IPD bed management + OT scheduling + ICU dashboard + ER triage",
      "IV MAR safety + Code Blue + DNR registry + clinical pathways",
      "Pharmacy with 7 store classes + narcotic register + anti-counterfeit chain",
      "Radiology with PACS integration + DICOM viewer + structured reports",
      "NABH / JCI accreditation tracker + mortality audit + infection control",
      "Multi-branch chain rollup with cross-site patient record",
      "Ambient AI scribe + 5-language voice Rx + drug-interaction safety",
      "150+ clinical and operational modules",
    ],
    whoFor: "Hospitals with IPD beds, OT, and multi-department staff. Pilot-friendly for 50-300 bed facilities; enterprise tier for chains 1000+ beds.",
    selfSignup: true,
  },
  {
    slug: "clinic",
    name: "Clinics",
    singular: "Clinic",
    emoji: "🩺",
    group: "Healthcare",
    tier: "Clinic Pro",
    tagline: "OPD-only operations — receptionist, manager, in-clinic pharmacy, TPA cashless.",
    heroLine: "Everything your clinic needs to run a tight OPD.",
    features: [
      "Reception + manager + doctor roles with permission scoping",
      "OPD queue + token printer + walk-in registration",
      "In-clinic pharmacy + dispense at the window",
      "TPA empanelment + cashless claims to insurance partners",
      "Referrals out to specialists / hospitals in the OduDoc network",
      "GST-compliant invoicing + monthly statements",
      "Lab orders to partner labs + result PDFs",
      "Voice prescription in 5 Indian languages",
    ],
    whoFor: "Standalone clinics with 1-10 staff. Multi-doctor support included. Skip the inpatient modules you don't need.",
    selfSignup: true,
  },
  {
    slug: "pathology-lab",
    name: "Pathology labs",
    singular: "Pathology lab",
    emoji: "🧪",
    group: "Healthcare",
    tier: "Hospital",
    tagline: "Sample-to-result workflow with LOINC-coded tests and chain-of-custody.",
    heroLine: "From sample collection to signed report — every step traced.",
    features: [
      "17 test classes (haematology, biochemistry, microbiology, histopath, cytology, immunology, molecular, …)",
      "LOINC-coded test master with reference ranges per age/sex",
      "Sample tracking from collection → receiving → in-process → result → verified → signed",
      "Critical-value escalation + delta-check vs prior result",
      "Chain-of-custody for paternity, drug testing, and forensic samples",
      "Home sample collection with route optimisation",
      "Quality control (Levey-Jennings) + NABL compliance reporting",
      "Patient PDF reports with signed digital certificate",
    ],
    whoFor: "Standalone pathology labs + hospital-attached labs. Single-site to multi-branch chains.",
    selfSignup: true,
  },
  {
    slug: "diagnostic-centre",
    name: "Diagnostic centres",
    singular: "Diagnostic centre",
    emoji: "🩻",
    group: "Healthcare",
    tier: "Clinic Pro",
    tagline: "Imaging with PACS, structured reporting, and teleradiology.",
    heroLine: "Run imaging centres with a real PACS and teleradiology built in.",
    features: [
      "X-ray, ultrasound, CT, MRI, ECG modality worklist",
      "Orthanc PACS + DICOMweb viewer (web-based, no install)",
      "Structured radiology report templates per modality",
      "Teleradiology — outsource over-reads to remote radiologists",
      "Home visits for portable USG / X-ray with route planning",
      "Insurance pre-auth for imaging studies",
      "Patient PDF reports + secure portal access",
    ],
    whoFor: "Diagnostic centres, hospital radiology departments, and teleradiology providers.",
    selfSignup: true,
  },
  {
    slug: "ambulance",
    name: "Ambulance services",
    singular: "Ambulance service",
    emoji: "🚑",
    group: "Healthcare",
    tier: "Clinic Pro",
    tagline: "GPS dispatch + nearest-vehicle routing + live ETA to receiving ER.",
    heroLine: "Cut emergency-response time with GPS-driven dispatch.",
    features: [
      "PostGIS nearest-vehicle dispatch — closest BLS/ALS/ICU unit auto-selected",
      "Live GPS tracking visible to patient + receiving ER",
      "Vehicle fleet management with BLS / ALS / ICU / mortuary classifications",
      "ER connection — incoming patient summary sent to receiving facility",
      "Insurance billing for emergency transport",
      "Daily run reports + driver shift logs",
      "Integration with hospital admit-from-ER workflow",
    ],
    whoFor: "Ambulance service providers — single-vehicle to fleet operators. Government and private both supported.",
    selfSignup: true,
  },
  {
    slug: "home-healthcare",
    name: "Home healthcare",
    singular: "Home healthcare provider",
    emoji: "🏠",
    group: "Healthcare",
    tier: "Clinic Pro",
    tagline: "Dialysis, nursing, physio at home — with live provider tracking.",
    heroLine: "Deliver clinical care at the patient's home, end to end.",
    features: [
      "Dialysis at home with equipment + technician scheduling",
      "Skilled nursing care — 4h, 8h, 24h shifts",
      "Physiotherapy with progress notes + ROM tracking",
      "Live provider tracking visible to patient + family",
      "Subscription packages (weekly / monthly / yearly)",
      "Insurance integration for home-care benefits",
      "EMR sync — home visits write into the patient's main record",
    ],
    whoFor: "Home healthcare agencies offering nursing, dialysis, physiotherapy, or palliative care at home.",
    selfSignup: true,
  },

  // ── Commerce ───────────────────────────────────────────────────
  {
    slug: "pharmacy",
    name: "Pharmacies",
    singular: "Pharmacy",
    emoji: "💊",
    group: "Commerce",
    tier: "Clinic Pro",
    tagline: "7 store classes, drug-schedule enforcement, anti-counterfeit QR chain.",
    heroLine: "Run a compliant, traceable pharmacy from a single tool.",
    features: [
      "7 store classes: medicine / surgical / instruments / OTC / implants / diagnostic consumables / veterinary",
      "Drug-schedule enforcement (OTC / H / H1 / NDPS / Cold chain / AYUSH)",
      "Batch + lot + expiry tracking with FEFO picking",
      "Auto-reorder against par levels with supplier integration",
      "Anti-counterfeit QR chain — every unit verifiable by patient",
      "Narcotic register with biometric pharmacist auth + 3-year retention",
      "Home delivery with route planning + adherence reminders",
      "Cashless claims for empanelled insurance",
    ],
    whoFor: "Standalone pharmacies + hospital-attached pharmacies + chain pharmacies. Online + offline.",
    selfSignup: true,
  },
  {
    slug: "pharma",
    name: "Pharma companies",
    singular: "Pharmaceutical company",
    emoji: "💉",
    group: "Commerce",
    tier: "Enterprise",
    tagline: "Batch-level traceability from manufacture to patient. Recalls in 6 hours.",
    heroLine: "Trace every unit from your factory to the patient who took it.",
    features: [
      "Batch traceability from manufacture → distributor → pharmacy → patient",
      "QR code per unit — patient scans to verify authenticity",
      "Distributor management with empanelled-pharmacy registry",
      "Recall propagation: from regulator alert to patient SMS in 6 hours",
      "Pharmacovigilance — adverse event reporting from connected pharmacies",
      "Formulary submissions to hospital and insurance buyers",
      "Detailing slots + promotional content management",
      "Regulatory paperwork archive (CDSCO, FDA, EMA)",
    ],
    whoFor: "Pharmaceutical manufacturers — generic and branded, small to multinational.",
    selfSignup: true,
  },
  {
    slug: "insurance",
    name: "Insurance companies",
    singular: "Insurance company",
    emoji: "🛡️",
    group: "Commerce",
    tier: "Enterprise",
    tagline: "Pre-auth queue, cashless coordination, fraud detection, marketplace listing.",
    heroLine: "Run health, travel, and medical-tourism insurance on one platform.",
    features: [
      "Pre-authorisation queue with surveyor workflow",
      "Cashless coordination with empanelled hospitals + pharmacies",
      "Fraud detection — ML pattern scoring on claims",
      "Marketplace listing — sell policies directly to OduDoc patients",
      "Health + travel medical + medical tourism product lines",
      "Claims auto-initiated from encounters at empanelled providers",
      "Settlement automation + denial / appeal workflow",
    ],
    whoFor: "Insurance companies offering health, travel medical, or medical-tourism products. New entrants and incumbents both supported.",
    selfSignup: true,
  },
  {
    slug: "service-provider",
    name: "Service-provider doctors",
    singular: "Service-provider doctor",
    emoji: "👨‍⚕️",
    group: "Commerce",
    tier: "Starter",
    tagline: "Teleradiology, second opinions, locum cover — no establishment needed.",
    heroLine: "Sell your services across the network — no clinic required.",
    features: [
      "Teleradiology over-reads for partner diagnostic centres",
      "Second opinions for hospitals (oncology, cardio, neuro)",
      "Locum coverage — fill shift gaps at empanelled clinics",
      "Multi-pod licensing — practise across India / UAE / EU",
      "Service-specific fees — different rates for different service lines",
      "No physical clinic or premises required",
      "Council registration validated by super admin once",
    ],
    whoFor: "Doctors who offer specialist services without a fixed clinic — radiologists, pathologists, second-opinion specialists, locum doctors.",
    selfSignup: true,
  },

  // ── Education ─────────────────────────────────────────────────
  {
    slug: "education",
    name: "Medical institutes",
    singular: "Medical institute",
    emoji: "🎓",
    group: "Education",
    tier: "Clinic Pro",
    tagline: "Student records, intern dual scope, CME with blockchain certificates.",
    heroLine: "Manage students, interns, and CME from one place.",
    features: [
      "Student records with cross-verification by regulators",
      "Intern dual scope — student + provisional doctor permissions",
      "CME courses with blockchain-verified certificates",
      "Council credit tracking per faculty + per student",
      "Faculty evaluation + teaching feedback",
      "Affiliated hospital integration for clinical postings",
    ],
    whoFor: "Medical colleges, nursing institutes, pharmacy schools, allied health schools.",
    selfSignup: true,
  },
  {
    slug: "education-agency",
    name: "Education agencies",
    singular: "Education agency",
    emoji: "🌍",
    group: "Education",
    tier: "Clinic Pro",
    tagline: "List foreign medical programmes — NMC status, FMGE rates, intake calendar.",
    heroLine: "Reach Indian students browsing medical degrees abroad.",
    features: [
      "List foreign medical programmes across 8+ countries",
      "Show NMC / MCI recognition status per programme",
      "FMGE pass rates auto-published",
      "Intake calendar with semester dates",
      "Student enquiry routing — enquiries from /foreign-studies land in your dashboard",
      "Verified-agency badge after super admin approval",
    ],
    whoFor: "Educational agencies and consultants placing Indian students into medical programmes abroad.",
    selfSignup: true,
  },
  {
    slug: "student",
    name: "Students and interns",
    singular: "Student / intern",
    emoji: "📚",
    group: "Education",
    tier: "Starter",
    tagline: "Invitation-only — your medical institute provisions the account.",
    heroLine: "Students join via their institute, not via self-signup.",
    features: [
      "Account is provisioned by your medical institute's admin",
      "Limited work screen — no admin panel, no patient access without supervision",
      "Intern dual scope — student permissions + provisional doctor permissions at clinical postings",
      "CME progress tracking + blockchain certificates on completion",
      "Auto-transition to verified doctor once council registration is confirmed",
    ],
    whoFor: "MBBS / BDS / BPharm / Nursing students and interns at OduDoc-listed medical institutes.",
    selfSignup: false,
  },
];

export const CORPORATE_GROUPS = ["Healthcare", "Commerce", "Education"] as const;

export function getCorporateType(slug: string): CorporateType | undefined {
  return CORPORATE_TYPES.find((t) => t.slug === slug);
}

export function corporateTypesByGroup(): Record<string, CorporateType[]> {
  const out: Record<string, CorporateType[]> = { Healthcare: [], Commerce: [], Education: [] };
  for (const t of CORPORATE_TYPES) out[t.group].push(t);
  return out;
}
