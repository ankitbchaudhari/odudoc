// Radiology / Imaging orders. Tenant-scoped.
//
// Mirrors the lab-orders shape but for imaging studies. A RadiologyOrder has:
// - one modality (X-ray, CT, MRI, US, mammography, etc.)
// - one or more requested views / studies
// - contrast flag + kidney-function clearance check
// - after the study: radiologist report (findings + impression) + optional
//   image URIs (links to PACS / DICOM viewer; we store references only).
//
// Status machine:
//   ordered → scheduled → in_progress → completed → reported
//   (cancelled at any point)

import { bindPersistentArray } from "../persistent-array";

export type Modality =
  | "xray"
  | "ct"
  | "mri"
  | "ultrasound"
  | "mammography"
  | "fluoroscopy"
  | "nuclear"
  | "pet"
  | "dexa"
  | "other";

export type RadiologyStatus =
  | "ordered"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "reported"
  | "cancelled";

export type RadiologyPriority = "routine" | "urgent" | "stat";

export interface ImageReference {
  url: string; // PACS link, DICOM viewer URL, or storage URL
  label?: string; // "AP view", "T2 axial", etc.
}

export interface RadiologyOrder {
  id: string;
  organizationId: string;
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  modality: Modality;
  studyName: string; // "Chest X-ray PA/Lat", "MRI Brain with contrast"
  bodyPart?: string;
  views?: string[]; // requested views/projections
  contrast: boolean;
  contrastAgent?: string;
  clinicalIndication?: string;
  priority: RadiologyPriority;
  orderedBy?: string;
  orderedAt: string;
  scheduledAt?: string;
  performedAt?: string;
  reportedAt?: string;
  // Report
  technique?: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  criticalFlag?: boolean; // for critical/abnormal findings requiring call-back
  images: ImageReference[];
  status: RadiologyStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const orders: RadiologyOrder[] = [];
const { hydrate, flush } = bindPersistentArray<RadiologyOrder>(
  "hospital-radiology-orders",
  orders,
  () => []
);
await hydrate();

export function listOrders(opts: {
  organizationId: string;
  patientId?: string;
  modality?: Modality;
  status?: RadiologyStatus;
  priority?: RadiologyPriority;
}): RadiologyOrder[] {
  let list = orders.filter((o) => o.organizationId === opts.organizationId);
  if (opts.patientId) list = list.filter((o) => o.patientId === opts.patientId);
  if (opts.modality) list = list.filter((o) => o.modality === opts.modality);
  if (opts.status) list = list.filter((o) => o.status === opts.status);
  if (opts.priority) list = list.filter((o) => o.priority === opts.priority);
  return list.sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime()
  );
}

export function getOrderById(
  id: string,
  organizationId: string
): RadiologyOrder | null {
  const o = orders.find((x) => x.id === id);
  if (!o || o.organizationId !== organizationId) return null;
  return o;
}

export interface OrderInput {
  patientId: string;
  encounterId?: string;
  admissionId?: string;
  modality: Modality;
  studyName: string;
  bodyPart?: string;
  views?: string[];
  contrast?: boolean;
  contrastAgent?: string;
  clinicalIndication?: string;
  priority?: RadiologyPriority;
  orderedBy?: string;
  notes?: string;
}

