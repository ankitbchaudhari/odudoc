// Testimonials store — Postgres-backed via bindPersistentArray.
//
// Admin creates/approves; public form submissions land as "Pending" and
// need admin approval before they show on /testimonials.

import { bindPersistentArray } from "./persistent-array";

export type TestimonialStatus = "Published" | "Pending";

export interface Testimonial {
  id: string;
  name: string;
  email?: string;
  location: string;
  rating: number;
  review: string;
  doctor: string; // free-text, may be "N/A"
  status: TestimonialStatus;
  createdAt: string;
}

const testimonials: Testimonial[] = [];
const { hydrate, flush } = bindPersistentArray<Testimonial>(
  "testimonials",
  testimonials,
  () => []
);
await hydrate();

function now(): string {
  return new Date().toISOString();
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function listTestimonials(opts: { onlyPublished?: boolean } = {}): Testimonial[] {
  let list = [...testimonials];
  if (opts.onlyPublished) list = list.filter((t) => t.status === "Published");
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getTestimonialById(id: string): Testimonial | null {
  return testimonials.find((t) => t.id === id) || null;
}

export interface TestimonialInput {
  name: string;
  email?: string;
  location?: string;
  rating: number;
  review: string;
  doctor?: string;
  status?: TestimonialStatus;
}

export function addTestimonial(input: TestimonialInput): Testimonial {
  const t: Testimonial = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    email: input.email?.trim().toLowerCase(),
    location: (input.location || "").trim(),
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    review: input.review.trim(),
    doctor: (input.doctor || "").trim(),
    status: input.status || "Pending",
    createdAt: now(),
  };
  testimonials.unshift(t);
  flush();
  return t;
}

export function updateTestimonial(id: string, patch: Partial<TestimonialInput>): Testimonial | null {
  const t = testimonials.find((x) => x.id === id);
  if (!t) return null;
  if (patch.name !== undefined) t.name = patch.name.trim();
  if (patch.email !== undefined) t.email = patch.email.trim().toLowerCase() || undefined;
  if (patch.location !== undefined) t.location = patch.location.trim();
  if (patch.rating !== undefined) t.rating = Math.max(1, Math.min(5, Math.round(patch.rating)));
  if (patch.review !== undefined) t.review = patch.review.trim();
  if (patch.doctor !== undefined) t.doctor = patch.doctor.trim();
  if (patch.status !== undefined) t.status = patch.status;
  flush();
  return t;
}

export function setTestimonialStatus(id: string, status: TestimonialStatus): Testimonial | null {
  return updateTestimonial(id, { status });
}

export function deleteTestimonial(id: string): boolean {
  const idx = testimonials.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  testimonials.splice(idx, 1);
  flush();
  return true;
}

// Convenience for public renderer — adds the derived `initials` field the
// old TestimonialCard component expects.
export function toPublicTestimonial(t: Testimonial) {
  return {
    id: t.id,
    name: t.name,
    location: t.location,
    rating: t.rating,
    text: t.review,
    doctor: t.doctor || "OduDoc team",
    initials: initials(t.name) || "??",
  };
}
