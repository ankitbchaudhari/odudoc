// Pharma drug catalogue with anti-counterfeit attachments.
//
// Each entry is one SKU registered by a pharma company. Required:
// brand + generic + composition + manufacturer license number.
// Recommended: regulatory paper (DCGI/CDSCO approval letter scan),
// batch lab report, packaging photo. Doctors verify a vendor's
// claim against this catalogue before prescribing — if the brand
// + batch combination isn't in the registry, it's flagged.

import { bindPersistentArray } from "../persistent-array";

export type DrugForm =
  | "tablet" | "capsule" | "syrup" | "injection"
  | "topical" | "inhaler" | "drops" | "patch" | "other";

export type DrugScheduleClass =
  | "OTC"   // over the counter
  | "H"     // schedule H (prescription drugs)
  | "H1"    // schedule H1 (psychotropics, antibiotics — extra reporting)
  | "X"     // schedule X (narcotics)
  | "G"     // schedule G (insulin etc.)
  | "K";    // homoeopathic, ayurveda flag

export interface DrugAttachment {
  /** "regulatory_paper" | "batch_lab_report" | "packaging_photo" | "other" */
  kind: "regulatory_paper" | "batch_lab_report" | "packaging_photo" | "other";
  title: string;
  /** data: URL — caps at 256 KB per attachment to keep payloads sane. */
  data: string;
  mimeType: string;
  uploadedAt: string;
}

export interface DrugRegistration {
  id: string;
  /** Pharma company organizationId. */
  organizationId: string;
  brandName: string;
  genericName: string;
  /** Active ingredient composition string ("Paracetamol 500 mg + Caffeine 30 mg"). */
  composition: string;
  form: DrugForm;
  /** Strength incl. unit ("500 mg", "100 mg/5 mL"). */
  strength: string;
  scheduleClass: DrugScheduleClass;
  /** Manufacturing license / DCGI approval number. */
  manufacturerLicense: string;
  /** Country of registration — ISO-3166-1 alpha-2. */
  countryIso2: string;
  /** Batch register — each batch ships with its own lab report. */
  batches: Array<{
    batchNumber: string;
    manufacturedOn: string;
    expiresOn: string;
    /** When the lab report attachment id covers this batch. */
    labReportAttachmentIndex?: number;
    notes?: string;
  }>;
  attachments: DrugAttachment[];
  /** Authorized distributor / retailer ids that may legally sell this. */
  authorizedDistributorIds?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_ATTACHMENT_BYTES = 256 * 1024;

const drugs: DrugRegistration[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<DrugRegistration>(
  "pharma_drugs",
  drugs,
  () => []
);
await hydrate();

export interface CreateDrugInput {
  organizationId: string;
  brandName: string;
  genericName: string;
  composition: string;
  form: DrugForm;
  strength: string;
  scheduleClass: DrugScheduleClass;
  manufacturerLicense: string;
  countryIso2: string;
}

export function createDrug(input: CreateDrugInput): DrugRegistration {
  const at = new Date().toISOString();
  const d: DrugRegistration = {
    id: `drug-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    brandName: input.brandName.trim(),
    genericName: input.genericName.trim(),
    composition: input.composition.trim(),
    form: input.form,
    strength: input.strength.trim(),
    scheduleClass: input.scheduleClass,
    manufacturerLicense: input.manufacturerLicense.trim(),
    countryIso2: input.countryIso2.trim().toUpperCase(),
    batches: [],
    attachments: [],
    authorizedDistributorIds: [],
    active: true,
    createdAt: at, updatedAt: at,
  };
  drugs.unshift(d);
  flush();
  return d;
}

export function listDrugs(opts: { organizationId?: string; query?: string; activeOnly?: boolean } = {}): DrugRegistration[] {
  let list = [...drugs];
  if (opts.organizationId) list = list.filter((d) => d.organizationId === opts.organizationId);
  if (opts.activeOnly) list = list.filter((d) => d.active);
  if (opts.query) {
    const q = opts.query.toLowerCase();
    list = list.filter((d) =>
      d.brandName.toLowerCase().includes(q) ||
      d.genericName.toLowerCase().includes(q) ||
      d.composition.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getDrug(id: string): DrugRegistration | null {
  return drugs.find((d) => d.id === id) || null;
}

export function attachToDrug(id: string, attachment: Omit<DrugAttachment, "uploadedAt">): { ok: true; drug: DrugRegistration } | { ok: false; error: string } {
  const d = drugs.find((x) => x.id === id);
  if (!d) return { ok: false, error: "drug_not_found" };
  if (!attachment.data.startsWith("data:")) return { ok: false, error: "invalid_data_url" };
  const b64 = attachment.data.slice(attachment.data.indexOf(",") + 1);
  const bytes = Math.floor((b64.length * 3) / 4);
  if (bytes > MAX_ATTACHMENT_BYTES) return { ok: false, error: "attachment_too_large" };
  d.attachments.push({ ...attachment, uploadedAt: new Date().toISOString() });
  d.updatedAt = new Date().toISOString();
  flush();
  return { ok: true, drug: d };
}

export function addBatch(id: string, batch: DrugRegistration["batches"][number]): DrugRegistration | null {
  const d = drugs.find((x) => x.id === id);
  if (!d) return null;
  // Idempotent on batchNumber.
  if (d.batches.find((b) => b.batchNumber === batch.batchNumber)) return d;
  d.batches.push(batch);
  d.updatedAt = new Date().toISOString();
  flush();
  return d;
}

export function setActive(id: string, active: boolean): DrugRegistration | null {
  const d = drugs.find((x) => x.id === id);
  if (!d) return null;
  d.active = active;
  d.updatedAt = new Date().toISOString();
  flush();
  return d;
}

export function deleteDrug(id: string, organizationId: string): boolean {
  const i = drugs.findIndex((d) => d.id === id && d.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(drugs[i].id);
  drugs.splice(i, 1);
  flush();
  return true;
}

export function deleteDrugsForOrg(organizationId: string): number {
  let n = 0;
  for (let i = drugs.length - 1; i >= 0; i--) {
    if (drugs[i].organizationId === organizationId) {
      tombstone(drugs[i].id);
      drugs.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

/** Anti-counterfeit verification: given a brand + batch, return the
 *  matching registration (if any). Doctors / pharmacists call this
 *  to check a strip before dispensing. */
export interface VerificationHit {
  drug: DrugRegistration;
  batch?: DrugRegistration["batches"][number];
  /** "exact" — both brand and batch matched.
   *  "brand_only" — brand matched, batch number not in register. */
  match: "exact" | "brand_only";
}

export function verifyBrandBatch(brandName: string, batchNumber?: string): VerificationHit | null {
  const brand = brandName.trim().toLowerCase();
  for (const d of drugs) {
    if (!d.active) continue;
    if (d.brandName.toLowerCase() !== brand) continue;
    if (!batchNumber) return { drug: d, match: "brand_only" };
    const b = d.batches.find((x) => x.batchNumber.toLowerCase() === batchNumber.trim().toLowerCase());
    if (b) return { drug: d, batch: b, match: "exact" };
    // brand exists but batch not registered — still flag as suspicious-vs-counterfeit.
    return { drug: d, match: "brand_only" };
  }
  return null;
}

export const PHARMA_MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_BYTES;
