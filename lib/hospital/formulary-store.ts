// Pharmacy Formulary. Tenant-scoped drug master (distinct from per-patient prescriptions).
// No patient cascade. Deduplicated on (genericName + strength + dosageForm).

import { bindPersistentArray } from "../persistent-array";

export type DosageForm = "tablet" | "capsule" | "syrup" | "suspension" | "injection" | "infusion" | "drops" | "cream" | "ointment" | "patch" | "spray" | "inhaler" | "suppository" | "other";
export type DrugCategory = "antibiotic" | "analgesic" | "antihypertensive" | "antidiabetic" | "antiemetic" | "anticoagulant" | "antifungal" | "antiviral" | "antipsychotic" | "antidepressant" | "sedative" | "opioid" | "nsaid" | "steroid" | "vaccine" | "iv_fluid" | "electrolyte" | "other";
export type ScheduleClass = "OTC" | "H" | "H1" | "X" | "G" | "N" | "narcotic";
export type FormularyStatus = "active" | "non_formulary" | "restricted" | "discontinued" | "pending_pac";
export type PregnancyCategory = "A" | "B" | "C" | "D" | "X" | "N";

export interface FormularyDrug {
  id: string;                       // DRG-{suffix}-{seq}
  organizationId: string;
  genericName: string;
  brandNames?: string[];
  strength: string;                 // "500 mg", "5 mg/ml"
  dosageForm: DosageForm;
  routeOfAdmin?: string;            // oral, IV, IM, SC, topical
  category: DrugCategory;
  atcCode?: string;                 // WHO ATC (J01CA04 etc.)
  scheduleClass: ScheduleClass;     // India Schedule H / H1 / X
  status: FormularyStatus;
  pregnancyCategory?: PregnancyCategory;
  // Clinical guidance
  indications?: string;
  contraindications?: string;
  commonAdverseEffects?: string;
  typicalAdultDose?: string;
  typicalPediatricDose?: string;
  maxDailyDose?: string;
  renalAdjustment?: string;
  hepaticAdjustment?: string;
  interactionsNote?: string;
  monitoringRequired?: string;      // INR, troughs, K+
  // Economics
  unitPrice?: number;
  currency?: string;
  // Restrictions
  restrictedPrescribers?: string;   // "ICU only", "Infectious disease"
  requiresPac?: boolean;            // P&T approval required per order
  lasa?: boolean;                   // Look-Alike Sound-Alike flag
  highAlert?: boolean;              // high-alert medication
  narcotic?: boolean;
  refrigeration?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const drugs: FormularyDrug[] = [];
const hydrate = bindPersistentArray<FormularyDrug>("formulary-drugs", drugs, () => []);
await hydrate;

export const DOSAGE_LABEL: Record<DosageForm, string> = {
  tablet: "Tablet", capsule: "Capsule", syrup: "Syrup", suspension: "Suspension",
  injection: "Injection", infusion: "Infusion", drops: "Drops", cream: "Cream",
  ointment: "Ointment", patch: "Patch", spray: "Spray", inhaler: "Inhaler",
  suppository: "Suppository", other: "Other",
};
export const CATEGORY_LABEL: Record<DrugCategory, string> = {
  antibiotic: "Antibiotic", analgesic: "Analgesic", antihypertensive: "Antihypertensive",
  antidiabetic: "Antidiabetic", antiemetic: "Antiemetic", anticoagulant: "Anticoagulant",
  antifungal: "Antifungal", antiviral: "Antiviral", antipsychotic: "Antipsychotic",
  antidepressant: "Antidepressant", sedative: "Sedative", opioid: "Opioid",
  nsaid: "NSAID", steroid: "Steroid", vaccine: "Vaccine",
  iv_fluid: "IV fluid", electrolyte: "Electrolyte", other: "Other",
};
export const SCHEDULE_LABEL: Record<ScheduleClass, string> = {
  OTC: "OTC", H: "Schedule H", H1: "Schedule H1", X: "Schedule X",
  G: "Schedule G", N: "Schedule N", narcotic: "Narcotic",
};
export const STATUS_LABEL: Record<FormularyStatus, string> = {
  active: "Active", non_formulary: "Non-formulary", restricted: "Restricted",
  discontinued: "Discontinued", pending_pac: "Pending P&T",
};

function suf(o: string) { return o.slice(0, 4).toUpperCase(); }
function nextId(o: string) {
  const p = `DRG-${suf(o)}-`;
  const m = drugs.filter((r) => r.id.startsWith(p)).reduce((mx, r) => Math.max(mx, Number(r.id.slice(p.length)) || 0), 0);
  return `${p}${String(m + 1).padStart(4, "0")}`;
}

function dedupeKey(genericName: string, strength: string, dosageForm: DosageForm): string {
  return `${genericName.trim().toLowerCase()}|${strength.trim().toLowerCase()}|${dosageForm}`;
}

export function listDrugs(opts: { organizationId: string; search?: string; category?: DrugCategory; status?: FormularyStatus; highAlertOnly?: boolean; lasaOnly?: boolean }): FormularyDrug[] {
  return drugs.filter((r) => r.organizationId === opts.organizationId)
    .filter((r) => (opts.category ? r.category === opts.category : true))
    .filter((r) => (opts.status ? r.status === opts.status : true))
    .filter((r) => (opts.highAlertOnly ? !!r.highAlert : true))
    .filter((r) => (opts.lasaOnly ? !!r.lasa : true))
    .filter((r) => {
      if (!opts.search) return true;
      const s = opts.search.toLowerCase();
      if (r.genericName.toLowerCase().includes(s)) return true;
      if (r.brandNames?.some((b) => b.toLowerCase().includes(s))) return true;
      if (r.atcCode?.toLowerCase().includes(s)) return true;
      return false;
    })
    .sort((a, b) => a.genericName.localeCompare(b.genericName));
}

export function createDrug(orgId: string, input: Partial<FormularyDrug>): { ok: true; record: FormularyDrug } | { ok: false; error: string } {
  if (!input.genericName || !input.strength || !input.dosageForm || !input.category) return { ok: false, error: "missing_required" };
  const key = dedupeKey(input.genericName, input.strength, input.dosageForm as DosageForm);
  if (drugs.some((r) => r.organizationId === orgId && dedupeKey(r.genericName, r.strength, r.dosageForm) === key)) return { ok: false, error: "duplicate_drug" };
  const now = new Date().toISOString();
  const r: FormularyDrug = {
    id: nextId(orgId), organizationId: orgId,
    genericName: input.genericName,
    brandNames: input.brandNames || [],
    strength: input.strength,
    dosageForm: input.dosageForm as DosageForm,
    routeOfAdmin: input.routeOfAdmin,
    category: input.category as DrugCategory,
    atcCode: input.atcCode,
    scheduleClass: (input.scheduleClass || "OTC") as ScheduleClass,
    status: (input.status || "active") as FormularyStatus,
    pregnancyCategory: input.pregnancyCategory,
    indications: input.indications,
    contraindications: input.contraindications,
    commonAdverseEffects: input.commonAdverseEffects,
    typicalAdultDose: input.typicalAdultDose,
    typicalPediatricDose: input.typicalPediatricDose,
    maxDailyDose: input.maxDailyDose,
    renalAdjustment: input.renalAdjustment,
    hepaticAdjustment: input.hepaticAdjustment,
    interactionsNote: input.interactionsNote,
    monitoringRequired: input.monitoringRequired,
    unitPrice: input.unitPrice,
    currency: input.currency || (input.unitPrice ? "INR" : undefined),
    restrictedPrescribers: input.restrictedPrescribers,
    requiresPac: !!input.requiresPac,
    lasa: !!input.lasa,
    highAlert: !!input.highAlert,
    narcotic: !!input.narcotic || input.scheduleClass === "narcotic",
    refrigeration: !!input.refrigeration,
    notes: input.notes,
    createdAt: now, updatedAt: now,
  };
  drugs.push(r);
  return { ok: true, record: r };
}

export function updateDrug(id: string, orgId: string, patch: Partial<FormularyDrug>): FormularyDrug | null {
  const i = drugs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return null;
  const prev = drugs[i];
  const next: FormularyDrug = { ...prev, ...patch, id: prev.id, organizationId: prev.organizationId, updatedAt: new Date().toISOString() };
  // Re-check dedupe only if identity triple changed
  if (patch.genericName || patch.strength || patch.dosageForm) {
    const k = dedupeKey(next.genericName, next.strength, next.dosageForm);
    if (drugs.some((r) => r.id !== id && r.organizationId === orgId && dedupeKey(r.genericName, r.strength, r.dosageForm) === k)) return null;
  }
  drugs[i] = next;
  return next;
}

export function deleteDrug(id: string, orgId: string): boolean {
  const i = drugs.findIndex((r) => r.id === id && r.organizationId === orgId);
  if (i < 0) return false;
  drugs.splice(i, 1);
  return true;
}

export function computeStats(orgId: string) {
  const my = drugs.filter((r) => r.organizationId === orgId);
  return {
    total: my.length,
    active: my.filter((r) => r.status === "active").length,
    restricted: my.filter((r) => r.status === "restricted").length,
    nonFormulary: my.filter((r) => r.status === "non_formulary").length,
    pendingPac: my.filter((r) => r.status === "pending_pac").length,
    highAlert: my.filter((r) => r.highAlert).length,
    lasa: my.filter((r) => r.lasa).length,
    narcotic: my.filter((r) => r.narcotic).length,
  };
}
