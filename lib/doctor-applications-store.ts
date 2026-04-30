// Doctor registration applications store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export type ApplicationStatus = "pending" | "approved" | "rejected" | "resubmit";

export interface DoctorApplication {
  id: string;
  // Step 1
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  /** ISO 3166-1 alpha-2 country code for the doctor's primary practice
   *  jurisdiction. Drives both the license-field label/regex and which
   *  compliance artifact (HIPAA BAA vs GDPR DPA) the applicant signs. */
  country?: string;
  // Step 2
  licenseNumber: string;
  /** Country that issued the license. Defaults to `country` but can
   *  diverge for doctors trained abroad and licensed locally. */
  licenseCountry?: string;
  /** ISO date (YYYY-MM-DD) the medical license expires. Required at
   *  registration once the migration backfill lands. */
  licenseExpiry?: string;
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
  // Compliance acceptance — the applicant must accept the relevant
  // data-protection agreement at submission time. We store enough
  // metadata (version, IP, timestamp) to defend the acceptance later.
  compliance?: {
    /** Which agreement was shown — drives wording for the audit log. */
    framework: "HIPAA_BAA" | "GDPR_DPA" | "GENERIC_DPA";
    /** Document version the applicant accepted. Bump in lib/doctor-baa.ts
     *  whenever the wording changes so historical acceptances don't
     *  silently roll forward. */
    version: string;
    acceptedAt: string;
    /** IP address captured server-side from x-forwarded-for. */
    ipAddress?: string;
    /** Free-text typed-name signature the applicant entered. */
    signature?: string;
  };
  // Meta
  submittedAt: string;
  status: ApplicationStatus;
  adminNotes?: string;
  /** Email of the admin that approved/rejected. Tracked for audit. */
  decidedBy?: string;
  /** ISO timestamp the decision was made. */
  decidedAt?: string;
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
  // Use a base36 timestamp + random suffix instead of `applications.length + 1`
  // (the audit caught this — deletes recycled IDs and a fresh DB hydrate
  // could collide with a still-live app).
  const id = `app-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const app: DoctorApplication = {
    ...data,
    id,
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
  adminNotes?: string,
  decidedBy?: string,
): DoctorApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  app.status = status;
  if (adminNotes !== undefined) app.adminNotes = adminNotes;
  // Track who decided + when so audits / disputes can reconstruct
  // the decision chain. Audit recommendation #4 (compliance) flagged
  // this as missing.
  if (status !== "pending") {
    app.decidedAt = new Date().toISOString();
    if (decidedBy) app.decidedBy = decidedBy.toLowerCase();
  }
  flush();
  return app;
}

/** Patch one document URL on an application. Used by admin recovery
 *  when a doctor's upload silently failed and they emailed/whatsapp'd
 *  the file directly — admin uploads via the route handler, which
 *  calls this to stamp the new URL.
 *
 *  `key` is one of the document fields. For `specialtyCertifications`
 *  pass `index` to replace a specific cert slot; omit `index` to
 *  append a new one. Returns the updated application or null if the
 *  id is unknown. */
export type DocumentKey =
  | "medicalLicense"
  | "governmentId"
  | "medicalDegree"
  | "professionalPhoto"
  | "hospitalAffiliationLetter"
  | "specialtyCertifications";

export function updateApplicationDocument(
  id: string,
  key: DocumentKey,
  url: string,
  index?: number,
): DoctorApplication | null {
  const app = applications.find((a) => a.id === id);
  if (!app) return null;
  if (key === "specialtyCertifications") {
    const list = Array.isArray(app.documents.specialtyCertifications)
      ? [...app.documents.specialtyCertifications]
      : [];
    if (typeof index === "number" && index >= 0 && index < list.length) {
      list[index] = url;
    } else {
      list.push(url);
    }
    app.documents.specialtyCertifications = list;
  } else {
    app.documents[key] = url;
  }
  flush();
  return app;
}
