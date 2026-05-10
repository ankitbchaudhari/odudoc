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

// Optional auto-seed of the wider standard specialty list. Off by
// default; set SEED_DEMO_DEPARTMENTS=1 to enable for sales demos.
(function seedExtraDepartments() {
  if (process.env.SEED_DEMO_DEPARTMENTS !== "1") return;
  const EXTRA: Omit<Department, "id">[] = [
    { name: "General Medicine", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", doctorCount: 0, status: "Active", description: "Primary care and general physicians" },
    { name: "Gynecology & Obstetrics", icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z", doctorCount: 0, status: "Active", description: "Women's health, pregnancy and childbirth" },
    { name: "Psychiatry", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", doctorCount: 0, status: "Active", description: "Mental health and behavioural care" },
    { name: "ENT", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", doctorCount: 0, status: "Active", description: "Ear, nose and throat" },
    { name: "Urology", icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15", doctorCount: 0, status: "Active", description: "Urinary tract and male reproductive system" },
    { name: "Gastroenterology", icon: "M3 7h2l3 13h12l3-9H7", doctorCount: 0, status: "Active", description: "Digestive system and GI tract" },
    { name: "Pulmonology", icon: "M13 10V3L4 14h7v7l9-11h-7z", doctorCount: 0, status: "Active", description: "Lungs and respiratory system" },
    { name: "Endocrinology", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1", doctorCount: 0, status: "Active", description: "Hormonal disorders, diabetes and thyroid" },
    { name: "Oncology", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", doctorCount: 0, status: "Active", description: "Cancer diagnosis and treatment" },
    { name: "Nephrology", icon: "M20 12a8 8 0 10-16 0 8 8 0 0016 0z", doctorCount: 0, status: "Active", description: "Kidney care and dialysis" },
    { name: "Rheumatology", icon: "M13 10V3L4 14h7v7l9-11h-7z", doctorCount: 0, status: "Active", description: "Joints, autoimmune and musculoskeletal disorders" },
    { name: "Radiology", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", doctorCount: 0, status: "Active", description: "Medical imaging and diagnostics" },
    { name: "General Surgery", icon: "M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z", doctorCount: 0, status: "Active", description: "Surgical procedures across specialties" },
    { name: "Pathology", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547", doctorCount: 0, status: "Active", description: "Lab testing and diagnostics" },
    { name: "Physiotherapy", icon: "M13 10V3L4 14h7v7l9-11h-7z", doctorCount: 0, status: "Active", description: "Rehabilitation and physical therapy" },
    { name: "Integrative Medicine", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", doctorCount: 0, status: "Active", description: "Holistic and complementary medicine" },
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
