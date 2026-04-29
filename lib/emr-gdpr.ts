// GDPR / HIPAA helpers for the EMR.
//
// Patient-facing data rights (Art. 15 access, Art. 17 erasure, Art. 20
// portability) are handled at the request level — we don't keep a
// patient login, so the clinic is the data controller and exposes
// these via the doctor's UI. The doctor remains responsible for
// verifying patient identity before issuing or actioning a request.

import {
  buildFhirBundle,
  getPatientById,
  listVisitsForPatient,
  listFilesForPatient,
  listInvoicesForPatient,
  type EmrPatient,
} from "./emr-store";

/** Compose a portability bundle for a patient: profile + visits +
 *  files (metadata only — blobs stay where they are) + invoices.
 *  Returned shape is convenient for both human review (the doctor
 *  inspects before sending) and machine ingest (FHIR + raw rows). */
export async function buildPatientDataExport(
  patientId: string,
  ownerEmail?: string
): Promise<{
  patient: EmrPatient;
  fhir: unknown;
  visits: unknown[];
  files: Array<{ id: string; label: string; originalName: string; size: number; createdAt: string; url: string }>;
  invoices: Array<{ number: string; issueDate: string; total: number; currency: string; status: string }>;
} | null> {
  const patient = await getPatientById(patientId, ownerEmail);
  if (!patient) return null;
  const visits = await listVisitsForPatient(patientId, ownerEmail);
  const files = await listFilesForPatient(patientId, ownerEmail);
  const invoices = await listInvoicesForPatient(patientId, ownerEmail);
  return {
    patient,
    fhir: buildFhirBundle(patient, visits),
    visits,
    files: files.map((f) => ({
      id: f.id,
      label: f.label,
      originalName: f.originalName,
      size: f.size,
      createdAt: f.createdAt,
      // Direct download URL — already public on files.odudoc.com.
      // Patient holding the export bundle has the same access path.
      url: f.url,
    })),
    invoices: invoices.map((i) => ({
      number: i.number,
      issueDate: i.issueDate,
      total: i.total,
      currency: i.currency,
      status: i.status,
    })),
  };
}