export function createOrder(
  organizationId: string,
  input: OrderInput
): RadiologyOrder {
  const now = new Date().toISOString();
  const o: RadiologyOrder = {
    id: `rad-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId,
    patientId: input.patientId,
    encounterId: input.encounterId,
    admissionId: input.admissionId,
    modality: input.modality,
    studyName: input.studyName.trim(),
    bodyPart: input.bodyPart?.trim() || undefined,
    views: (input.views || []).map((v) => v.trim()).filter(Boolean),
    contrast: !!input.contrast,
    contrastAgent: input.contrastAgent?.trim() || undefined,
    clinicalIndication: input.clinicalIndication?.trim() || undefined,
    priority: input.priority || "routine",
    orderedBy: input.orderedBy?.trim() || undefined,
    orderedAt: now,
    images: [],
    status: "ordered",
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
  orders.unshift(o);
  flush();
  return o;
}

export interface OrderPatch {
  status?: RadiologyStatus;
  scheduledAt?: string;
  performedAt?: string;
  reportedAt?: string;
  technique?: string;
  findings?: string;
  impression?: string;
  radiologist?: string;
  criticalFlag?: boolean;
  notes?: string;
  // Order-level editable fields (pre-performed)
  modality?: Modality;
  studyName?: string;
  bodyPart?: string;
  views?: string[];
  contrast?: boolean;
  contrastAgent?: string;
  clinicalIndication?: string;
  priority?: RadiologyPriority;
  orderedBy?: string;
  // Images
  addImage?: ImageReference;
  removeImageUrl?: string;
}

export function updateOrder(
  id: string,
  organizationId: string,
  patch: OrderPatch
): RadiologyOrder | null {
  const o = orders.find(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (!o) return null;
  const now = new Date().toISOString();

  if (patch.modality !== undefined) o.modality = patch.modality;
  if (patch.studyName !== undefined) o.studyName = patch.studyName.trim();
  if (patch.bodyPart !== undefined) o.bodyPart = patch.bodyPart?.trim() || undefined;
  if (patch.views !== undefined)
    o.views = patch.views.map((v) => v.trim()).filter(Boolean);
  if (patch.contrast !== undefined) o.contrast = !!patch.contrast;
  if (patch.contrastAgent !== undefined)
    o.contrastAgent = patch.contrastAgent?.trim() || undefined;
  if (patch.clinicalIndication !== undefined)
    o.clinicalIndication = patch.clinicalIndication?.trim() || undefined;
  if (patch.priority !== undefined) o.priority = patch.priority;
  if (patch.orderedBy !== undefined)
    o.orderedBy = patch.orderedBy?.trim() || undefined;
  if (patch.notes !== undefined) o.notes = patch.notes;

  if (patch.technique !== undefined) o.technique = patch.technique;
  if (patch.findings !== undefined) o.findings = patch.findings;
  if (patch.impression !== undefined) o.impression = patch.impression;
  if (patch.radiologist !== undefined)
    o.radiologist = patch.radiologist?.trim() || undefined;
  if (patch.criticalFlag !== undefined) o.criticalFlag = !!patch.criticalFlag;

  if (patch.scheduledAt !== undefined) o.scheduledAt = patch.scheduledAt;
  if (patch.performedAt !== undefined) o.performedAt = patch.performedAt;
  if (patch.reportedAt !== undefined) o.reportedAt = patch.reportedAt;

  if (patch.addImage && patch.addImage.url.trim()) {
    o.images.push({
      url: patch.addImage.url.trim(),
      label: patch.addImage.label?.trim() || undefined,
    });
  }
  if (patch.removeImageUrl) {
    o.images = o.images.filter((i) => i.url !== patch.removeImageUrl);
  }

  if (patch.status !== undefined) {
    o.status = patch.status;
    if (patch.status === "scheduled" && !o.scheduledAt) o.scheduledAt = now;
    if (patch.status === "in_progress" && !o.performedAt) o.performedAt = now;
    if (patch.status === "reported" && !o.reportedAt) o.reportedAt = now;
  }

  // Auto-advance: if a report is authored (impression set), bump to reported.
  if (
    o.status !== "cancelled" &&
    o.status !== "reported" &&
    o.impression &&
    o.impression.trim().length > 0
  ) {
    o.status = "reported";
    if (!o.reportedAt) o.reportedAt = now;
  }

  o.updatedAt = now;
  flush();
  return o;
}

export function deleteOrder(id: string, organizationId: string): boolean {
  const i = orders.findIndex(
    (x) => x.id === id && x.organizationId === organizationId
  );
  if (i < 0) return false;
  orders.splice(i, 1);
  flush();
  return true;
}

export function deleteOrdersForPatient(
  patientId: string,
  organizationId: string
): number {
  let removed = 0;
  for (let i = orders.length - 1; i >= 0; i--) {
    const o = orders[i];
    if (o.patientId === patientId && o.organizationId === organizationId) {
      orders.splice(i, 1);
      removed++;
    }
  }
  if (removed) flush();
  return removed;
}
