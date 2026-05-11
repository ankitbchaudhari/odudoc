// Standalone module catalog for the staff RBAC picker.
//
// Kept in its own file (no Postgres / persistent-array imports) so
// /admin/staff (a "use client" page) can import these constants
// directly — previously we had to inline a duplicate copy in the
// page because importing from staff-store pulls the tls/fs server-
// only modules into the client bundle.
//
// Mirror of Organization.modules in lib/organizations-store.ts —
// every flag the super-admin can toggle on an org is also an option
// in the per-staff access picker. The org admin sees the full list
// and ticks which ones THIS person should be able to open.

import type { StaffRole } from "./staff-roles";

export type StaffModuleAccess =
  // Core clinical
  | "patients" | "appointments" | "opd" | "ipd" | "encounters"
  | "hospitalRx" | "medicalRecords" | "referrals" | "consentForms"
  | "dischargeSummaries" | "allergiesProblems" | "immunizations"
  | "vitalsEws" | "lab" | "pathology" | "pharmacy" | "pharmacyDispense"
  | "pharmacyInventory" | "billing" | "invoices" | "ot" | "surgery"
  | "inventory" | "radiology" | "telemedicine" | "aiVoice"
  // Inpatient & surgical
  | "wards" | "bedManagement" | "otScheduling" | "preAnesthesia"
  | "icu" | "laborDelivery" | "maternity" | "woundCare"
  | "painManagement" | "oncology" | "cardiology" | "endoscopy"
  | "bloodBank" | "ambulance" | "nicu" | "dialysis" | "physiotherapy"
  | "diet" | "cssd"
  // Front-office & engagement
  | "opdQueue" | "patientFeedback" | "visitors"
  // Workforce
  | "hrPayroll" | "medicalStaff" | "shiftRoster" | "staffScheduling"
  | "dutyHandover"
  // Facilities & compliance
  | "procurement" | "insurance" | "assetManagement" | "biomedical"
  | "biomedicalWaste" | "housekeeping" | "linenLaundry"
  | "infectionControl" | "incidentReports" | "emergencyCodes"
  | "mortuary" | "multiBranch" | "analytics" | "audit"
  // Patient engagement
  | "patientPortal" | "whatsappEngagement"
  // Specialty clinical
  | "dental" | "ophthalmology" | "psychiatry" | "ent" | "orthopedics"
  | "rehab" | "tumorBoard" | "mortalityAudit" | "medicalGas"
  | "antimicrobialStewardship" | "clinicalPathways" | "corporateEmpanelment"
  | "nursingCare" | "formulary" | "healthCamps" | "quality"
  | "credentialing" | "mrd"
  // Diagnostics / reports
  | "reports"
  // Q3 2026 capability batch
  | "orgBranding" | "miniWebsite" | "surgeryVideo" | "biometricEmergency"
  | "antiCounterfeit" | "pharmaCatalogue" | "pharmaPartners"
  | "pharmaPromo" | "orgVacancies" | "educationPartner"
  | "voiceBookingBot" | "whatsappBookingBot" | "aiCreditPool"
  | "aiPricingOverride" | "mlTrainingQueue" | "carePlans" | "symptomLog"
  | "vaccinations" | "documentVault" | "auditLog" | "emergencyProfile"
  | "vitalAlerts" | "consumablesBilling" | "countryTax"
  | "watermarkedReports" | "referralCommissions" | "healthTimeline"
  | "adherence" | "shareTokens" | "triagePalette";

