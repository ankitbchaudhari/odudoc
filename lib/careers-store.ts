// Careers store — job vacancies + applications, Postgres-backed.

import { bindPersistentArray } from "./persistent-array";

export type EmploymentType = "Full-time" | "Part-time" | "Contract" | "Internship";

export interface JobVacancy {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: EmploymentType;
  salary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  postedAt: string;
  active: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter?: string;
  cvFileName: string;
  cvStoredFilename?: string;
  submittedAt: string;
  status: "new" | "reviewing" | "shortlisted" | "rejected" | "hired";
  archivedAt?: string | null;
}

const jobs: JobVacancy[] = [];
const {
  hydrate: hydrateJobs,
  flush: flushJobs,
  reload: reloadJobsInternal,
  tombstone: tombstoneJob,
} = bindPersistentArray<JobVacancy>("careers-jobs", jobs);

const applications: JobApplication[] = [];
const {
  hydrate: hydrateApps,
  flush: flushApps,
  reload: reloadAppsInternal,
  tombstone: tombstoneApp,
} = bindPersistentArray<JobApplication>(
  "careers-applications",
  applications,
  () => []
);

/**
 * Force a fresh read from Postgres before listing. Warm Lambdas keep an
 * in-memory copy of the array, so a DELETE on one Lambda isn't visible to
 * a GET on another until one of them reloads. Public read paths should
 * `await reloadJobs()` / `await reloadApplications()` before returning.
 */
export async function reloadJobs(): Promise<void> {
  await reloadJobsInternal();
}
export async function reloadApplications(): Promise<void> {
  await reloadAppsInternal();
}

// Persistent blocklist of seed vacancy ids that admins have deleted.
// Without this, the seedDepartmentVacancies IIFE re-inserts them on
// every Vercel cold-start, making the Delete button appear broken.
const deletedSeedIds: { id: string }[] = [];
const {
  hydrate: hydrateDeletedSeeds,
  flush: flushDeletedSeeds,
} = bindPersistentArray<{ id: string }>(
  "careers-deleted-seed-ids",
  deletedSeedIds,
  () => []
);

await Promise.all([hydrateJobs(), hydrateApps(), hydrateDeletedSeeds()]);

// One-time cleanup: drop the demo job listings + demo applications that
// shipped with the initial seed. IDs are specific so this is safe to
// re-run and won't touch real data.
(function removeLegacySeedCareers() {
  const legacyJobIds = new Set(["job-001", "job-002", "job-003", "job-004"]);
  const legacyApplIds = new Set(["appl-001", "appl-002"]);
  let jobsDirty = false;
  let applsDirty = false;
  for (let i = jobs.length - 1; i >= 0; i--) {
    if (legacyJobIds.has(jobs[i].id)) {
      jobs.splice(i, 1);
      jobsDirty = true;
    }
  }
  for (let i = applications.length - 1; i >= 0; i--) {
    if (legacyApplIds.has(applications[i].id)) {
      applications.splice(i, 1);
      applsDirty = true;
    }
  }
  if (jobsDirty) flushJobs();
  if (applsDirty) flushApps();
})();

// All roles are fully remote — rewrite any previously-seeded city
// locations on already-persisted rows so the careers page reflects it.
(function normaliseLocationsToRemote() {
  let dirty = false;
  for (const j of jobs) {
    if (j.location !== "Remote") {
      j.location = "Remote";
      dirty = true;
    }
  }
  if (dirty) flushJobs();
})();

