// Occupational / Employee Health Clinic. Tenant-scoped.
// EmployeeRecord (staff roster) + HealthEncounter (vaccination / sharps / screening / fitness cert).
// No patient cascade (staff, not patients).

import { bindPersistentArray } from "../persistent-array";

export type EmployeeRole = "doctor" | "nurse" | "technician" | "pharmacist" | "housekeeping" | "security" | "admin" | "food_services" | "biomedical" | "other";
export type EmploymentStatus = "active" | "on_leave" | "terminated" | "retired";
export type FitnessStatus = "fit" | "fit_with_restrictions" | "temporarily_unfit" | "permanently_unfit" | "pending";

export type EncounterKind = "pre_employment" | "periodic_exam" | "vaccination" | "needlestick" | "sharps_injury" | "blood_body_fluid_exposure" | "tb_screening" | "n95_fit_test" | "fitness_certificate" | "return_to_work" | "illness_absence" | "injury_on_duty" | "psych_wellness" | "radiation_monitoring" | "other";
export type VaccineType = "hep_b" | "influenza" | "covid19" | "mmr" | "tdap" | "varicella" | "typhoid" | "hepatitis_a" | "rabies_pep" | "bcg" | "other";
export type ExposureSource = "known_hiv" | "known_hbv" | "known_hcv" | "unknown" | "negative_source" | "na";
export type EncounterStatus = "draft" | "open" | "follow_up" | "closed" | "referred";

