// Departments store — Postgres-backed via bindPersistentArray.
// Admin-managed list of medical departments. Survives Lambda recycles so
// add/edit/toggle actions in /admin/departments persist.

import { bindPersistentArray } from "./persistent-array";

export type DepartmentStatus = "Active" | "Inactive";

export interface Department {
  id: string;
  name: string;
  icon: string;
  doctorCount: number;
  status: DepartmentStatus;
  description: string;
}

const now = () => Date.now();

const departments: Department[] = [];
const { hydrate, reload, flush } = bindPersistentArray<Department>(
  "departments",
  departments,
  // Empty by default — admin populates via /admin/departments. Set
  // SEED_DEMO_DEPARTMENTS=1 to bring back the 7 demo entries.
  () => process.env.SEED_DEMO_DEPARTMENTS === "1" ? [
    { id: "d1", name: "Cardiology", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", doctorCount: 0, status: "Active", description: "Heart and cardiovascular system" },
    { id: "d2", name: "Neurology", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", doctorCount: 0, status: "Active", description: "Brain and nervous system" },
    { id: "d3", name: "Orthopedics", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", doctorCount: 0, status: "Active", description: "Bones, joints, and muscles" },
    { id: "d4", name: "Pediatrics", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", doctorCount: 0, status: "Active", description: "Child healthcare" },
    { id: "d5", name: "Dermatology", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", doctorCount: 0, status: "Active", description: "Skin, hair, and nails" },
    { id: "d6", name: "Ophthalmology", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", doctorCount: 0, status: "Active", description: "Eye care and vision" },
    { id: "d7", name: "Dentistry", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", doctorCount: 0, status: "Inactive", description: "Dental and oral health" },
  ] : []
);
await hydrate();

// One-time wipe: drop all the seed-id rows we previously populated
// from the demo set and the EXTRA list, so existing deployments clear
// their department list. Custom rows added by admins (id NOT starting
// with "d" or "dept-seed-") are preserved. Safe to re-run.
(function wipeSeedDepartments() {
  if (process.env.SEED_DEMO_DEPARTMENTS === "1") return;
  const before = departments.length;
  for (let i = departments.length - 1; i >= 0; i--) {
    const id = departments[i].id;
    if (/^d\d+$/.test(id) || id.startsWith("dept-seed-")) {
      departments.splice(i, 1);
    }
  }
  if (departments.length !== before) flush();
})();

// Optional auto-seed — only fires when SEED_DEMO_DEPARTMENTS=1 is set.
//
// The earlier "auto-seed when empty" trigger was causing Lambda cold-
// start timeouts on production: hydrating + 50 postgres writes +
// flushing all happened synchronously at module load, occasionally
// breaching the ~10s cold-start budget and surfacing as 502 Bad
// Gateway via Cloudflare. The patient-facing /doctors grid has a
// 50-entry fallback in lib/data.ts that renders just fine without
// the database mirror, so requiring the env var is a safe trade-off.
//
// Admin still has full add/remove control via /admin/departments;
// the seed list below is just a one-shot loader for fresh deploys
// that opt in.
(function seedExtraDepartments() {
  if (process.env.SEED_DEMO_DEPARTMENTS !== "1") return;
  // Comprehensive specialty list — mirrors lib/data.ts#specialties so
  // the admin panel ships with the same options the patient-facing
  // fallback shows. SVG icons here use generic outlines; the patient
  // grid renders the emoji from specialty-display layer.
  const GENERIC_ICON = "M12 6v6m0 0v6m0-6h6m-6 0H6";
  const EXTRA: Omit<Department, "id">[] = [
    // Primary care
    { name: "General Medicine", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Primary care and general physicians" },
    { name: "Family Medicine", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Whole-family primary care" },
    { name: "Pediatrics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Child and adolescent health" },
    { name: "Geriatrics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Senior citizen care" },
    // Internal medicine
    { name: "Cardiology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Heart and cardiovascular system" },
    { name: "Pulmonology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Lungs and respiratory system" },
    { name: "Gastroenterology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Stomach, liver and intestine" },
    { name: "Nephrology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Kidney care and dialysis" },
    { name: "Endocrinology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Hormonal disorders, diabetes, thyroid" },
    { name: "Diabetology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Diabetes management specialist" },
    { name: "Rheumatology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Joints and autoimmune disorders" },
    { name: "Hematology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Blood disorders" },
    { name: "Oncology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Cancer diagnosis and treatment" },
    { name: "Infectious Disease", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Infections and tropical medicine" },
    // Surgical
    { name: "General Surgery", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Surgical procedures across specialties" },
    { name: "Orthopedics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Bones, joints and muscles" },
    { name: "Neurosurgery", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Brain and spine surgery" },
    { name: "Plastic Surgery", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Cosmetic and reconstructive surgery" },
    { name: "Cardiothoracic Surgery", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Heart and chest surgery" },
    // Women's & reproductive
    { name: "Gynecology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Women's health" },
    { name: "Obstetrics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Pregnancy and childbirth" },
    { name: "Fertility", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "IVF and reproductive care" },
    { name: "Andrology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Male reproductive health" },
    { name: "Sexology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Sexual health" },
    // Mental health
    { name: "Psychiatry", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Mental health, medication management" },
    { name: "Psychology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Talk therapy and counseling" },
    // Skin / sensory
    { name: "Dermatology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Skin, hair and nails" },
    { name: "Cosmetology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Aesthetic medicine" },
    { name: "Ophthalmology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Eye care and vision" },
    { name: "ENT", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Ear, nose and throat" },
    { name: "Audiology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Hearing and balance" },
    // Neuro / Uro
    { name: "Neurology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Brain and nervous system" },
    { name: "Urology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Urinary tract and male reproductive system" },
    // Dental
    { name: "Dentistry", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Teeth and gum care" },
    { name: "Orthodontics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Braces and dental alignment" },
    { name: "Oral Surgery", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Tooth extraction and implants" },
    // Therapy & rehab
    { name: "Physiotherapy", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Physical rehabilitation" },
    { name: "Occupational Therapy", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Daily-living rehab" },
    { name: "Speech Therapy", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Speech and swallowing therapy" },
    // Diet & lifestyle
    { name: "Nutrition & Dietetics", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Diet and nutrition counseling" },
    // Specialised
    { name: "Pain Management", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Chronic pain specialist" },
    { name: "Sleep Medicine", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Sleep disorders" },
    { name: "Allergy & Immunology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Allergies and immune disorders" },
    { name: "Sports Medicine", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Athletic injuries and performance" },
    { name: "Palliative Care", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Comfort and end-of-life care" },
    // Diagnostic
    { name: "Radiology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Medical imaging and diagnostics" },
    { name: "Pathology", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Lab testing and diagnostics" },
    // AYUSH (India)
    { name: "Ayurveda", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Traditional Indian medicine" },
    { name: "Homeopathy", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Homeopathic treatment" },
    { name: "Yoga Therapy", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Therapeutic yoga" },
    { name: "Integrative Medicine", icon: GENERIC_ICON, doctorCount: 0, status: "Active", description: "Holistic and complementary medicine" },
  ];
  const norm = (s: string) => s.trim().toLowerCase();
  const existing = new Set(departments.map((d) => norm(d.name)));
  let dirty = false;
  for (const e of EXTRA) {
    if (existing.has(norm(e.name))) continue;
    departments.push({
      id: `dept-seed-${norm(e.name).replace(/[^a-z0-9]+/g, "-")}`,
      ...e,
    });
    existing.add(norm(e.name));
    dirty = true;
  }
  if (dirty) flush();
})();

export async function reloadDepartments(): Promise<void> {
  await reload();
}

export function listDepartments(): Department[] {
  return [...departments];
}

export function getDepartmentById(id: string): Department | null {
  return departments.find((d) => d.id === id) || null;
}

export interface DepartmentInput {
  name: string;
  description?: string;
  icon?: string;
  doctorCount?: number;
  status?: DepartmentStatus;
}

const DEFAULT_ICON =
  "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5";

export function createDepartment(input: DepartmentInput): Department {
  const d: Department = {
    id: `dept-${now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    icon: input.icon || DEFAULT_ICON,
    doctorCount: Math.max(0, Math.floor(input.doctorCount ?? 0)),
    status: input.status || "Active",
    description: (input.description || "").trim(),
  };
  departments.push(d);
  flush();
  return d;
}

export function updateDepartment(
  id: string,
  patch: Partial<DepartmentInput>
): Department | null {
  const d = departments.find((x) => x.id === id);
  if (!d) return null;
  if (patch.name !== undefined) d.name = patch.name.trim();
  if (patch.description !== undefined) d.description = patch.description.trim();
  if (patch.icon !== undefined) d.icon = patch.icon;
  if (patch.doctorCount !== undefined)
    d.doctorCount = Math.max(0, Math.floor(Number(patch.doctorCount)));
  if (patch.status !== undefined) d.status = patch.status;
  flush();
  return d;
}

export function toggleDepartmentStatus(id: string): Department | null {
  const d = departments.find((x) => x.id === id);
  if (!d) return null;
  d.status = d.status === "Active" ? "Inactive" : "Active";
  flush();
  return d;
}

export function deleteDepartment(id: string): boolean {
  const idx = departments.findIndex((d) => d.id === id);
  if (idx < 0) return false;
  departments.splice(idx, 1);
  flush();
  return true;
}