// Department vacancy seed. Idempotent — each posting has a stable
// `seed-<slug>` id, so re-runs don't duplicate rows. Admins can edit
// titles/salary/status from the Careers console; only rows that are
// still missing get written.
(function seedDepartmentVacancies() {
  const TEMPLATE: Array<
    Omit<JobVacancy, "id" | "postedAt"> & { seedId: string }
  > = [
    // Core clinical
    {
      seedId: "seed-general-medicine",
      title: "Consultant — General Medicine",
      department: "General Medicine",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹18-28 L / year",
      description:
        "Lead OPD and inpatient care for adult medical patients. Work alongside specialists across cardiology, nephrology, and endocrinology.",
      responsibilities: [
        "Run daily OPD clinics and ward rounds",
        "Admit, stabilise, and discharge medical patients",
        "Document encounters in the OduDoc EMR",
      ],
      requirements: ["MD (General Medicine) or equivalent", "3+ years post-MD experience", "Valid medical council registration"],
      active: true,
    },
    {
      seedId: "seed-cardiology",
      title: "Interventional Cardiologist",
      department: "Cardiology",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹40-65 L / year",
      description:
        "Perform diagnostic and interventional cath-lab procedures at a 200-bed tertiary unit with 24×7 primary PCI capability.",
      responsibilities: [
        "PCI, IVUS, and structural heart procedures",
        "Run cardiology OPD twice weekly",
        "Teach DM cardiology fellows",
      ],
      requirements: ["DM Cardiology", "Independent cath-lab operator for 2+ years", "Comfortable with call rota"],
      active: true,
    },
    {
      seedId: "seed-oncology",
      title: "Medical Oncologist",
      department: "Oncology & Chemo",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹35-55 L / year",
      description:
        "Join our tumour board and deliver chemo / immunotherapy protocols for solid and hematologic malignancies.",
      responsibilities: [
        "Treatment planning for oncology patients",
        "Tumour-board participation",
        "Supervise day-care chemo administration",
      ],
      requirements: ["DM Medical Oncology", "ECMO / port-care familiarity", "Good communication for palliative discussions"],
      active: true,
    },
    {
      seedId: "seed-icu",
      title: "Intensivist — ICU / Critical Care",
      department: "ICU / Critical Care",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹30-48 L / year",
      description:
        "Run our 24-bed mixed medical-surgical ICU with full ventilator, CRRT and ECMO capability.",
      responsibilities: [
        "Lead daily multidisciplinary ICU rounds",
        "Manage ventilation, sepsis, and organ support",
        "Train ICU nursing + junior residents",
      ],
      requirements: ["DM / IDCCM / EDIC", "ACLS + FCCS certified", "Comfortable leading code blue"],
      active: true,
    },
    {
      seedId: "seed-labor-delivery",
      title: "Consultant Obstetrician — Labor & Delivery",
      department: "Labor & Delivery",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹22-38 L / year",
      description:
        "Cover high-risk obstetrics and 24×7 labour-ward call with a team of 3 consultants.",
      responsibilities: [
        "Conduct normal and assisted deliveries",
        "LSCS and emergency obstetric surgery",
        "Run antenatal clinic thrice weekly",
      ],
      requirements: ["MS / DNB Obs & Gyn", "2+ years post-MS experience", "FOGSI membership preferred"],
      active: true,
    },
    {
      seedId: "seed-surgery-ot",
      title: "General Surgeon",
      department: "Surgery / OT",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹25-42 L / year",
      description:
        "Operate laparoscopic and open general-surgery cases; share emergency rota with 4 colleagues.",
      responsibilities: [
        "Perform elective and emergency general-surgery procedures",
        "OPD and inpatient follow-up",
        "Lead OT audit once monthly",
      ],
      requirements: ["MS / DNB General Surgery", "FIAGES or hands-on laparoscopy training", "Valid indemnity cover"],
      active: true,
    },
    {
      seedId: "seed-anesthesia",
      title: "Consultant Anesthesiologist — Pre-Anesthesia",
      department: "Pre-Anesthesia",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹22-36 L / year",
      description:
        "Run the pre-anaesthesia clinic, deliver OT anaesthesia, and cover obstetric epidural service.",
      responsibilities: [
        "PAC evaluations and optimisation",
        "General / regional anaesthesia for elective lists",
        "Labour analgesia cover",
      ],
      requirements: ["MD / DNB Anaesthesia", "Regional anaesthesia proficiency", "BLS + ACLS current"],
      active: true,
    },
    {
      seedId: "seed-dialysis",
      title: "Nephrologist — Dialysis Unit",
      department: "Dialysis",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹28-45 L / year",
      description:
        "Lead a 12-station dialysis unit covering HD, CRRT and peritoneal dialysis patients.",
      responsibilities: [
        "Run dialysis rounds and nephrology OPD",
        "Vascular access planning and review",
        "Transplant workup coordination",
      ],
      requirements: ["DM Nephrology", "Fluent with AV-fistula management", "ISN membership preferred"],
      active: true,
    },
    {
      seedId: "seed-physiotherapy",
      title: "Senior Physiotherapist",
      department: "Physiotherapy",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹6-9 L / year",
      description:
        "Deliver inpatient and outpatient physiotherapy across ortho, neuro and cardiac-rehab referrals.",
      responsibilities: [
        "Assess and treat inpatients post-op and post-stroke",
        "Run cardiac-rehab group sessions twice weekly",
        "Document progress in the EMR",
      ],
      requirements: ["BPT / MPT", "3+ years hospital physio experience", "IAP registration"],
      active: true,
    },
    {
      seedId: "seed-wound-care",
      title: "Wound Care Nurse Specialist",
      department: "Wound Care",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹5-8 L / year",
      description:
        "Dedicated wound-care nurse for diabetic-foot, pressure-injury, and post-op wound review.",
      responsibilities: [
        "Daily dressing rounds across IPD wards",
        "Maintain wound-photography log",
        "Train floor nurses on NPWT devices",
      ],
      requirements: ["B.Sc Nursing + 2 yrs ward exp", "Wound-care certification a plus", "INC-registered"],
      active: true,
    },
    {
      seedId: "seed-endoscopy",
      title: "Endoscopy Technician",
      department: "Endoscopy",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4-6 L / year",
      description:
        "Assist gastroenterologists in a busy endoscopy suite doing 20+ procedures per day.",
      responsibilities: [
        "Scope reprocessing and sterilisation",
        "Patient positioning and sedation monitoring",
        "Inventory of biopsy forceps and snares",
      ],
      requirements: ["Diploma in OT tech or equivalent", "Endoscopy unit experience", "Knowledge of HLD / AER workflow"],
      active: true,
    },
    {
      seedId: "seed-pain-management",
      title: "Pain Management Specialist",
      department: "Pain Management",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹24-38 L / year",
      description:
        "Run fluoroscopy-guided interventional-pain clinic plus inpatient palliative-pain consults.",
      responsibilities: [
        "Nerve blocks, RFA, and epidural steroid injections",
        "Pain OPD three days a week",
        "Collaborate with palliative-care team",
      ],
      requirements: ["MD Anaesthesia + pain fellowship", "Comfortable under C-arm", "Strong communication skills"],
      active: true,
    },
    // Diagnostics
    {
      seedId: "seed-radiology",
      title: "Consultant Radiologist (CT / MRI)",
      department: "Radiology",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹30-50 L / year",
      description:
        "Cross-sectional imaging reporting for a 1.5T MRI and 128-slice CT. Option for hybrid on-site + tele-reporting shifts.",
      responsibilities: [
        "Report CT, MRI, USG and plain films",
        "Perform USG-guided biopsies / drainages",
        "Participate in tumour-board reviews",
      ],
      requirements: ["MD Radiodiagnosis", "Cross-sectional fellowship preferred", "PACS / DICOM familiarity"],
      active: true,
    },
    {
      seedId: "seed-pathology",
      title: "Consultant Pathologist — Histopathology",
      department: "Pathology",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹22-36 L / year",
      description:
        "Sign out surgical-pathology cases with immunohistochemistry and frozen-section support.",
      responsibilities: [
        "Grossing and microscopic reporting",
        "IHC interpretation",
        "Frozen-section intraoperative consults",
      ],
      requirements: ["MD Pathology", "Histopath fellowship desirable", "Digital pathology familiarity"],
      active: true,
    },
    {
      seedId: "seed-lab-orders",
      title: "Lab Technologist — Biochemistry",
      department: "Lab Orders",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-5 L / year",
      description:
        "Run biochemistry and immunoassay analysers for a 500-sample/day core lab.",
      responsibilities: [
        "Sample accessioning and run QC",
        "Analyser maintenance + reagent stock",
        "Release results through LIS",
      ],
      requirements: ["DMLT / BMLT", "1+ yr analyser experience", "Comfortable with night rota"],
      active: true,
    },
    {
      seedId: "seed-blood-bank",
      title: "Blood Bank Officer",
      department: "Blood Bank",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹10-16 L / year",
      description:
        "Oversee a licensed blood bank with 800 units/month throughput including component separation and apheresis.",
      responsibilities: [
        "Donor screening and counselling",
        "Cross-match + component issue",
        "Regulatory compliance (NBTC + drug licensing)",
      ],
      requirements: ["MD Transfusion Medicine or equivalent", "Licensed in-charge experience", "Familiar with NABH-BB"],
      active: true,
    },
    // Pharmacy & inventory
    {
      seedId: "seed-pharmacy-dispense",
      title: "Hospital Pharmacist",
      department: "Pharmacy Dispense",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4-7 L / year",
      description:
        "Dispense inpatient and outpatient pharmacy orders; support ward-round medication review.",
      responsibilities: [
        "Verify and dispense Rx through the OduDoc pharmacy module",
        "Reconcile discharge medication lists",
        "Counsel patients on dosage and interactions",
      ],
      requirements: ["B.Pharm / D.Pharm + state registration", "Hospital pharmacy exp preferred", "Computer-literate for LIS / HIS"],
      active: true,
    },
    {
      seedId: "seed-pharmacy-inventory",
      title: "Pharmacy Inventory Controller",
      department: "Pharmacy Inventory",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹6-9 L / year",
      description:
        "Own multi-store pharmacy inventory: reorder points, expiry rotation, vendor negotiation.",
      responsibilities: [
        "Monthly stock audits across 4 satellite pharmacies",
        "Manage purchase orders and GRNs",
        "Drive near-expiry-rotation policy",
      ],
      requirements: ["B.Pharm + 3 yrs inventory exp", "Familiar with ERP inventory modules", "Strong vendor management skills"],
      active: true,
    },
    // Workforce
    {
      seedId: "seed-medical-staff",
      title: "HR Manager — Medical Staffing",
      department: "Medical Staff",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹12-18 L / year",
      description:
        "Lead clinical recruitment, credentialing and retention programs across a 3-hospital group.",
      responsibilities: [
        "Run doctor / nurse recruitment funnel",
        "Manage credentialing and privileging files",
        "Drive retention + engagement initiatives",
      ],
      requirements: ["MBA HR + 6 yrs healthcare HR", "Strong network in Indian medical colleges", "Comfortable with NABH HR chapter"],
      active: true,
    },
    {
      seedId: "seed-shift-roster",
      title: "Staff Scheduling Coordinator",
      department: "Shift Roster",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4-6 L / year",
      description:
        "Own the master shift roster for nursing and allied health across wards and critical-care units.",
      responsibilities: [
        "Publish weekly rosters by Thursday",
        "Manage leave, swap, and overtime requests",
        "Track fatigue-management rules",
      ],
      requirements: ["Graduate, any stream", "2+ yrs rostering / scheduling exp", "Advanced Excel"],
      active: true,
    },
    {
      seedId: "seed-nursing-ward",
      title: "Staff Nurse — Wards & Beds",
      department: "Wards & Beds",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3.5-5 L / year",
      description:
        "Bedside nursing care across medical and surgical wards on rotating shifts.",
      responsibilities: [
        "Vitals, medication, and IV care",
        "EMR charting on OduDoc",
        "Handover and incident reporting",
      ],
      requirements: ["B.Sc / GNM Nursing", "INC registered", "BLS certified"],
      active: true,
    },
    // Facilities
    {
      seedId: "seed-dietary-orders",
      title: "Clinical Dietitian",
      department: "Dietary Orders",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹5-8 L / year",
      description:
        "Run therapeutic diet orders for IPD and counsel outpatient diabetes / renal / oncology clinics.",
      responsibilities: [
        "Assess and plan IPD therapeutic diets",
        "OPD counselling for lifestyle disease",
        "Coordinate with kitchen for special trays",
      ],
      requirements: ["M.Sc Nutrition / RD", "2+ yrs hospital experience", "Familiar with renal / diabetic diet planning"],
      active: true,
    },
    {
      seedId: "seed-cssd",
      title: "CSSD Supervisor",
      department: "CSSD Sterilization",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹5-8 L / year",
      description:
        "Lead the Central Sterile Supply Department serving 6 OTs and all ward sets.",
      responsibilities: [
        "Drive autoclave QC and validation cycles",
        "Maintain instrument trays and tracking",
        "Train staff on decontamination protocols",
      ],
      requirements: ["Diploma in OT / CSSD", "5+ yrs CSSD experience", "Familiar with NABH / ISO 13485"],
      active: true,
    },
    {
      seedId: "seed-biomedical",
      title: "Biomedical Engineer",
      department: "Biomedical",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹6-10 L / year",
      description:
        "Maintain and calibrate clinical equipment fleet — ventilators, monitors, imaging and lab devices.",
      responsibilities: [
        "Preventive maintenance schedule",
        "Breakdown response and vendor co-ordination",
        "Asset register and AMC tracking",
      ],
      requirements: ["B.E. Biomedical / Electronics", "2+ yrs hospital BME exp", "Familiar with medical-device regulatory basics"],
      active: true,
    },
    {
      seedId: "seed-biomedical-waste",
      title: "Biomedical Waste Officer",
      department: "Biomedical Waste",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4-6 L / year",
      description:
        "Run segregation, colour-coded collection and CBWTF hand-off per BMW Rules 2016.",
      responsibilities: [
        "Daily waste audit across wards and OTs",
        "Coordinate vendor pickups and manifests",
        "Train housekeeping on segregation",
      ],
      requirements: ["B.Sc Environmental / Public Health", "BMW Rules familiarity", "2+ yrs waste-management exp"],
      active: true,
    },
    {
      seedId: "seed-housekeeping",
      title: "Housekeeping Supervisor",
      department: "Housekeeping",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3.5-5 L / year",
      description:
        "Lead housekeeping team across wards, OT, and common areas with hospital-grade cleanliness SLAs.",
      responsibilities: [
        "Daily rounds and spot-check cleanliness",
        "Manage vendor-supplied staff rota",
        "Track consumable inventory",
      ],
      requirements: ["Graduate + 3 yrs hospital housekeeping", "Familiar with infection-control protocols", "Hindi + English fluent"],
      active: true,
    },
    {
      seedId: "seed-linen-laundry",
      title: "Linen & Laundry In-charge",
      department: "Linen & Laundry",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-5 L / year",
      description:
        "Operate in-house laundry or manage outsourced laundry vendor SLA, track linen rotation.",
      responsibilities: [
        "Receive and issue linen across wards",
        "Track condemnation and par levels",
        "QC vendor returns",
      ],
      requirements: ["Graduate, any stream", "Hospital linen experience preferred", "Basic inventory tooling"],
      active: true,
    },
    {
      seedId: "seed-infection-control",
      title: "Infection Control Nurse",
      department: "Infection Control",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹7-10 L / year",
      description:
        "Drive hospital-wide infection surveillance, hand-hygiene audits and CAUTI / CLABSI bundles.",
      responsibilities: [
        "Daily ICU bundle audits",
        "Surveillance reporting to IC committee",
        "Train staff on donning / doffing",
      ],
      requirements: ["B.Sc Nursing + IC course", "3+ yrs IC exp", "NABH / JCI familiarity"],
      active: true,
    },
    // Operations
    {
      seedId: "seed-ambulance-dispatch",
      title: "Ambulance Dispatch Coordinator",
      department: "Ambulance Dispatch",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4-6 L / year",
      description:
        "Run 24×7 ambulance dispatch desk, coordinate calls, crew assignment and ETA to ED.",
      responsibilities: [
        "Triage inbound calls",
        "Dispatch BLS / ALS units",
        "Liaise with ED for pre-arrival notification",
      ],
      requirements: ["Graduate + EMT training preferred", "Shift-work ready", "Calm under pressure"],
      active: true,
    },
    {
      seedId: "seed-mortuary",
      title: "Mortuary Attendant",
      department: "Mortuary",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-4 L / year",
      description:
        "Maintain mortuary cold-chain, handle body release paperwork and relative counselling.",
      responsibilities: [
        "Body receiving and tagging",
        "Release handover with death certificate",
        "Equipment maintenance",
      ],
      requirements: ["10+2 + mortuary training", "Respectful communication with bereaved families", "Shift rota flexible"],
      active: true,
    },
    {
      seedId: "seed-opd-queue",
      title: "OPD Queue Coordinator",
      department: "OPD Queue",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-4.5 L / year",
      description:
        "Run front-desk OPD queue and real-time token management for 30+ consulting rooms.",
      responsibilities: [
        "Token issue and triage by consultant",
        "Handle no-show and priority overrides",
        "Patient-flow reporting daily",
      ],
      requirements: ["Graduate + 1 yr front-desk exp", "Typing 30+ wpm", "Good spoken English + regional language"],
      active: true,
    },
    {
      seedId: "seed-telemedicine",
      title: "Telemedicine Coordinator",
      department: "Telemedicine",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹5-7 L / year",
      description:
        "Operate the OduDoc telemedicine console — schedule, troubleshoot and escalate.",
      responsibilities: [
        "Match patients to consulting doctors",
        "Provide tech support during video calls",
        "Follow up on Rx delivery and payments",
      ],
      requirements: ["Graduate + 2 yrs coordinator exp", "Great written communication", "Comfortable with SaaS tools"],
      active: true,
    },
    // Revenue
    {
      seedId: "seed-invoices",
      title: "Billing Executive",
      department: "Invoices",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-5 L / year",
      description:
        "Handle IPD discharge billing, OPD receipts and TPA coordination.",
      responsibilities: [
        "Compile final bills with package / non-package items",
        "Coordinate TPA approvals and query replies",
        "Patient billing counselling",
      ],
      requirements: ["B.Com + 1 yr hospital billing", "Familiar with CGHS / ECHS / TPA tariffs", "Tally or HIS billing module exp"],
      active: true,
    },
    {
      seedId: "seed-insurance-tpa",
      title: "Insurance / TPA Officer",
      department: "Insurance / TPA",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹4.5-7 L / year",
      description:
        "Own cashless-claim lifecycle: pre-auth, enhancements, queries and final settlement.",
      responsibilities: [
        "Raise and track pre-auths in portals",
        "Coordinate with treating consultants on queries",
        "Reconcile TPA receivables monthly",
      ],
      requirements: ["Graduate + 2 yrs TPA desk exp", "IRDAI familiarity", "Strong spreadsheet skills"],
      active: true,
    },
    {
      seedId: "seed-emergency-codes",
      title: "Emergency Response Nurse (Code Blue)",
      department: "Emergency Codes",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹5-8 L / year",
      description:
        "Float nurse assigned to hospital code-blue, code-red (fire) and code-pink (infant abduction) response.",
      responsibilities: [
        "Respond to code activations within 3 minutes",
        "Maintain crash-cart inventory",
        "Run monthly mock-code drills",
      ],
      requirements: ["B.Sc Nursing + ACLS / PALS", "3+ yrs ICU or ED exp", "Strong team-leadership attitude"],
      active: true,
    },
    {
      seedId: "seed-medical-records",
      title: "Medical Records Officer",
      department: "Medical Records",
      location: "Remote",
      employmentType: "Full-time",
      salary: "₹3-5 L / year",
      description:
        "Own file completion, ICD-10 coding, medico-legal case handling and retention policy.",
      responsibilities: [
        "Audit discharge summaries for completeness",
        "ICD-10 and procedure coding",
        "Respond to medico-legal and subpoena requests",
      ],
      requirements: ["Graduate + MRD diploma", "ICD-10 coding familiarity", "3+ yrs MRD exp"],
      active: true,
    },
  ];

  const blocked = new Set(deletedSeedIds.map((r) => r.id));
  let dirty = false;
  for (const t of TEMPLATE) {
    if (jobs.some((j) => j.id === t.seedId)) continue;
    if (blocked.has(t.seedId)) continue; // admin deleted this seed — respect it
    const { seedId, ...rest } = t;
    jobs.unshift({
      ...rest,
      id: seedId,
      postedAt: new Date().toISOString(),
    });
    dirty = true;
  }
  if (dirty) flushJobs();
})();

