// Demo-data wizard.
//
// One pure function that, given an active org context, populates
// every store we ship with realistic-but-clearly-demo data. Used by
// /admin/demo-wizard for the "this hospital just signed up — fill
// everything so the demo lights up" path. Idempotent-ish: each
// section checks for existing rows before creating, so re-running
// the wizard doesn't double everything.
//
// Returns a structured report the UI renders as a checklist of
// what was created vs skipped.

import { addStaff as addRosterStaff, listStaff as listRosterStaff } from "./roster/store";
import { seedDemoSkus } from "./procurement/sku-store";
import { seedDemoStock } from "./rx-fulfillment/pharmacy-stock-store";
import { upsertEmpanelment, listEmpanelmentsForOrg } from "./insurance/tpa-store";
import { createBed, listBedsForOrg } from "./teleicu/bed-store";

export interface SeedReport {
  rosterStaffCreated: number;
  rosterStaffSkipped: number;
  procurementSkusCreated: number;
  pharmacyStockCreated: number;
  pharmacyStockSeeded: string[];
  tpaEmpanelmentsCreated: number;
  teleIcuBedsCreated: number;
  notes: string[];
}

const DEMO_STAFF: Array<{ name: string; role: "doctor" | "nurse" | "receptionist" | "pharmacist" | "lab_tech"; specialty?: string }> = [
  { name: "Dr. Aanya Sharma", role: "doctor", specialty: "Cardiology" },
  { name: "Dr. Rohan Iyer", role: "doctor", specialty: "Endocrinology" },
  { name: "Dr. Priya Menon", role: "doctor", specialty: "General medicine" },
  { name: "Dr. Vikram Patel", role: "doctor", specialty: "Pulmonology" },
  { name: "Dr. Sneha Reddy", role: "doctor", specialty: "Paediatrics" },
  { name: "Dr. Karthik Nair", role: "doctor", specialty: "Orthopaedics" },
  { name: "Sister Anjali Rao", role: "nurse" },
  { name: "Sister Meera Pillai", role: "nurse" },
  { name: "Sister Divya Verma", role: "nurse" },
  { name: "Sister Lakshmi Joshi", role: "nurse" },
  { name: "Sister Kavya Nambiar", role: "nurse" },
  { name: "Sister Aishwarya Krishnan", role: "nurse" },
  { name: "Ravi Subramanian", role: "receptionist" },
  { name: "Pooja Bhatt", role: "receptionist" },
  { name: "Rajesh Kapoor", role: "pharmacist" },
  { name: "Suresh Iyengar", role: "lab_tech" },
];

const DEMO_TPAS: Array<{ tpaId: string; discountPct: number; contactPerson: string; contactPhone: string }> = [
  { tpaId: "star", discountPct: 10, contactPerson: "Mr. Suresh Patil", contactPhone: "+91 98765 11111" },
  { tpaId: "hdfcergo", discountPct: 8, contactPerson: "Ms. Reshma D", contactPhone: "+91 98765 22222" },
  { tpaId: "bajaj", discountPct: 12, contactPerson: "Mr. Anil K", contactPhone: "+91 98765 33333" },
  { tpaId: "mediassist", discountPct: 7, contactPerson: "Ms. Sneha P", contactPhone: "+91 98765 44444" },
  { tpaId: "abpmjay", discountPct: 0, contactPerson: "PM-JAY desk officer", contactPhone: "1800-180-1104" },
];

const DEMO_BEDS: Array<{ label: string; ward: string }> = [
  { label: "ICU-1 Bed 1", ward: "ICU" },
  { label: "ICU-1 Bed 2", ward: "ICU" },
  { label: "ICU-1 Bed 3", ward: "ICU" },
  { label: "ICU-1 Bed 4", ward: "ICU" },
  { label: "HDU Bed 1", ward: "HDU" },
  { label: "HDU Bed 2", ward: "HDU" },
];

export function runDemoWizard(orgId: string): SeedReport {
  const report: SeedReport = {
    rosterStaffCreated: 0,
    rosterStaffSkipped: 0,
    procurementSkusCreated: 0,
    pharmacyStockCreated: 0,
    pharmacyStockSeeded: [],
    tpaEmpanelmentsCreated: 0,
    teleIcuBedsCreated: 0,
    notes: [],
  };

  // ── Roster staff ───────────────────────────────────────────
  const existingStaff = new Set(listRosterStaff(orgId).map((s) => s.name.toLowerCase()));
  for (const s of DEMO_STAFF) {
    if (existingStaff.has(s.name.toLowerCase())) {
      report.rosterStaffSkipped++;
      continue;
    }
    addRosterStaff({
      organizationId: orgId,
      name: s.name,
      role: s.role,
      specialty: s.specialty,
    });
    report.rosterStaffCreated++;
  }

  // ── Procurement SKUs ───────────────────────────────────────
  const procResult = seedDemoSkus(orgId);
  report.procurementSkusCreated = procResult.inserted;
  if (procResult.inserted > 0) report.notes.push("Several SKUs are at-or-near reorder — run the scanner to draft POs.");

  // ── Pharmacy marketplace stock (3 demo pharmacies) ─────────
  const pharm = seedDemoStock();
  report.pharmacyStockCreated = pharm.inserted;
  report.pharmacyStockSeeded = pharm.pharmacies;

  // ── TPA empanelments ───────────────────────────────────────
  const existingEmp = new Set(listEmpanelmentsForOrg(orgId).map((e) => e.tpaId));
  for (const t of DEMO_TPAS) {
    if (existingEmp.has(t.tpaId)) continue;
    upsertEmpanelment({
      organizationId: orgId,
      tpaId: t.tpaId,
      discountPct: t.discountPct,
      contactPerson: t.contactPerson,
      contactPhone: t.contactPhone,
    });
    report.tpaEmpanelmentsCreated++;
  }

  // ── Tele-ICU beds ──────────────────────────────────────────
  const existingBeds = new Set(listBedsForOrg(orgId).map((b) => b.bedLabel));
  for (const b of DEMO_BEDS) {
    if (existingBeds.has(b.label)) continue;
    createBed({ organizationId: orgId, bedLabel: b.label, ward: b.ward });
    report.teleIcuBedsCreated++;
  }

  if (report.rosterStaffCreated > 0) {
    report.notes.push(`Generate a roster from /admin/auto-roster — ${report.rosterStaffCreated} staff just landed.`);
  }
  if (report.tpaEmpanelmentsCreated > 0) {
    report.notes.push(`/admin/cashless: ${report.tpaEmpanelmentsCreated} TPAs empanelled.`);
  }
  if (report.teleIcuBedsCreated > 0) {
    report.notes.push(`/admin/teleicu: ${report.teleIcuBedsCreated} ICU beds ready — assign patients to start NEWS2 monitoring.`);
  }

  return report;
}
