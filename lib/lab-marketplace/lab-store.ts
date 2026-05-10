// Lab marketplace.
//
// A diagnostic chain registers the tests it offers + price + lead
// time. Doctors order tests during/after an encounter; patients see
// a ranked list of nearby labs that can fulfil the order, pick one,
// and book either home-collection or in-lab visit. OduDoc takes a
// configurable cut.
//
// Distinct from the existing rx-fulfillment pharmacy stack — this
// is the diagnostic chain side. Same matching ergonomics so the UI
// and the patient flow look familiar.

import { bindPersistentArray } from "../persistent-array";

/** Test catalogue. Each row is one test offered by one lab branch. */
export interface LabTestEntry {
  id: string;
  labId: string;
  labName: string;
  city?: string;
  pincode?: string;
  /** Canonical test code matching what doctors order ("CBC", "LFT",
   *  "HBA1C", "TROPONIN", "MRI-LSPINE"). Normalised on insert. */
  testCode: string;
  testName: string;
  /** Coarse category for filter chips. */
  category: "blood" | "urine" | "imaging" | "ecg" | "biopsy" | "stool" | "other";
  mrpRupees: number;
  discountPct: number;
  /** Hours from sample collection (or scan) to result. */
  reportingHours: number;
  /** Same-day collection slots open (heuristic; capacity isn't
   *  modeled in detail for the demo). */
  homeCollection: boolean;
  homeCollectionFeeRupees?: number;
  /** Whether the lab is NABL-accredited (for the trust badge). */
  nablAccredited?: boolean;
  /** Sample requirements / fasting rules. */
  fastingHours?: number;
  notes?: string;
  active: boolean;
  updatedAt: string;
}

