// Medical document vault.
//
// One row per uploaded document. Body is a data: URL (base64) so
// the demo doesn't require S3/R2 wiring. Production would split
// metadata here from a blob in object storage; the API surface
// stays the same.
//
// Hard limit: 4 MB per document and 50 docs per user — beyond that
// we'd push the JSON-blob persistence too far.

import { bindPersistentArray } from "../persistent-array";

export type DocumentCategory =
  | "prescription"
  | "lab_report"
  | "discharge"
  | "imaging"
  | "insurance"
  | "vaccination"
  | "consent"
  | "other";

export interface MedicalDocument {
  id: string;
  userId: string;
  title: string;
  category: DocumentCategory;
  /** "image/jpeg", "application/pdf", etc. */
  mimeType: string;
  /** Total size in bytes (decoded). */
  bytes: number;
  /** data: URL or external https URL. */
  data: string;
  /** Free-text encounter / doctor / hospital name. */
  source?: string;
  /** Date of issue, NOT upload date — drives chronological view. */
  documentDate?: string;
  uploadedAt: string;
  notes?: string;
}

const docs: MedicalDocument[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<MedicalDocument>(
  "documents",
  docs,
  () => []
);
await hydrate();

export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_PER_USER = 50;

export const CATEGORY_LABEL: Record<DocumentCategory, string> = {
  prescription: "Prescription",
  lab_report: "Lab report",
  discharge: "Discharge summary",
  imaging: "Imaging",
  insurance: "Insurance",
  vaccination: "Vaccination",
  consent: "Consent",
  other: "Other",
};
export const CATEGORY_EMOJI: Record<DocumentCategory, string> = {
  prescription: "💊", lab_report: "🧪", discharge: "🏥",
  imaging: "🩻", insurance: "📋", vaccination: "💉",
  consent: "🔐", other: "📄",
};

export interface AddDocumentInput {
  userId: string;
  title: string;
  category: DocumentCategory;
  mimeType: string;
  bytes: number;
  data: string;
  source?: string;
  documentDate?: string;
  notes?: string;
}

export function addDocument(input: AddDocumentInput): { ok: true; doc: MedicalDocument } | { ok: false; error: string } {
  if (input.bytes > MAX_BYTES) return { ok: false, error: "too_large" };
  const userCount = docs.filter((d) => d.userId === input.userId).length;
  if (userCount >= MAX_PER_USER) return { ok: false, error: "limit_reached" };
  const doc: MedicalDocument = {
    id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    title: input.title.trim(),
    category: input.category,
    mimeType: input.mimeType,
    bytes: input.bytes,
    data: input.data,
    source: input.source?.trim() || undefined,
    documentDate: input.documentDate,
    uploadedAt: new Date().toISOString(),
    notes: input.notes?.trim() || undefined,
  };
  docs.unshift(doc);
  flush();
  return { ok: true, doc };
}

export function listDocuments(userId: string, category?: DocumentCategory): MedicalDocument[] {
  let list = docs.filter((d) => d.userId === userId);
  if (category) list = list.filter((d) => d.category === category);
  return list.sort((a, b) =>
    (b.documentDate || b.uploadedAt).localeCompare(a.documentDate || a.uploadedAt)
  );
}

export function getDocument(id: string, userId: string): MedicalDocument | null {
  return docs.find((d) => d.id === id && d.userId === userId) || null;
}

export function deleteDocument(id: string, userId: string): boolean {
  const i = docs.findIndex((d) => d.id === id && d.userId === userId);
  if (i < 0) return false;
  tombstone(docs[i].id);
  docs.splice(i, 1);
  flush();
  return true;
}

export function deleteDocumentsForUser(userId: string): number {
  let n = 0;
  for (let i = docs.length - 1; i >= 0; i--) {
    if (docs[i].userId === userId) {
      tombstone(docs[i].id);
      docs.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}
