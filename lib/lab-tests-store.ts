// Lab tests store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export interface LabTest {
  id: string;
  slug: string;
  name: string;
  description: string;
  parameters: number;
  price: number;
  originalPrice: number;
  popular: boolean;
  turnaround: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const tests: LabTest[] = [];
const { hydrate, flush } = bindPersistentArray<LabTest>(
  "lab-tests",
  tests,
  () => []
);
await hydrate();

function now(): string {
  return new Date().toISOString();
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(base: string, ignoreId?: string): string {
  let slug = base;
  let n = 2;
  while (tests.some((t) => t.slug === slug && t.id !== ignoreId)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export function listLabTests(opts: { onlyActive?: boolean } = {}): LabTest[] {
  let list = [...tests];
  if (opts.onlyActive) list = list.filter((t) => t.active);
  return list.sort((a, b) => (a.popular === b.popular ? a.name.localeCompare(b.name) : a.popular ? -1 : 1));
}

export function getLabTestById(id: string): LabTest | null {
  return tests.find((t) => t.id === id) || null;
}

export interface LabTestInput {
  name: string;
  description?: string;
  parameters?: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  turnaround?: string;
  active?: boolean;
}

export function createLabTest(input: LabTestInput): LabTest {
  const slug = uniqueSlug(slugify(input.name));
  const t: LabTest = {
    id: `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    slug,
    name: input.name.trim(),
    description: (input.description || "").trim(),
    parameters: Math.max(0, Math.floor(input.parameters || 0)),
    price: Number(input.price),
    originalPrice: Number(input.originalPrice ?? input.price),
    popular: Boolean(input.popular),
    turnaround: (input.turnaround || "24-48 hours").trim(),
    active: input.active ?? true,
    createdAt: now(),
    updatedAt: now(),
  };
  tests.unshift(t);
  flush();
  return t;
}

export function updateLabTest(id: string, patch: Partial<LabTestInput>): LabTest | null {
  const t = tests.find((x) => x.id === id);
  if (!t) return null;
  if (patch.name !== undefined) {
    t.name = patch.name.trim();
    t.slug = uniqueSlug(slugify(t.name), t.id);
  }
  if (patch.description !== undefined) t.description = patch.description.trim();
  if (patch.parameters !== undefined) t.parameters = Math.max(0, Math.floor(patch.parameters));
  if (patch.price !== undefined) t.price = Number(patch.price);
  if (patch.originalPrice !== undefined) t.originalPrice = Number(patch.originalPrice);
  if (patch.popular !== undefined) t.popular = Boolean(patch.popular);
  if (patch.turnaround !== undefined) t.turnaround = patch.turnaround.trim();
  if (patch.active !== undefined) t.active = Boolean(patch.active);
  t.updatedAt = now();
  flush();
  return t;
}

export function deleteLabTest(id: string): boolean {
  const idx = tests.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  tests.splice(idx, 1);
  flush();
  return true;
}
