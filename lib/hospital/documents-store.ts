// Document archive: file/artifact metadata catalog (no blob storage).
import { bindPersistentArray } from "../persistent-array";

export type DocCategory = "clinical" | "consent" | "insurance" | "billing" | "imaging" | "lab_report" | "discharge" | "prescription" | "legal" | "hr" | "regulatory" | "policy" | "protocol" | "contract" | "identity" | "other";
export type DocStatus = "draft" | "pending_review" | "approved" | "active" | "superseded" | "archived" | "expired" | "rejected";
export type AccessLevel = "public" | "internal" | "restricted" | "confidential" | "highly_confidential";

export interface Document {
  id: string; organizationId: string;
  title: string;
  category: DocCategory;
  documentNumber?: string;
  status: DocStatus;
  accessLevel: AccessLevel;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  storageUri?: string;
  checksum?: string;
  version: string;
  supersedes?: string;
  patientId?: string;
  patientName?: string;
  encounterId?: string;
  department?: string;
  authorName?: string;
  authorRole?: string;
  reviewedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  effectiveDate?: string;
  expiryDate?: string;
  retentionUntil?: string;
  tags?: string;
  description?: string;
  accessCount: number;
  lastAccessedAt?: string;
  createdAt: string; updatedAt: string;
}

const docs: Document[] = [];
const h = bindPersistentArray<Document>("documents", docs, () => []);
await h;

export const CATEGORY_LABEL: Record<DocCategory, string> = { clinical: "Clinical", consent: "Consent", insurance: "Insurance", billing: "Billing", imaging: "Imaging", lab_report: "Lab report", discharge: "Discharge", prescription: "Prescription", legal: "Legal", hr: "HR", regulatory: "Regulatory", policy: "Policy", protocol: "Protocol", contract: "Contract", identity: "Identity", other: "Other" };
export const STATUS_LABEL: Record<DocStatus, string> = { draft: "Draft", pending_review: "Pending review", approved: "Approved", active: "Active", superseded: "Superseded", archived: "Archived", expired: "Expired", rejected: "Rejected" };
export const ACCESS_LABEL: Record<AccessLevel, string> = { public: "Public", internal: "Internal", restricted: "Restricted", confidential: "Confidential", highly_confidential: "Highly confidential" };

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(list: Document[], orgId: string) {
  const p = `DOC-${suf(orgId)}-`;
  const m = list.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(5, "0")}`;
}

export function listDocuments(opts: { organizationId: string; category?: DocCategory; status?: DocStatus; patientId?: string; department?: string; search?: string }): Document[] {
  return docs.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.patientId ? r.patientId === opts.patientId : true))
    .filter((r) => (opts.department ? r.department === opts.department : true))
    .filter((r) => {
      if (!opts.search) return true;
      const q = opts.search.toLowerCase();
      return r.title.toLowerCase().includes(q) || (r.documentNumber || "").toLowerCase().includes(q) || (r.tags || "").toLowerCase().includes(q);
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function createDocument(orgId: string, input: Partial<Document>): { ok: true; record: Document } | { ok: false; error: string } {
  if (!input.title || !input.category) return { ok: false, error: "missing_required" };
  const now = new Date().toISOString();
  const r: Document = {
    id: nextId(docs, orgId), organizationId: orgId,
    title: input.title,
    category: input.category as DocCategory,
    documentNumber: input.documentNumber,
    status: (input.status || "draft") as DocStatus,
    accessLevel: (input.accessLevel || "internal") as AccessLevel,
    fileName: input.fileName, fileSize: input.fileSize, mimeType: input.mimeType,
    storageUri: input.storageUri, checksum: input.checksum,
    version: input.version || "1.0",
    supersedes: input.supersedes,
    patientId: input.patientId, patientName: input.patientName,
    encounterId: input.encounterId,
    department: input.department,
    authorName: input.authorName, authorRole: input.authorRole,
    reviewedBy: input.reviewedBy, approvedBy: input.approvedBy, approvedAt: input.approvedAt,
    effectiveDate: input.effectiveDate, expiryDate: input.expiryDate, retentionUntil: input.retentionUntil,
    tags: input.tags, description: input.description,
    accessCount: 0,
    createdAt: now, updatedAt: now,
  };
  docs.push(r); return { ok: true, record: r };
}

export function updateDocument(id: string, orgId: string, patch: Partial<Document>): Document | null {
  const i = docs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  docs.splice(i, 1, { ...docs[i], ...patch, id: docs[i].id, organizationId: docs[i].organizationId, accessCount: docs[i].accessCount, updatedAt: new Date().toISOString() });
  return docs[i];
}

export function deleteDocument(id: string, orgId: string): boolean {
  const i = docs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  docs.splice(i, 1); return true;
}

export function computeStats(orgId: string) {
  const my = docs.filter((r) => r.organizationId === orgId);
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  return {
    total: my.length,
    active: my.filter((r) => r.status === "active" || r.status === "approved").length,
    pending: my.filter((r) => r.status === "pending_review" || r.status === "draft").length,
    expiringSoon: my.filter((r) => r.expiryDate && r.expiryDate >= today && r.expiryDate <= in30).length,
    expired: my.filter((r) => r.status === "expired" || (r.expiryDate && r.expiryDate < today)).length,
    totalSize: Math.round(my.reduce((s, r) => s + (r.fileSize || 0), 0) / 1024 / 1024),
  };
}

export function unlinkDocumentsForPatient(patientId: string, orgId: string): void {
  const stamp = new Date().toISOString();
  for (const r of docs) {
    if (r.organizationId === orgId && r.patientId === patientId) {
      r.patientId = "";
      r.patientName = `[removed] ${r.patientName || ""}`.trim();
      r.updatedAt = stamp;
    }
  }
  // flush:auto-unlink
  docs.splice(docs.length, 0);
}