export function getJobs(activeOnly = false): JobVacancy[] {
  return activeOnly ? jobs.filter((j) => j.active) : [...jobs];
}

export function getJobById(id: string): JobVacancy | null {
  return jobs.find((j) => j.id === id) || null;
}

export function addJob(
  data: Omit<JobVacancy, "id" | "postedAt">
): JobVacancy {
  const job: JobVacancy = {
    ...data,
    id: `job-${String(jobs.length + 1).padStart(3, "0")}-${Date.now()}`,
    postedAt: new Date().toISOString(),
  };
  jobs.unshift(job);
  flushJobs();
  return job;
}

export function updateJob(id: string, data: Partial<JobVacancy>): JobVacancy | null {
  const job = jobs.find((j) => j.id === id);
  if (!job) return null;
  Object.assign(job, data);
  flushJobs();
  return job;
}

export function deleteJob(id: string): boolean {
  const idx = jobs.findIndex((j) => j.id === id);
  if (idx < 0) return false;
  jobs.splice(idx, 1);
  // Tombstone so the merge-before-save inside flushJobs() doesn't
  // resurrect the row from Postgres and write it back.
  tombstoneJob(id);
  flushJobs();
  // If this is a seeded vacancy, remember the deletion so the seed
  // IIFE doesn't resurrect it on the next cold-start.
  if (id.startsWith("seed-") && !deletedSeedIds.some((r) => r.id === id)) {
    deletedSeedIds.push({ id });
    flushDeletedSeeds();
  }
  return true;
}

