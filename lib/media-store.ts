// Media library — Postgres-backed via bindPersistentArray.
//
// File bytes are kept as base64 data URLs.

import { bindPersistentArray } from "./persistent-array";

export type MediaType = "image" | "document";

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  mime: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

const now = () => new Date().toISOString();

const items: MediaItem[] = [];
const { hydrate, flush } = bindPersistentArray<MediaItem>(
  "media",
  items,
  () => [
    { id: "m1", name: "hero-banner.jpg",             type: "image",    mime: "image/jpeg", size: 2_400_000, dataUrl: "", uploadedAt: "2026-04-12T10:00:00Z" },
    { id: "m2", name: "doctor-profile-1.png",        type: "image",    mime: "image/png",  size: 856_000,   dataUrl: "", uploadedAt: "2026-04-11T10:00:00Z" },
    { id: "m3", name: "product-vitamins.jpg",        type: "image",    mime: "image/jpeg", size: 1_200_000, dataUrl: "", uploadedAt: "2026-04-10T10:00:00Z" },
    { id: "m4", name: "prescription-form.pdf",       type: "document", mime: "application/pdf", size: 340_000, dataUrl: "", uploadedAt: "2026-04-09T10:00:00Z" },
    { id: "m5", name: "about-team.jpg",              type: "image",    mime: "image/jpeg", size: 3_100_000, dataUrl: "", uploadedAt: "2026-04-08T10:00:00Z" },
    { id: "m6", name: "logo-dark.svg",               type: "image",    mime: "image/svg+xml", size: 12_000, dataUrl: "", uploadedAt: "2026-04-07T10:00:00Z" },
    { id: "m7", name: "terms-conditions.pdf",        type: "document", mime: "application/pdf", size: 520_000, dataUrl: "", uploadedAt: "2026-04-06T10:00:00Z" },
    { id: "m8", name: "department-cardiology.jpg",   type: "image",    mime: "image/jpeg", size: 1_800_000, dataUrl: "", uploadedAt: "2026-04-05T10:00:00Z" },
    { id: "m9", name: "testimonial-bg.jpg",          type: "image",    mime: "image/jpeg", size: 4_200_000, dataUrl: "", uploadedAt: "2026-04-04T10:00:00Z" },
  ]
);
await hydrate();

export function listMedia(opts: { type?: MediaType | "all" } = {}): MediaItem[] {
  let list = [...items];
  if (opts.type && opts.type !== "all") list = list.filter((m) => m.type === opts.type);
  return list.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
}

export function getMediaById(id: string): MediaItem | null {
  return items.find((m) => m.id === id) || null;
}

export function addMedia(input: { name: string; mime: string; size: number; dataUrl: string }): MediaItem {
  const type: MediaType = input.mime.startsWith("image/") ? "image" : "document";
  const item: MediaItem = {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    type,
    mime: input.mime,
    size: input.size,
    dataUrl: input.dataUrl,
    uploadedAt: now(),
  };
  items.unshift(item);
  flush();
  return item;
}

export function deleteMedia(id: string): boolean {
  const idx = items.findIndex((m) => m.id === id);
  if (idx < 0) return false;
  items.splice(idx, 1);
  flush();
  return true;
}

export function deleteMany(ids: string[]): number {
  let removed = 0;
  for (const id of ids) if (deleteMedia(id)) removed++;
  return removed;
}
