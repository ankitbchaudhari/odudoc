// Doctor registration applications store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface DoctorApplication {
  id: string;
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  // Step 2
  licenseNumber: string;
  specialty: string;
  subSpecialty: string;
  yearsExperience: number;
  qualifications: string;
  affiliations: string;
  languages: string[];
  // Step 3 - documents (file names only, mock)
  documents: {
    medicalLicense?: string;
    governmentId?: string;
    medicalDegree?: string;
    professionalPhoto?: string;
    specialtyCertifications?: string[];
    hospitalAffiliationLetter?: string;
  };
  // Step 4
  plan: "free" | "premium";
  fee: number;
  // Meta
  submittedAt: string;
  status: ApplicationStatus;
  adminNotes?: string;
}

const applications: DoctorApplication[] = [];
const { hydrate, flush } = bindPersistentArray<DoctorApplication>(
  "doctor-applications",
  applications,
  () => []
);
await hydrate();

// One-time cleanup: drop the demo applications (app-001/002/003) that
// shipped with the initial seed.
(function removeLegacySeedApps() {
  const legacyIds = new Set(["app-001", "app-002", "app-003"]);
  let dirty = false;
  for (let i = applications.length - 1; i >= 0; i--) {
    if (legacyIds.has(applications[i].id)) {
      applications.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

export function getApplications(): DoctorApplication[] {
  return [...applications];
}

export function getApplicationById(id: string): DoctorApplication | null {
  return applications.find((a) => a.id === id) || null;
}

export function addApplication(
  data: Omit<DoctorApplication, "id" | "submittedAt" | "status">
): DoctorApplication {
  const app: DoctorApplication = {
    ...data,
    id: `app-${String(applications.length + 1).padStart(3, "0")}-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    status: "pending",
  };
  applications.push(app);
  flush();
  return app;
}

export function deleteApplication(id: string): boolean {
  const i = applications.findIndex((a) => a.id === id);
  if (i === -1) return false;
  applications.splice(i, 1);
  flush();
  return true;
}

export function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminNotes?: string
): DoctorApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  if (adminNotes !== undefined) app.adminNotes = adminNotes;
  flush();
  return app;
}
