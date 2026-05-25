// Patient-lookup search engine.
//
// Used by /api/admin/patients/search to back the universal "Find
// patient" widget shipped to every admin surface. Scope is always
// the caller's active organization — cross-org lookup would need an
// explicit consent path (ABDM-style) and is out of scope here.
//
// V1 search types:
//   phone           digits, with optional country-code prefix
//   name            first / last / full-name substring (case insensitive)
//   patient-id      matches patient.id (platform-wide) OR mrn (per-org)
//   insurance       insurancePolicyNumber substring
//   govt-id         normalize → match against patient.governmentIds[].number
//
// Results are returned as the raw Patient[] — the API route applies
// patient-acl redaction before sending to the client.

import { Patient } from "./patients-store";
import { normalizeIdValue } from "./govt-id-types";

export type PatientSearchType =
  | "phone"
  | "name"
  | "patient-id"
  | "insurance"
  | "govt-id"
  | "national-health-id";

export interface PatientSearchQuery {
  type: PatientSearchType;
  value: string;
  /** For "phone" — optional E.164 country code prefix (e.g. "+91"). */
  phoneCountryCode?: string;
  /** For "govt-id" — ISO-2 country the ID was issued by. Narrows the
   *  match so an Aadhaar query doesn't accidentally collide with a
   *  similarly-shaped Voter ID from another country. */
  govtIdCountry?: string;
  /** For "national-health-id" — the systemId from
   *  lib/national-health-ids.ts (e.g. "abha-number", "nhs-number").
   *  When supplied, only matches a governmentIds entry with that
   *  exact `type`. */
  healthSystemId?: string;
}

/** Strip every non-digit + non-plus from a phone-shaped string so
 *  "+91 98765 43210" / "919876543210" / "(91) 98765-43210" all match. */
function stripPhone(raw: string): string {
  return (raw || "").replace(/[^\d+]/g, "");
}

/** Substring match on phone — strips formatting on both sides and
 *  matches by the digits the operator typed plus, if present, the
 *  country-code prefix. We match by .endsWith so a US operator can
 *  type "5551234" and still find "+15551234" on file. */
function matchesPhone(
  patient: Patient,
  rawValue: string,
  rawCountryCode: string | undefined,
): boolean {
  if (!patient.phone) return false;
  const haystack = stripPhone(patient.phone);
  const needleDigits = stripPhone(rawValue).replace(/^\+/, "");
  if (!needleDigits) return false;
  const cc = (rawCountryCode || "").replace(/^\+/, "").replace(/\D/g, "");
  // If a country code was supplied, require a match on the prefix.
  if (cc) {
    const fullNeedle = cc + needleDigits.replace(new RegExp(`^${cc}`), "");
    return haystack.replace(/^\+/, "").endsWith(fullNeedle);
  }
  return haystack.replace(/^\+/, "").endsWith(needleDigits);
}

function matchesName(patient: Patient, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return false;
  const full = `${patient.firstName} ${patient.lastName}`.toLowerCase();
  return (
    patient.firstName.toLowerCase().includes(q) ||
    patient.lastName.toLowerCase().includes(q) ||
    full.includes(q)
  );
}

function matchesPatientId(patient: Patient, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return false;
  return (
    patient.id.toLowerCase() === q ||
    patient.id.toLowerCase().includes(q) ||
    patient.mrn.toLowerCase() === q ||
    patient.mrn.toLowerCase().includes(q)
  );
}

function matchesInsurance(patient: Patient, raw: string): boolean {
  if (!patient.insurancePolicyNumber) return false;
  const q = raw.trim().toLowerCase();
  if (!q) return false;
  return patient.insurancePolicyNumber.toLowerCase().includes(q);
}

function matchesGovtId(
  patient: Patient,
  raw: string,
  country: string | undefined,
): boolean {
  const ids = patient.governmentIds || [];
  if (ids.length === 0) return false;
  const needle = normalizeIdValue(raw);
  if (!needle) return false;
  const wantCountry = (country || "").toUpperCase();
  return ids.some((entry) => {
    if (wantCountry && entry.country.toUpperCase() !== wantCountry) return false;
    return normalizeIdValue(entry.number) === needle;
  });
}

// National-health-ID matcher. Stored alongside other government IDs
// on the patient (Patient.governmentIds[].type === systemId), so we
// reuse the same array but require the entry's `type` to match the
// caller's `healthSystemId` — that way an "NHS-style 10 digits"
// query doesn't false-positive against a similar-shaped insurance
// number stored as a generic govt-id.
function matchesHealthId(
  patient: Patient,
  raw: string,
  systemId: string | undefined,
): boolean {
  const ids = patient.governmentIds || [];
  if (ids.length === 0) return false;
  const needle = normalizeIdValue(raw);
  if (!needle) return false;
  return ids.some((entry) => {
    if (systemId && entry.type !== systemId) return false;
    return normalizeIdValue(entry.number) === needle;
  });
}

export function matchesQuery(
  patient: Patient,
  q: PatientSearchQuery,
): boolean {
  switch (q.type) {
    case "phone":
      return matchesPhone(patient, q.value, q.phoneCountryCode);
    case "name":
      return matchesName(patient, q.value);
    case "patient-id":
      return matchesPatientId(patient, q.value);
    case "insurance":
      return matchesInsurance(patient, q.value);
    case "govt-id":
      return matchesGovtId(patient, q.value, q.govtIdCountry);
    case "national-health-id":
      return matchesHealthId(patient, q.value, q.healthSystemId);
    default:
      return false;
  }
}

/** Run the query against an already-org-scoped patient list. The
 *  caller (the API route) is responsible for the org filter.
 *  Optional `branchScope` further narrows results — used when the
 *  caller is a branch_admin who should only see their location's
 *  patients. Patients without a branchId stay visible (cross-branch). */
export function runPatientSearch(
  patients: Patient[],
  query: PatientSearchQuery,
  limit = 50,
  branchScope: string | null = null,
): Patient[] {
  if (!query.value || !query.value.trim()) return [];
  const out: Patient[] = [];
  for (const p of patients) {
    if (branchScope && p.branchId && p.branchId !== branchScope) continue;
    if (matchesQuery(p, query)) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  // Most-recently-touched first so the operator's likely answer is at
  // the top of the result list.
  return out.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
