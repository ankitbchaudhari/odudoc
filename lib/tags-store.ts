// Product tags store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  productCount: number;
  createdAt: string;
}

export const TAG_COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-gray-100 text-gray-700",
];

const now = () => new Date().toISOString();

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const tags: Tag[] = [];
const { hydrate, flush } = bindPersistentArray<Tag>(
  "tags",
  tags,
  () => {
    const n = now();
    return [
      { id: "t1", name: "New Arrival",   slug: "new",        color: TAG_COLORS[7], productCount: 23,  createdAt: n },
      { id: "t2", name: "Best Seller",   slug: "bestseller", color: TAG_COLORS[4], productCount: 34,  createdAt: n },
      { id: "t3", name: "On Sale",       slug: "sale",       color: TAG_COLORS[0], productCount: 18,  createdAt: n },
      { id: "t4", name: "Prescription",  slug: "rx",         color: TAG_COLORS[9], productCount: 89,  createdAt: n },
      { id: "t5", name: "OTC",           slug: "otc",        color: TAG_COLORS[6], productCount: 65,  createdAt: n },
      { id: "t6", name: "Organic",       slug: "organic",    color: TAG_COLORS[5], productCount: 27,  createdAt: n },
      { id: "t7", name: "Fast Shipping", slug: "fast-ship",  color: TAG_COLORS[2], productCount: 112, createdAt: n },
      { id: "t8", name: "Imported",      slug: "imported",   color: TAG_COLORS[8], productCount: 41,  createdAt: n },
    ];
  }
);
await hydrate();

export function listTags(): Tag[] {
  return [...tags].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getTagById(id: string): Tag | null {
  return tags.find((t) => t.id === id) || null;
}

export interface TagInput {
  name: string;
  slug?: string;
  color?: string;
  productCount?: number;
}

export function createTag(input: TagInput): Tag {
  const name = input.name.trim();
  if (!name) throw new Error("Tag name is required");
  const slug = input.slug ? slugify(input.slug) : slugify(name);
  if (tags.some((t) => t.slug === slug)) {
    throw new Error(`A tag with slug "${slug}" already exists.`);
  }
  const tag: Tag = {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    slug,
    color: input.color || TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)],
    productCount: input.productCount ?? 0,
    createdAt: now(),
  };
  tags.unshift(tag);
  flush();
  return tag;
}

export function updateTag(id: string, patch: Partial<TagInput>): Tag | null {
  const t = tags.find((x) => x.id === id);
  if (!t) return null;
  if (patch.name !== undefined) t.name = patch.name.trim();
  if (patch.slug !== undefined) {
    const s = slugify(patch.slug);
    if (s !== t.slug && tags.some((x) => x.slug === s)) {
      throw new Error(`A tag with slug "${s}" already exists.`);
    }
    t.slug = s;
  }
  if (patch.color !== undefined) t.color = patch.color;
  if (patch.productCount !== undefined) t.productCount = patch.productCount;
  flush();
  return t;
}

export function deleteTag(id: string): boolean {
  const idx = tags.findIndex((t) => t.id === id);
  if (idx < 0) return false;
  tags.splice(idx, 1);
  flush();
  return true;
}