export function getApplications(
  jobId?: string,
  opts: { includeArchived?: boolean; onlyArchived?: boolean } = {}
): JobApplication[] {
  let list = jobId ? applications.filter((a) => a.jobId === jobId) : [...applications];
  if (opts.onlyArchived) {
    list = list.filter((a) => !!a.archivedAt);
  } else if (!opts.includeArchived) {
    list = list.filter((a) => !a.archivedAt);
  }
  return list.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function getApplicationById(id: string): JobApplication | null {
  return applications.find((a) => a.id === id) || null;
}

export function archiveApplication(id: string): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.archivedAt = new Date().toISOString();
  flushApps();
  return app;
}

export function unarchiveApplication(id: string): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.archivedAt = null;
  flushApps();
  return app;
}

export function deleteApplication(id: string): boolean {
  const idx = applications.findIndex((a) => a.id === id);
  if (idx < 0) return false;
  applications.splice(idx, 1);
  tombstoneApp(id);
  flushApps();
  return true;
}

export function addApplication(
  data: Omit<JobApplication, "id" | "submittedAt" | "status">
): JobApplication {
  const app: JobApplication = {
    ...data,
    id: `appl-${String(applications.length + 1).padStart(3, "0")}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "new",
  };
  applications.push(app);
  flushApps();
  return app;
}

export function updateApplicationStatus(
  id: string,
  status: JobApplication["status"]
): JobApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  flushApps();
  return app;
}
