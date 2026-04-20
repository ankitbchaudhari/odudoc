// Gallery store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string; // tailwind gradient classes, e.g. "from-cyan-500 to-blue-600"
  imageUrl?: string;
  createdAt: string;
}

const items: GalleryItem[] = [];
const { hydrate, flush } = bindPersistentArray<GalleryItem>(
  "gallery",
  items,
  () => []
);
await hydrate();

export const GALLERY_CATEGORIES = [
  "Hospital",
  "Doctors",
  "Equipment",
  "Events",
  "Patient Stories",
];

export function listGallery(opts: { category?: string } = {}): GalleryItem[] {
  let list = [...items];
  if (opts.category && opts.category !== "All") {
    list = list.filter((i) => i.category === opts.category);
  }
  return list.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getGalleryItemById(id: string): GalleryItem | null {
  return items.find((i) => i.id === id) || null;
}

export interface GalleryInput {
  title: string;
  description?: string;
  category: string;
  color?: string;
  imageUrl?: string;
}

export function createGalleryItem(input: GalleryInput): GalleryItem {
  const g: GalleryItem = {
    id: `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    description: (input.description || "").trim(),
    category: input.category,
    color: (input.color || "from-cyan-500 to-blue-600").trim(),
    imageUrl: input.imageUrl,
    createdAt: new Date().toISOString(),
  };
  items.unshift(g);
  flush();
  return g;
}

export function updateGalleryItem(id: string, patch: Partial<GalleryInput>): GalleryItem | null {
  const g = items.find((x) => x.id === id);
  if (!g) return null;
  if (patch.title !== undefined) g.title = patch.title.trim();
  if (patch.description !== undefined) g.description = patch.description.trim();
  if (patch.category !== undefined) g.category = patch.category;
  if (patch.color !== undefined) g.color = patch.color.trim();
  if (patch.imageUrl !== undefined) g.imageUrl = patch.imageUrl;
  flush();
  return g;
}

export function deleteGalleryItem(id: string): boolean {
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return false;
  items.splice(idx, 1);
  flush();
  return true;
}