export const STAFF_MODULE_LABELS: Record<StaffModuleAccess, string> = {
  // Core clinical
  patients: "Patients",
  appointments: "Appointments",
  opd: "OPD",
  ipd: "Admissions (IPD)",
  encounters: "Encounters",
  hospitalRx: "Hospital Rx",
  medicalRecords: "Medical Records",
  referrals: "Referrals",
  consentForms: "Consent Forms",
  dischargeSummaries: "Discharge Summaries",
  allergiesProblems: "Allergies & Problems",
  immunizations: "Immunizations",
  vitalsEws: "Vitals & EWS",
  lab: "Lab Orders",
  pathology: "Pathology",
  pharmacy: "Pharmacy",
  pharmacyDispense: "Pharmacy Dispense",
  pharmacyInventory: "Pharmacy Inventory",
  billing: "Billing",
  invoices: "Invoices",
  ot: "Operation Theatre",
  surgery: "Surgery / OT",
  inventory: "Inventory",
  radiology: "Radiology",
  telemedicine: "Telemedicine",
  aiVoice: "AI Voice",
  // Inpatient & surgical
  wards: "Wards",
  bedManagement: "Wards & Beds",
  otScheduling: "OT Scheduling",
  preAnesthesia: "Pre-Anesthesia",
  icu: "ICU / Critical Care",
  laborDelivery: "Labor & Delivery",
  maternity: "Maternity",
  woundCare: "Wound Care",
  painManagement: "Pain Management",
  oncology: "Oncology & Chemo",
  cardiology: "Cardiology",
  endoscopy: "Endoscopy",
  bloodBank: "Blood Bank",
  ambulance: "Ambulance",
  nicu: "NICU",
  dialysis: "Dialysis",
  physiotherapy: "Physiotherapy",
  diet: "Dietary Orders",
  cssd: "CSSD Sterilization",
  // Front-office & engagement
  opdQueue: "OPD Queue",
  patientFeedback: "Patient Feedback",
  visitors: "Visitors",
  // Workforce
  hrPayroll: "HR & Payroll",
  medicalStaff: "Medical Staff",
  shiftRoster: "Shift Roster",
  staffScheduling: "Staff Scheduling",
  dutyHandover: "Duty Handover",
  // Facilities & compliance
  procurement: "Procurement",
  insurance: "Insurance / TPA",
  assetManagement: "Asset Management",
  biomedical: "Biomedical",
  biomedicalWaste: "Biomedical Waste",
  housekeeping: "Housekeeping",
  linenLaundry: "Linen & Laundry",
  infectionControl: "Infection Control",
  incidentReports: "Incident Reports",
  emergencyCodes: "Emergency Codes",
  mortuary: "Mortuary",
  multiBranch: "Multi-Branch",
  analytics: "Analytics",
  audit: "Audit",
  // Patient engagement
  patientPortal: "Patient Portal",
  whatsappEngagement: "WhatsApp Engagement",
  // Specialty clinical
  dental: "Dental",
  ophthalmology: "Ophthalmology",
  psychiatry: "Psychiatry",
  ent: "ENT",
  orthopedics: "Orthopedics",
  rehab: "Rehabilitation",
  tumorBoard: "Tumor Board",
  mortalityAudit: "M&M Audit",
  medicalGas: "Medical Gas",
  antimicrobialStewardship: "AMSP",
  clinicalPathways: "Clinical Pathways",
  corporateEmpanelment: "Corporate Empanelment",
  nursingCare: "Nursing Care",
  formulary: "Formulary",
  healthCamps: "Health Camps",
  quality: "Quality (NABH)",
  credentialing: "Credentialing",
  mrd: "Medical Records (MRD)",
  // Diagnostics / reports
  reports: "Reports & Audit",
  // Q3 2026 capability batch
  orgBranding: "Org Branding",
  miniWebsite: "Mini-Website",
  surgeryVideo: "Surgery Video",
  biometricEmergency: "Biometric Kiosk",
  antiCounterfeit: "Anti-Counterfeit",
  pharmaCatalogue: "Pharma · Drugs",
  pharmaPartners: "Pharma · Partners",
  pharmaPromo: "Pharma · Promo",
  orgVacancies: "Org Vacancies",
  educationPartner: "Education Partners",
  voiceBookingBot: "Voice Booking Bot",
  whatsappBookingBot: "WhatsApp Bot",
  aiCreditPool: "AI Credit Pool",
  aiPricingOverride: "AI Pricing",
  mlTrainingQueue: "ML Training Queue",
  carePlans: "Care Plans",
  symptomLog: "Symptom Log",
  vaccinations: "Vaccinations",
  documentVault: "Document Vault",
  auditLog: "Audit Log",
  emergencyProfile: "Emergency Profile",
  vitalAlerts: "Vital Alerts",
  consumablesBilling: "Consumables Billing",
  countryTax: "Country Tax",
  watermarkedReports: "Watermarked Reports",
  referralCommissions: "Referral Commissions",
  healthTimeline: "Health Timeline",
  adherence: "Adherence",
  shareTokens: "Share Tokens",
  triagePalette: "Triage Palette",
};

// Sensible per-role defaults so a freshly-added staff member already
// has access to the modules their job needs. Admin gets everything;
// clinical roles get a bundle aligned to their specialty.
export const STAFF_ROLE_DEFAULT_ACCESS: Record<StaffRole, StaffModuleAccess[]> = {
  doctor: [
    "patients", "appointments", "opd", "ipd", "encounters", "hospitalRx",
    "medicalRecords", "consentForms", "dischargeSummaries",
    "allergiesProblems", "vitalsEws", "lab", "radiology", "telemedicine",
    "cardiology", "icu", "wards", "bedManagement", "ot", "otScheduling",
    "preAnesthesia", "painManagement", "oncology", "woundCare",
  ],
  resident: [
    "patients", "appointments", "opd", "ipd", "encounters", "hospitalRx",
    "vitalsEws", "lab", "radiology", "wards", "bedManagement", "icu",
  ],
  nurse: [
    "patients", "appointments", "vitalsEws", "wards", "bedManagement",
    "ipd", "icu", "woundCare", "nursingCare", "dutyHandover",
    "painManagement",
  ],
  technician: [
    "lab", "radiology", "inventory", "pathology", "biomedical",
  ],
  pharmacist: [
    "pharmacy", "pharmacyDispense", "pharmacyInventory", "inventory",
    "formulary", "antimicrobialStewardship",
  ],
  radiographer: ["radiology"],
  admin: Object.keys({} as Record<StaffModuleAccess, true>) as StaffModuleAccess[],
  housekeeping: ["housekeeping", "linenLaundry"],
  other: [],
};

// Populate admin → all modules at module load (TS doesn't let us spread
// a Record's keys into an array literal). This stays in sync with the
// label map even if new modules get added later.
STAFF_ROLE_DEFAULT_ACCESS.admin = Object.keys(STAFF_MODULE_LABELS) as StaffModuleAccess[];

/** Resolve effective access — legacy rows without `moduleAccess` get
 *  their role's defaults so the UI doesn't show "no access" for
 *  everyone overnight. */
export function effectiveModuleAccess(s: {
  moduleAccess?: StaffModuleAccess[];
  role: StaffRole;
}): StaffModuleAccess[] {
  if (Array.isArray(s.moduleAccess)) return s.moduleAccess;
  return STAFF_ROLE_DEFAULT_ACCESS[s.role] ?? [];
}

/** Drop unknown values + dedupe so a malicious / stale client can't
 *  smuggle bogus module ids into the persisted record. */
export function sanitizeModuleAccess(values: unknown[]): StaffModuleAccess[] {
  const valid = new Set(Object.keys(STAFF_MODULE_LABELS) as StaffModuleAccess[]);
  const seen = new Set<StaffModuleAccess>();
  for (const v of values) {
    if (typeof v === "string" && valid.has(v as StaffModuleAccess)) {
      seen.add(v as StaffModuleAccess);
    }
  }
  return Array.from(seen);
}