export interface EmployeeRecord {
  id: string;                       // EHR-{suffix}-{seq}
  organizationId: string;
  employeeCode: string;              // hospital HR code
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  department: string;
  designation?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "unspecified";
  phone?: string;
  email?: string;
  bloodGroup?: string;
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  employmentStatus: EmploymentStatus;
  hepBStatus?: "full" | "partial" | "non_responder" | "unvaccinated" | "unknown";
  hepBAntibodyTitre?: number;
  tbStatus?: "negative" | "latent" | "active_treated" | "active_current" | "unknown";
  lastMedicalExam?: string;
  fitnessStatus?: FitnessStatus;
  fitnessExpiresOn?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthEncounter {
  id: string;                         // EHE-{suffix}-{seq}
  organizationId: string;
  employeeId: string;
  employeeName: string;                // denorm
  employeeCode?: string;               // denorm
  department?: string;                 // denorm
  kind: EncounterKind;
  encounterDate: string;
  attendedBy: string;                   // occupational health doctor
  chiefComplaint?: string;
  // Vaccination
  vaccineType?: VaccineType;
  vaccineBrand?: string;
  doseNumber?: number;
  batchNumber?: string;
  vaccineSite?: "left_deltoid" | "right_deltoid" | "gluteal" | "thigh" | "oral" | "intradermal" | "other";
  vaccineNextDueDate?: string;
  // Exposure / sharps
  exposureTime?: string;
  exposureLocation?: string;
  instrumentInvolved?: string;
  exposureRoute?: "percutaneous" | "mucocutaneous" | "intact_skin" | "nonintact_skin" | "bite";
  sourcePatientId?: string;
  sourceStatus?: ExposureSource;
  postExposureTestsOrdered?: string;    // "HIV, HBsAg, Anti-HCV"
  pepRegimen?: string;
  pepStartedAt?: string;
  // Screening / testing
  testResults?: string;                 // free-text summary
  n95Model?: string;
  n95FitPassed?: boolean;
  // Fitness
  fitnessOutcome?: FitnessStatus;
  fitnessRestrictions?: string;
  fitnessValidUntil?: string;
  returnToWorkDate?: string;
  // Illness / absence
  absenceFromDate?: string;
  absenceToDate?: string;
  diagnosis?: string;
  // Vitals
  bpSystolic?: number;
  bpDiastolic?: number;
  pulse?: number;
  temperatureC?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  // Radiation monitoring
  tldBadgeNumber?: string;
  cumulativeDoseMsv?: number;
  // Workflow
  status: EncounterStatus;
  followUpDate?: string;
  referredTo?: string;
  confidential: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const employees: EmployeeRecord[] = [];
const encounters: HealthEncounter[] = [];
const hE = bindPersistentArray<EmployeeRecord>("employee-health-records", employees, () => []);
const hX = bindPersistentArray<HealthEncounter>("employee-health-encounters", encounters, () => []);
await hE; await hX;

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  doctor: "Doctor", nurse: "Nurse", technician: "Technician",
  pharmacist: "Pharmacist", housekeeping: "Housekeeping", security: "Security",
  admin: "Admin", food_services: "Food services", biomedical: "Biomedical", other: "Other",
};
export const EMP_STATUS_LABEL: Record<EmploymentStatus, string> = {
  active: "Active", on_leave: "On leave", terminated: "Terminated", retired: "Retired",
};
export const FITNESS_LABEL: Record<FitnessStatus, string> = {
  fit: "Fit", fit_with_restrictions: "Fit w/ restrictions",
  temporarily_unfit: "Temporarily unfit", permanently_unfit: "Permanently unfit",
  pending: "Pending",
};
export const ENC_KIND_LABEL: Record<EncounterKind, string> = {
  pre_employment: "Pre-employment", periodic_exam: "Periodic exam",
  vaccination: "Vaccination", needlestick: "Needlestick",
  sharps_injury: "Sharps injury", blood_body_fluid_exposure: "Blood/BF exposure",
  tb_screening: "TB screening", n95_fit_test: "N95 fit test",
  fitness_certificate: "Fitness cert", return_to_work: "Return to work",
  illness_absence: "Illness / absence", injury_on_duty: "Injury on duty",
  psych_wellness: "Psych / wellness", radiation_monitoring: "Radiation monitoring",
  other: "Other",
};
export const VACCINE_LABEL: Record<VaccineType, string> = {
  hep_b: "Hepatitis B", influenza: "Influenza", covid19: "COVID-19",
  mmr: "MMR", tdap: "Tdap", varicella: "Varicella",
  typhoid: "Typhoid", hepatitis_a: "Hepatitis A", rabies_pep: "Rabies PEP",
  bcg: "BCG", other: "Other",
};
export const ENC_STATUS_LABEL: Record<EncounterStatus, string> = {
  draft: "Draft", open: "Open", follow_up: "Follow-up",
  closed: "Closed", referred: "Referred",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(prefix: string, list: { id: string }[], orgId: string) {
  const p = `${prefix}-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

// Employees
export function listEmployees(opts: { organizationId: string; role?: EmployeeRole; status?: EmploymentStatus; department?: string }): EmployeeRecord[] {
  return employees.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.role ? r.role === opts.role : true))
    .filter((r) => (opts.status ? r.employmentStatus === opts.status : true))
    .filter((r) => (opts.department ? r.department === opts.department : true))
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
}
export function createEmployee(orgId: string, input: Partial<EmployeeRecord>): { ok: true; record: EmployeeRecord } | { ok: false; error: string } {
  if (!input.employeeCode || !input.firstName || !input.lastName || !input.role || !input.department) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: EmployeeRecord = {
    id: nextId("EHR", employees, orgId), organizationId: orgId,
    employeeCode: input.employeeCode,
    firstName: input.firstName, lastName: input.lastName,
    role: input.role as EmployeeRole, department: input.department,
    designation: input.designation,
    dateOfJoining: input.dateOfJoining,
    dateOfBirth: input.dateOfBirth, gender: input.gender,
    phone: input.phone, email: input.email,
    bloodGroup: input.bloodGroup, allergies: input.allergies,
    chronicConditions: input.chronicConditions,
    currentMedications: input.currentMedications,
    emergencyContactName: input.emergencyContactName,
    emergencyContactPhone: input.emergencyContactPhone,
    employmentStatus: (input.employmentStatus || "active") as EmploymentStatus,
    hepBStatus: input.hepBStatus, hepBAntibodyTitre: input.hepBAntibodyTitre,
    tbStatus: input.tbStatus,
    lastMedicalExam: input.lastMedicalExam,
    fitnessStatus: input.fitnessStatus, fitnessExpiresOn: input.fitnessExpiresOn,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  employees.push(r);
  return { ok: true, record: r };
}
export function updateEmployee(id: string, orgId: string, patch: Partial<EmployeeRecord>): EmployeeRecord | null {
  const i = employees.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = employees[i];
  employees.splice(i, 1, { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() });
  const next = employees[i];
  // Re-denorm encounters if name or department changed
  if (patch.firstName || patch.lastName || patch.department || patch.employeeCode) {
    for (const e of encounters) {
      if (e.employeeId === id && e.organizationId === orgId) {
        e.employeeName = `${next.firstName} ${next.lastName}`;
        e.department = next.department;
        e.employeeCode = next.employeeCode;
      }
    }
  }
  return next;
}
export function deleteEmployee(id: string, orgId: string): boolean {
  const i = employees.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  employees.splice(i, 1);
  // Detach encounters
  const stamp = new Date().toISOString();
  for (const e of encounters) {
    if (e.employeeId === id && e.organizationId === orgId) {
      e.employeeId = "";
      e.employeeName = `[removed] ${e.employeeName}`;
      if (e.status === "open" || e.status === "follow_up" || e.status === "draft") e.status = "closed";
      e.updatedAt = stamp;
    }
  }
  return true;
}

// Encounters
export function listEncounters(opts: { organizationId: string; kind?: EncounterKind; status?: EncounterStatus; employeeId?: string }): HealthEncounter[] {
  return encounters.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.kind ? r.kind === opts.kind : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.employeeId ? r.employeeId === opts.employeeId : true))
    .sort((a, b) => b.encounterDate.localeCompare(a.encounterDate));
}
export function createEncounter(orgId: string, input: Partial<HealthEncounter>): { ok: true; record: HealthEncounter } | { ok: false; error: string } {
  if (!input.employeeId || !input.kind || !input.encounterDate || !input.attendedBy) return { ok: false, error: "missing_required" };
  const emp = employees.find((e) => e.id === input.employeeId && e.organizationId === orgId);
  if (!emp) return { ok: false, error: "employee_not_found" };
  const now = new Date().toISOString();
  const r: HealthEncounter = {
    id: nextId("EHE", encounters, orgId), organizationId: orgId,
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    employeeCode: emp.employeeCode,
    department: emp.department,
    kind: input.kind as EncounterKind,
    encounterDate: input.encounterDate,
    attendedBy: input.attendedBy,
    chiefComplaint: input.chiefComplaint,
    vaccineType: input.vaccineType, vaccineBrand: input.vaccineBrand,
    doseNumber: input.doseNumber, batchNumber: input.batchNumber,
    vaccineSite: input.vaccineSite, vaccineNextDueDate: input.vaccineNextDueDate,
    exposureTime: input.exposureTime, exposureLocation: input.exposureLocation,
    instrumentInvolved: input.instrumentInvolved, exposureRoute: input.exposureRoute,
    sourcePatientId: input.sourcePatientId, sourceStatus: input.sourceStatus,
    postExposureTestsOrdered: input.postExposureTestsOrdered,
    pepRegimen: input.pepRegimen, pepStartedAt: input.pepStartedAt,
    testResults: input.testResults,
    n95Model: input.n95Model, n95FitPassed: input.n95FitPassed,
    fitnessOutcome: input.fitnessOutcome,
    fitnessRestrictions: input.fitnessRestrictions,
    fitnessValidUntil: input.fitnessValidUntil,
    returnToWorkDate: input.returnToWorkDate,
    absenceFromDate: input.absenceFromDate, absenceToDate: input.absenceToDate,
    diagnosis: input.diagnosis,
    bpSystolic: input.bpSystolic, bpDiastolic: input.bpDiastolic,
    pulse: input.pulse, temperatureC: input.temperatureC,
    spo2: input.spo2, weight: input.weight, height: input.height, bmi: input.bmi,
    tldBadgeNumber: input.tldBadgeNumber,
    cumulativeDoseMsv: input.cumulativeDoseMsv,
    status: (input.status || "open") as EncounterStatus,
    followUpDate: input.followUpDate,
    referredTo: input.referredTo,
    confidential: input.confidential ?? true,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  encounters.push(r);
  // Bubble fitness or last-exam changes back onto employee
  if (r.kind === "fitness_certificate" && r.fitnessOutcome) {
    emp.fitnessStatus = r.fitnessOutcome;
    if (r.fitnessValidUntil) emp.fitnessExpiresOn = r.fitnessValidUntil;
    emp.updatedAt = now;
  }
  if (r.kind === "periodic_exam" || r.kind === "pre_employment") {
    emp.lastMedicalExam = r.encounterDate;
    emp.updatedAt = now;
  }
  return { ok: true, record: r };
}
export function updateEncounter(id: string, orgId: string, patch: Partial<HealthEncounter>): HealthEncounter | null {
  const i = encounters.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  encounters.splice(i, 1, { ...encounters[i], ...patch, id: encounters[i].id, organizationId: encounters[i].organizationId, updatedAt: new Date().toISOString() });
  return encounters[i];
}
export function deleteEncounter(id: string, orgId: string): boolean {
  const i = encounters.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  encounters.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const myE = employees.filter((r) => r.organizationId === orgId);
  const myX = encounters.filter((r) => r.organizationId === orgId);
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const activeStaff = myE.filter((e) => e.employmentStatus === "active").length;
  const hepBIncomplete = myE.filter((e) => e.employmentStatus === "active" && (!e.hepBStatus || e.hepBStatus === "unvaccinated" || e.hepBStatus === "partial" || e.hepBStatus === "non_responder")).length;
  const fitnessExpiring = myE.filter((e) => e.fitnessExpiresOn && e.fitnessExpiresOn >= today && e.fitnessExpiresOn <= new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)).length;
  const vaccinationsMonth = myX.filter((x) => x.kind === "vaccination" && x.encounterDate >= monthStart).length;
  const sharpsMonth = myX.filter((x) => (x.kind === "needlestick" || x.kind === "sharps_injury" || x.kind === "blood_body_fluid_exposure") && x.encounterDate >= monthStart).length;
  const openExposures = myX.filter((x) => (x.kind === "needlestick" || x.kind === "sharps_injury" || x.kind === "blood_body_fluid_exposure") && (x.status === "open" || x.status === "follow_up")).length;
  const absenceDaysMonth = myX.filter((x) => x.kind === "illness_absence" && x.encounterDate >= monthStart).reduce((s, x) => {
    if (x.absenceFromDate && x.absenceToDate) {
      const d = (new Date(x.absenceToDate).getTime() - new Date(x.absenceFromDate).getTime()) / (24 * 3600 * 1000) + 1;
      return s + Math.max(0, Math.round(d));
    }
    return s;
  }, 0);
  return {
    activeStaff, hepBIncomplete, fitnessExpiring,
    vaccinationsMonth, sharpsMonth, openExposures,
    absenceDaysMonth,
  };
}
