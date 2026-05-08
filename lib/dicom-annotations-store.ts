// DICOM annotation persistence — append-only history.
//
// Originally upserted one row per (clinic, study). Now keeps every
// save as its own row with monotonic `revision` numbering so we can
// time-travel ("show me how the radiologist's read evolved on this
// study"). Latest revision is what the viewer loads by default;
// listAnnotationHistory() returns the full chain for the history UI.
//
// `studyKey` is a stable identifier the caller supplies — typically
// the DICOM URL list joined together, or the EMR file id.

import { bindPersistentArray } from "./persistent-array";

export interface DicomAnnotation {
  id: string;
  doctorEmail: string;        // clinic owner — scoping pivot
  studyKey: string;
  /** 1-indexed monotonic revision per (doctorEmail, studyKey).
   *  `latest === max(revision)` for the same studyKey. */
  revision: number;
  /** True only on the most recent revision per (clinic, studyKey).
   *  Earlier rows have `latest = false`. */
  latest: boolean;
  /** JSON-stringified Cornerstone tool state. */
  toolStateJson: string;
  createdBy: string;          // staff email who saved
  createdAt: string;
  /** Optional save note — "Initial read", "After tumor board",
   *  "Reviewed by senior radiologist". */
  note?: string;
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
  note?: string;
}

export async function saveAnnotation(input: SaveAnnotationInput): Promise<DicomAnnotation> {
  await hydrateAnn();
  const owner = input.doctorEmail.toLowerCase();
  // Find current latest for this study; demote it.
  const peers = annotations.filter((a) => a.doctorEmail === owner && a.studyKey === input.studyKey);
  const maxRev = peers.reduce((m, a) => Math.max(m, a.revision), 0);
  for (const a of peers) {
    if (a.latest) a.latest = false;
  }
  const row: DicomAnnotation = {
    id: newId(),
    doctorEmail: owner,
    studyKey: input.studyKey,
    revision: maxRev + 1,
    latest: true,
    toolStateJson: input.toolStateJson,
    createdBy: input.createdBy.toLowerCase(),
    createdAt: nowIso(),
    note: input.note,
  };
  annotations.push(row);
  flushAnn();
  return row;
}

/** Return the latest revision for a study, or null if none. */
export async function loadAnnotation(
  doctorEmail: string,
  studyKey: string,
): Promise<DicomAnnotation | null> {
  await hydrateAnn();
  return annotations.find(
    (a) => a.doctorEmail === doctorEmail.toLowerCase() && a.studyKey === studyKey && a.latest,
  ) || null;
}

/** Return the full revision history (newest first) for a study. */
export async function listAnnotationHistory(
  doctorEmail: string,
  studyKey: string,
): Promise<DicomAnnotation[]> {
  await hydrateAnn();
  const owner = doctorEmail.toLowerCase();
  return annotations
    .filter((a) => a.doctorEmail === owner && a.studyKey === studyKey)
    .sort((a, b) => b.revision - a.revision);
}

/** Load a specific revision by id. Used by the time-travel UI. */
export async function loadAnnotationById(
  doctorEmail: string,
  rowId: string,
): Promise<DicomAnnotation | null> {
  await hydrateAnn();
  return annotations.find(
    (a) => a.doctorEmail === doctorEmail.toLowerCase() && a.id === rowId,
  ) || null;
}
