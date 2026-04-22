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
  () => [
    { id: "d1", name: "Cardiology", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z", doctorCount: 8, status: "Active", description: "Heart and cardiovascular system" },
    { id: "d2", name: "Neurology", icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z", doctorCount: 5, status: "Active", description: "Brain and nervous system" },
    { id: "d3", name: "Orthopedics", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", doctorCount: 6, status: "Active", description: "Bones, joints, and muscles" },
    { id: "d4", name: "Pediatrics", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z", doctorCount: 7, status: "Active", description: "Child healthcare" },
    { id: "d5", name: "Dermatology", icon: "M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01", doctorCount: 4, status: "Active", description: "Skin, hair, and nails" },
    { id: "d6", name: "Ophthalmology", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z", doctorCount: 3, status: "Active", description: "Eye care and vision" },
    { id: "d7", name: "Dentistry", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z", doctorCount: 5, status: "Inactive", description: "Dental and oral health" },
  ]
);
await hydrate();

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
