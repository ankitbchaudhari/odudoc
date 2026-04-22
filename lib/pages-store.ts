// CMS pages store — Postgres-backed via bindPersistentArray.

import { bindPersistentArray } from "./persistent-array";

export type PageStatus = "Published" | "Draft";

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  author: string;
  content: string;
  seoDescription?: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

const now = () => new Date().toISOString().slice(0, 10);

function normalizeSlug(s: string): string {
  let v = s.trim().toLowerCase();
  if (!v.startsWith("/")) v = "/" + v;
  v = v.replace(/\s+/g, "-").replace(/[^a-z0-9\/\-]/g, "");
  v = v.replace(/\/+/g, "/");
  if (v.length > 1 && v.endsWith("/")) v = v.slice(0, -1);
  return v || "/";
}

const pages: CmsPage[] = [];
const { hydrate, flush } = bindPersistentArray<CmsPage>(
  "pages",
  pages,
  () => [
    { id: "p1", title: "About Us",         slug: "/about",        status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-10", updatedAt: "2026-04-10" },
    { id: "p2", title: "Contact",          slug: "/contact",      status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-08", updatedAt: "2026-04-08" },
    { id: "p3", title: "FAQ",              slug: "/faq",          status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-05", updatedAt: "2026-04-05" },
    { id: "p4", title: "Pricing",          slug: "/pricing",      status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-04", updatedAt: "2026-04-04" },
    { id: "p5", title: "Gallery",          slug: "/gallery",      status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-02", updatedAt: "2026-04-02" },
    { id: "p6", title: "Testimonials",     slug: "/testimonials", status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-03-28", updatedAt: "2026-03-28" },
    { id: "p7", title: "Privacy Policy",   slug: "/privacy",      status: "Draft",     author: "Admin", content: "", isCustom: false, createdAt: "2026-03-20", updatedAt: "2026-03-20" },
    { id: "p8", title: "Terms & Conditions", slug: "/terms",      status: "Draft",     author: "Admin", content: "", isCustom: false, createdAt: "2026-03-20", updatedAt: "2026-03-20" },
    { id: "p9", title: "For Doctors",      slug: "/for-doctors",  status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-14", updatedAt: "2026-04-14" },
    { id: "p10", title: "Careers",         slug: "/careers",      status: "Published", author: "Admin", content: "", isCustom: false, createdAt: "2026-04-15", updatedAt: "2026-04-15" },
  ]
);
await hydrate();

export function listPages(opts: { search?: string; status?: PageStatus | "All" } = {}): CmsPage[] {
  let list = [...pages];
  if (opts.status && opts.status !== "All") {
    list = list.filter((p) => p.status === opts.status);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }
  return list;
}

export function getPageById(id: string): CmsPage | null {
  return pages.find((p) => p.id === id) || null;
}

export function getPageBySlug(slug: string): CmsPage | null {
  const s = normalizeSlug(slug);
  return pages.find((p) => p.slug === s) || null;
}

export interface PageInput {
  title: string;
  slug: string;
  status?: PageStatus;
  author?: string;
  content?: string;
  seoDescription?: string;
  isCustom?: boolean;
}

export function createPage(input: PageInput): CmsPage {
  const slug = normalizeSlug(input.slug || input.title);
  if (pages.some((p) => p.slug === slug)) {
    throw new Error(`A page with slug "${slug}" already exists.`);
  }
  const page: CmsPage = {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    title: input.title.trim(),
    slug,
    status: input.status || "Draft",
    author: (input.author || "Admin").trim(),
    content: input.content || "",
    seoDescription: input.seoDescription,
    isCustom: input.isCustom ?? true,
    createdAt: now(),
    updatedAt: now(),
  };
  pages.unshift(page);
  flush();
  return page;
}

export function updatePage(id: string, patch: Partial<PageInput>): CmsPage | null {
  const p = pages.find((x) => x.id === id);
  if (!p) return null;
  if (patch.title !== undefined) p.title = patch.title.trim();
  if (patch.slug !== undefined) {
    const newSlug = normalizeSlug(patch.slug);
    if (newSlug !== p.slug && pages.some((x) => x.slug === newSlug)) {
      throw new Error(`A page with slug "${newSlug}" already exists.`);
    }
    p.slug = newSlug;
  }
  if (patch.status !== undefined) p.status = patch.status;
  if (patch.author !== undefined) p.author = patch.author.trim();
  if (patch.content !== undefined) p.content = patch.content;
  if (patch.seoDescription !== undefined) p.seoDescription = patch.seoDescription;
  if (patch.isCustom !== undefined) p.isCustom = patch.isCustom;
  p.updatedAt = now();
  flush();
  return p;
}

export function deletePage(id: string): boolean {
  const idx = pages.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  pages.splice(idx, 1);
  flush();
  return true;
}
