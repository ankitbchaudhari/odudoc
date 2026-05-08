// DICOM annotation persistence.
//
// One row per (clinic, study). The `toolStateJson` field is a verbatim
// copy of cornerstone-tools' globalImageIdSpecificToolStateManager
// state — measurements, ROIs, length lines, angles. Reloading restores
// every annotation drawn during the previous session.
//
// `studyKey` is whatever stable identifier the caller passes —
// typically a hash of the study's DICOM URL list, or the EMR file id
// the DICOM was uploaded under.

import { bindPersistentArray } from "./persistent-array";

export interface DicomAnnotation {
  id: string;
  doctorEmail: string;        // clinic owner — scoping pivot
  studyKey: string;
  /** JSON-stringified Cornerstone tool state. */
  toolStateJson: string;
  createdBy: string;          // staff email who saved
  createdAt: string;
  updatedAt: string;
}

const annotations: DicomAnnotation[] = [];
const {
  hydrate: hydrateAnn,
  reload: reloadAnnInternal,
  flush: flushAnn,
} = bindPersistentArray<DicomAnnotation>("emr-dicom-annotations", annotations, () => []);

await hydrateAnn();
export async function reloadDicomAnnotations() { await reloadAnnInternal(); }

const nowIso = () => new Date().toISOString();
const newId = () => `dann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export interface SaveAnnotationInput {
  doctorEmail: string;
  studyKey: string;
  toolStateJson: string;
  createdBy: string;
}

export async function saveAnnotation(input: SaveAnnotationInput): Promise<DicomAnnotation> {
  await hydrateAnn();
  // Upsert: one row per (clinic, study). Latest save wins.
  const existing = annotations.find(
    (a) => a.doctorEmail === input.doctorEmail.toLowerCase() && a.studyKey === input.studyKey,
  );
  if (existing) {
    existing.toolStateJson = input.toolStateJson;
    existing.createdBy = input.createdBy.toLowerCase();
    existing.updatedAt = nowIso();
    flushAnn();
    return existing;
  }
  const row: DicomAnnotation = {
    id: newId(),
    doctorEmail: input.doctorEmail.toLowerCase(),
    studyKey: input.studyKey,
    toolStateJson: input.toolStateJson,
    createdBy: input.createdBy.toLowerCase(),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  annotations.push(row);
  flushAnn();
  return row;
}

export async function loadAnnotation(
  doctorEmail: string,
  studyKey: string,
): Promise<DicomAnnotation | null> {
  await hydrateAnn();
  return annotations.find(
    (a) => a.doctorEmail === doctorEmail.toLowerCase() && a.studyKey === studyKey,
  ) || null;
}
