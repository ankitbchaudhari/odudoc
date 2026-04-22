// Consent Forms. Tenant-scoped.
//
// Captures medico-legal consent documents — for admissions, surgeries,
// anesthesia, blood transfusions, research enrolment, photography, DNR, and
// discharge-against-medical-advice. Each form records who signed, in what
// language, and whether a translator/witness was present.
//
// Status machine:  draft → signed → revoked | expired
//
// A signed form is immutable in its clinical fields; status can still flip
// to "revoked" (patient withdrew consent) or "expired" (time-bound consent,
// e.g. research protocol window).

import { bindPersistentArray } from "../persistent-array";

export type ConsentType =
  | "general_admission"
  | "surgery"
  | "anesthesia"
  | "blood_transfusion"
  | "research"
  | "photo_video"
  | "hiv_testing"
  | "dnr"
  | "dama"
  | "other";

export type ConsentStatus = "draft" | "signed" | "revoked" | "expired";

export type EntityType =
  | "encounter"
  | "admission"
  | "surgery"
  | "transfusion"
  | "general";

export interface ConsentForm {
  id: string;
  organizationId: string;
  formNumber: string; // CNS-{suffix}-{seq}
  patientId: string;
  entityType: EntityType;
  entityId?: string;
  type: ConsentType;
  title: string; // human label
  procedureName?: string; // surgery / procedure specifics
  risks?: string; // free-text disclosure of risks explained
  alternatives?: string;
  explainedBy?: string; // doctor name
  languageUsed?: string; // "English", "Hindi", "Marathi"
  translatorName?: string;
  patientSignatureName: string;
  patientSignedAt?: string;
  guardianSignatureName?: string;
  guardianRelation?: string;
  witnessName?: string;
  witnessSignedAt?: string;
  digitalSignatureRef?: string; // e-sign transaction id
  documentUrl?: string; // scanned / uploaded PDF
  validUntil?: string; // for time-bound consents
  revokedAt?: string;
  revocationReason?: string;
  status: ConsentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const forms: ConsentForm[] = [];
const { hydrate, flush } = bindPersistentArray<ConsentForm>(
  "hospital-consent-forms",
  forms,
  () => []
);
await hydrate();

function orgSuffix(orgId: string): string {
  return orgId.replace(/^org-/, "").slice(0, 4).toUpperCase();
}

function nextFormNumber(orgId: string): string {
  const n = forms.filter((f) => f.organizationId === orgId).length + 1;
  return `CNS-${orgSuffix(orgId)}-${String(n).padStart(5, "0")}`;
}

// Auto-expire time-bound consents on read.
function markExpiredIfDue(f: ConsentForm) {
  if (
    f.status === "signed" &&
    f.validUntil &&
    new Date(f.validUntil).getTime() < Date.now()
  ) {
    f.status = "expired";
  }
}

export const CONSENT_LABEL: Record<ConsentType, string> = {
  general_admission: "General Admission Consent",
  surgery: "Surgical Consent",
  anesthesia: "Anesthesia Consent",
  blood_transfusion: "Blood Transfusion Consent",
  research: "Research Enrolment Consent",
  photo_video: "Photo / Video Consent",
  hiv_testing: "HIV Testing Consent",
  dnr: "Do-Not-Resuscitate Order",
  dama: "Discharge Against Medical Advice",
  other: "Other",
};

export function listForms(opts: {
  organizationId: string;
  patientId?: string;
  entityType?: EntityType;
  entityId?: string;
  type?: ConsentType;
  status?: ConsentStatus;
}): ConsentForm[] {
  let list = forms.filter((f) => f.organizationId === opts.organizationId);
  for (const f of list) markExpiredIfDue(f);
  if (opts.patientId) list = list.filter((f) => f.patientId === opts.patientId);
  if (opts.entityType)
    list = list.filter((f) => f.entityType === opts.entityType);
  if (opts.entityId) list = list.filter((f) => f.entityId === opts.entityId);
  if (opts.type) list = list.filter((f) => f.type === opts.type);
  if (opts.status) list = list.filter((f) => f.status === opts.status);
  return list.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export interface FormInput {
  patientId: string;
  entityType?: EntityType;
  entityId?: string;
  type: ConsentType;
  title?: string;
  procedureName?: string;
  risks?: string;
  alternatives?: string;
  explainedBy?: string;
  languageUsed?: string;
  translatorName?: string;
  patientSignatureName?: string;
  guardianSignatureName?: string;
  guardianRelation?: string;
  witnessName?: string;
  digitalSignatureRef?: string;
  documentUrl?: string;
  validUntil?: string;
  status?: ConsentStatus;
  notes?: string;
}

export function createForm(
  organizationId: string,
  input: FormInput
): ConsentForm {
  const now = new Date().toISOString();
  const title = input.title?.trim() || CONSENT_LABEL[input.type];
  const status: ConsentStatus =
    input.status ||
    (input.patientSignatureName?.trim() ? "signed" : "draft");
  const f: ConsentForm = {
    id: `cns-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    formNumber: nextFormNumber(organizationId),
    patientId: input.patientId,
    entityType: input.entityType || "general",
    entityId: input.entityId || undefined,
    type: input.type,
    title,
    procedureName: input.procedureName?.trim() || undefined,
    risks: input.risks?.trim() || undefined,
    alternatives: input.alternatives?.trim() || undefined,
    explainedBy: input.explainedBy?.trim() || undefined,
    languageUsed: input.languageUsed?.trim() || undefined,
    translatorName: input.translatorName?.trim() || undefined,
    patientSignatureName: input.patientSignatureName?.trim() || "",
    patientSignedAt:
      status === "signed" && input.patientSignatureName?.trim() ? now : undefined,
    guardianSignatureName:
      input.guardianSignatureName?.trim() || undefined,
    guardianRelation: input.guardianRelation?.trim() || undefined,
    witnessName: input.witnessName?.trim() || undefined,
    witnessSignedAt:
      status === "signed" && input.witnessName?.trim() ? now : undefined,
    digitalSignatureRef: input.digitalSignatureRef?.trim() || undefined,
    documentUrl: input.documentUrl?.trim() || undefined,
    validUntil: input.validUntil || undefined,
    status,
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  forms.unshift(f);
  flush();
  return f;
}

export interface FormPatch {
  title?: string;
  procedureName?: string;
  risks?: string;
  alternatives?: string;
  explainedBy?: string;
  languageUsed?: string;
  translatorName?: string;
  patientSignatureName?: string;
  guardianSignatureName?: string;
  guardianRelation?: string;
  witnessName?: string;
  digitalSignatureRef?: string;
  documentUrl?: string;
  validUntil?: string;
  notes?: string;
  status?: ConsentStatus;
  revocationReason?: string;
}

export function updateForm(
  id: string,
  organizationId: string,
  patch: FormPatch
): ConsentForm | null {
  const f = forms.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!f) return null;
  const now = new Date().toISOString();

  // Signed forms lock clinical fields; only status, revocation, doc URL editable.
  const locked = f.status === "signed";

  if (!locked) {
    if (patch.title !== undefined) f.title = patch.title.trim();
    if (patch.procedureName !== undefined)
      f.procedureName = patch.procedureName?.trim() || undefined;
    if (patch.risks !== undefined) f.risks = patch.risks;
    if (patch.alternatives !== undefined) f.alternatives = patch.alternatives;
    if (patch.explainedBy !== undefined)
      f.explainedBy = patch.explainedBy?.trim() || undefined;
    if (patch.languageUsed !== undefined)
      f.languageUsed = patch.languageUsed?.trim() || undefined;
    if (patch.translatorName !== undefined)
      f.translatorName = patch.translatorName?.trim() || undefined;
    if (patch.patientSignatureName !== undefined)
      f.patientSignatureName = patch.patientSignatureName.trim();
    if (patch.guardianSignatureName !== undefined)
      f.guardianSignatureName =
        patch.guardianSignatureName?.trim() || undefined;
    if (patch.guardianRelation !== undefined)
      f.guardianRelation = patch.guardianRelation?.trim() || undefined;
    if (patch.witnessName !== undefined)
      f.witnessName = patch.witnessName?.trim() || undefined;
    if (patch.digitalSignatureRef !== undefined)
      f.digitalSignatureRef =
        patch.digitalSignatureRef?.trim() || undefined;
    if (patch.validUntil !== undefined) f.validUntil = patch.validUntil;
  }

  if (patch.documentUrl !== undefined)
    f.documentUrl = patch.documentUrl?.trim() || undefined;
  if (patch.notes !== undefined) f.notes = patch.notes;

  if (patch.status !== undefined) {
    if (patch.status === "signed" && f.status !== "signed") {
      if (!f.patientSignatureName.trim()) {
        // Use what was passed if any, else reject.
        if (patch.patientSignatureName?.trim()) {
          f.patientSignatureName = patch.patientSignatureName.trim();
        }
      }
      f.status = "signed";
      if (!f.patientSignedAt) f.patientSignedAt = now;
      if (f.witnessName && !f.witnessSignedAt) f.witnessSignedAt = now;
    } else if (patch.status === "revoked") {
      f.status = "revoked";
      f.revokedAt = now;
      if (patch.revocationReason !== undefined)
        f.revocationReason = patch.revocationReason;
    } else {
      f.status = patch.status;
    }
  }

  f.updatedAt = now;
  flush();
  return f;
}

export function deleteForm(id: string, organizationId: string): boolean {
  const i = forms.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  forms.splice(i, 1);
  flush();
  return true;
}

export function deleteConsentForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = forms.length - 1; i >= 0; i--) {
    const f = forms[i];
    if (f.patientId === patientId && f.organizationId === organizationId) {
      forms.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
