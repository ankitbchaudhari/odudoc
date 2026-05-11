// Patient complaints — physically separated from the clinical Encounter
// store per Ecosystem Spec §11.
//
// Stores patient-uploaded raw input (audio recording reference, symptom
// photo URLs, AI-extracted structured complaint) before a doctor sees it.
// Linked to an encounter by ID once consultation begins.
//
// Tenant-scoped: every complaint carries organizationId. Read access is
// patient (always) + treating doctor (during their active encounter time
// window) — enforced by callers, not at the store level.

import { bindPersistentArray } from "./persistent-array";

export type ComplaintSeverity = "mild" | "moderate" | "severe";

export interface ComplaintStructured {
  chiefComplaint: string;
  durationDays?: number;
  severity?: ComplaintSeverity;
  associatedSymptoms?: string[];
  previousTreatments?: string[];
}

export interface PatientComplaint {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  audioBlobKey?: string;
  audioLanguage?: string;
  transcriptOriginal?: string;
  transcriptTranslated?: string;
  symptomPhotoKeys: string[];
  structured?: ComplaintStructured;
  source: "app" | "whatsapp" | "kiosk" | "ai-call";
  createdAt: string;
  updatedAt: string;
}

const complaints: PatientComplaint[] = [];
const { hydrate, flush } = bindPersistentArray<PatientComplaint>(
  "complaints",
  complaints,
  () => []
);
await hydrate();

export function listComplaints(opts: {
  organizationId: string;
  patientId?: string;
  encounterId?: string;
}): PatientComplaint[] {
  let list = complaints.filter((c) => c.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((c) => c.patientId === opts.patientId);
  if (opts.encounterId) list = list.filter((c) => c.encounterId === opts.encounterId);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getComplaint(id: string): PatientComplaint | undefined {
  return complaints.find((c) => c.id === id);
}

export interface ComplaintInput {
  organizationId: string;
  patientId: string;
  encounterId?: string;
  audioBlobKey?: string;
  audioLanguage?: string;
  transcriptOriginal?: string;
  transcriptTranslated?: string;
  symptomPhotoKeys?: string[];
  structured?: ComplaintStructured;
  source: PatientComplaint["source"];
}

export async function createComplaint(input: ComplaintInput): Promise<PatientComplaint> {
  const now = new Date().toISOString();
  const c: PatientComplaint = {
    id: `cmp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    organizationId: input.organizationId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    audioBlobKey: input.audioBlobKey,
    audioLanguage: input.audioLanguage,
    transcriptOriginal: input.transcriptOriginal,
    transcriptTranslated: input.transcriptTranslated,
    symptomPhotoKeys: input.symptomPhotoKeys ?? [],
    structured: input.structured,
    source: input.source,
    createdAt: now,
    updatedAt: now,
  };
  complaints.push(c);
  await flush();
  return c;
}

export async function attachToEncounter(
  complaintId: string,
  encounterId: string
): Promise<PatientComplaint | undefined> {
  const c = complaints.find((x) => x.id === complaintId);
  if (!c) return undefined;
  c.encounterId = encounterId;
  c.updatedAt = new Date().toISOString();
  await flush();
  return c;
}

export async function updateStructured(
  complaintId: string,
  structured: ComplaintStructured
): Promise<PatientComplaint | undefined> {
  const c = complaints.find((x) => x.id === complaintId);
  if (!c) return undefined;
  c.structured = structured;
  c.updatedAt = new Date().toISOString();
  await flush();
  return c;
}