const tests: LabTestEntry[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<LabTestEntry>(
  "lab_tests",
  tests,
  () => []
);
await hydrate();

function normaliseTestCode(s: string): string {
  return s.toUpperCase().replace(/\s+/g, "").replace(/[._-]+/g, "-").slice(0, 32);
}

export function listTestsForLab(labId: string): LabTestEntry[] {
  return tests
    .filter((t) => t.labId === labId)
    .sort((a, b) => a.testName.localeCompare(b.testName));
}

export function listAllLabs(): Array<{ labId: string; labName: string; city?: string; pincode?: string; testCount: number }> {
  const map = new Map<string, { labName: string; city?: string; pincode?: string; testCount: number }>();
  for (const t of tests) {
    const e = map.get(t.labId);
    if (e) e.testCount++;
    else map.set(t.labId, { labName: t.labName, city: t.city, pincode: t.pincode, testCount: 1 });
  }
  return Array.from(map.entries()).map(([labId, e]) => ({ labId, ...e }));
}

export function findTestsByCode(testCode: string): LabTestEntry[] {
  const norm = normaliseTestCode(testCode);
  return tests.filter((t) => t.active && normaliseTestCode(t.testCode) === norm);
}

export interface UpsertTestInput {
  labId: string;
  labName: string;
  city?: string;
  pincode?: string;
  testCode: string;
  testName: string;
  category: LabTestEntry["category"];
  mrpRupees: number;
  discountPct?: number;
  reportingHours?: number;
  homeCollection?: boolean;
  homeCollectionFeeRupees?: number;
  nablAccredited?: boolean;
  fastingHours?: number;
  notes?: string;
}

export function upsertTest(input: UpsertTestInput): LabTestEntry {
  const norm = normaliseTestCode(input.testCode);
  const existing = tests.find(
    (t) => t.labId === input.labId && normaliseTestCode(t.testCode) === norm,
  );
  const now = new Date().toISOString();
  if (existing) {
    existing.labName = input.labName;
    existing.city = input.city;
    existing.pincode = input.pincode;
    existing.testName = input.testName;
    existing.category = input.category;
    existing.mrpRupees = input.mrpRupees;
    existing.discountPct = input.discountPct ?? existing.discountPct;
    existing.reportingHours = input.reportingHours ?? existing.reportingHours;
    existing.homeCollection = input.homeCollection ?? existing.homeCollection;
    existing.homeCollectionFeeRupees = input.homeCollectionFeeRupees ?? existing.homeCollectionFeeRupees;
    existing.nablAccredited = input.nablAccredited ?? existing.nablAccredited;
    existing.fastingHours = input.fastingHours ?? existing.fastingHours;
    existing.notes = input.notes ?? existing.notes;
    existing.updatedAt = now;
    flush();
    return existing;
  }
  const e: LabTestEntry = {
    id: `lt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    labId: input.labId,
    labName: input.labName,
    city: input.city,
    pincode: input.pincode,
    testCode: norm,
    testName: input.testName.trim(),
    category: input.category,
    mrpRupees: input.mrpRupees,
    discountPct: input.discountPct ?? 0,
    reportingHours: input.reportingHours ?? 24,
    homeCollection: input.homeCollection ?? true,
    homeCollectionFeeRupees: input.homeCollectionFeeRupees ?? 99,
    nablAccredited: input.nablAccredited ?? true,
    fastingHours: input.fastingHours,
    notes: input.notes?.trim() || undefined,
    active: true,
    updatedAt: now,
  };
  tests.push(e);
  flush();
  return e;
}

export function deactivateTest(id: string): boolean {
  const t = tests.find((x) => x.id === id);
  if (!t) return false;
  t.active = false;
  t.updatedAt = new Date().toISOString();
  flush();
  return true;
}

/** Demo seed — three lab chains × ten common tests. Idempotent. */
export function seedDemoLabs(): { inserted: number; labs: string[] } {
  const existing = new Set(tests.map((t) => t.labId));
  let inserted = 0;
  const labs: string[] = [];
  for (const lab of DEMO_LABS) {
    if (existing.has(lab.labId)) continue;
    labs.push(lab.labName);
    for (const test of lab.tests) {
      upsertTest({
        labId: lab.labId,
        labName: lab.labName,
        city: lab.city,
        pincode: lab.pincode,
        ...test,
      });
      inserted++;
    }
  }
  return { inserted, labs };
}

const DEMO_LABS = [
  {
    labId: "lab-thyrocare",
    labName: "Thyrocare — Madhapur",
    city: "Hyderabad",
    pincode: "500081",
    tests: [
      { testCode: "CBC", testName: "Complete Blood Count", category: "blood" as const, mrpRupees: 350, discountPct: 25, reportingHours: 6 },
      { testCode: "LFT", testName: "Liver Function Test", category: "blood" as const, mrpRupees: 750, discountPct: 30, reportingHours: 8, fastingHours: 8 },
      { testCode: "KFT", testName: "Kidney Function Test", category: "blood" as const, mrpRupees: 850, discountPct: 30, reportingHours: 8 },
      { testCode: "HBA1C", testName: "HbA1c (Glycated haemoglobin)", category: "blood" as const, mrpRupees: 580, discountPct: 25, reportingHours: 8, fastingHours: 0 },
      { testCode: "LIPID", testName: "Lipid Profile", category: "blood" as const, mrpRupees: 850, discountPct: 25, reportingHours: 8, fastingHours: 12 },
      { testCode: "TSH", testName: "Thyroid Stimulating Hormone", category: "blood" as const, mrpRupees: 350, discountPct: 30, reportingHours: 6 },
      { testCode: "VITD", testName: "Vitamin D 25-OH", category: "blood" as const, mrpRupees: 1200, discountPct: 25, reportingHours: 24 },
      { testCode: "VITB12", testName: "Vitamin B12", category: "blood" as const, mrpRupees: 850, discountPct: 25, reportingHours: 24 },
      { testCode: "TROPONIN", testName: "Troponin I (high sensitivity)", category: "blood" as const, mrpRupees: 1450, discountPct: 15, reportingHours: 2 },
      { testCode: "URINE-RE", testName: "Urine Routine + Microscopy", category: "urine" as const, mrpRupees: 200, discountPct: 30, reportingHours: 6 },
    ],
  },
  {
    labId: "lab-apollo-dx",
    labName: "Apollo Diagnostics — Banjara Hills",
    city: "Hyderabad",
    pincode: "500034",
    tests: [
      { testCode: "CBC", testName: "Complete Blood Count", category: "blood" as const, mrpRupees: 380, discountPct: 15, reportingHours: 4 },
      { testCode: "LFT", testName: "Liver Function Test", category: "blood" as const, mrpRupees: 820, discountPct: 18, reportingHours: 6, fastingHours: 8 },
      { testCode: "KFT", testName: "Kidney Function Test", category: "blood" as const, mrpRupees: 920, discountPct: 18, reportingHours: 6 },
      { testCode: "HBA1C", testName: "HbA1c (Glycated haemoglobin)", category: "blood" as const, mrpRupees: 620, discountPct: 18, reportingHours: 6 },
      { testCode: "LIPID", testName: "Lipid Profile", category: "blood" as const, mrpRupees: 920, discountPct: 18, reportingHours: 6, fastingHours: 12 },
      { testCode: "TSH", testName: "Thyroid Stimulating Hormone", category: "blood" as const, mrpRupees: 380, discountPct: 18, reportingHours: 4 },
      { testCode: "TROPONIN", testName: "Troponin I (high sensitivity)", category: "blood" as const, mrpRupees: 1550, discountPct: 10, reportingHours: 1 },
      { testCode: "ECG", testName: "ECG (12-lead)", category: "ecg" as const, mrpRupees: 450, discountPct: 0, reportingHours: 1, homeCollection: false },
      { testCode: "USG-ABD", testName: "Ultrasound Abdomen", category: "imaging" as const, mrpRupees: 1800, discountPct: 0, reportingHours: 1, homeCollection: false },
      { testCode: "CT-CHEST", testName: "CT Chest (with contrast)", category: "imaging" as const, mrpRupees: 6500, discountPct: 0, reportingHours: 4, homeCollection: false },
    ],
  },
  {
    labId: "lab-srl",
    labName: "SRL Diagnostics — Hub",
    city: "Hyderabad",
    pincode: "500032",
    tests: [
      { testCode: "CBC", testName: "Complete Blood Count", category: "blood" as const, mrpRupees: 320, discountPct: 20, reportingHours: 12 },
      { testCode: "LIPID", testName: "Lipid Profile", category: "blood" as const, mrpRupees: 800, discountPct: 22, reportingHours: 12, fastingHours: 12 },
      { testCode: "TSH", testName: "Thyroid Stimulating Hormone", category: "blood" as const, mrpRupees: 320, discountPct: 22, reportingHours: 12 },
      { testCode: "DDIMER", testName: "D-dimer", category: "blood" as const, mrpRupees: 1450, discountPct: 18, reportingHours: 8 },
      { testCode: "CRP", testName: "C-Reactive Protein (quantitative)", category: "blood" as const, mrpRupees: 480, discountPct: 22, reportingHours: 8 },
      { testCode: "MRI-BRAIN", testName: "MRI Brain (plain)", category: "imaging" as const, mrpRupees: 7500, discountPct: 5, reportingHours: 6, homeCollection: false },
      { testCode: "MRI-LSPINE", testName: "MRI Lumbar Spine", category: "imaging" as const, mrpRupees: 8500, discountPct: 5, reportingHours: 6, homeCollection: false },
      { testCode: "URINE-RE", testName: "Urine Routine + Microscopy", category: "urine" as const, mrpRupees: 180, discountPct: 22, reportingHours: 8 },
      { testCode: "STOOL-RE", testName: "Stool Routine + Microscopy", category: "stool" as const, mrpRupees: 250, discountPct: 22, reportingHours: 12 },
      { testCode: "HBA1C", testName: "HbA1c (Glycated haemoglobin)", category: "blood" as const, mrpRupees: 540, discountPct: 22, reportingHours: 12 },
    ],
  },
];
