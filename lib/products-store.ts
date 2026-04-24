// Products store — Postgres-backed via bindPersistentArray.
//
// Holds demo seed data and CRUD helpers that the admin UI + public shop page
// talk to via /api/products. Vendor-added products and seeded products are
// both persisted together in Postgres.

import { bindPersistentArray } from "./persistent-array";

export type ProductStatus = "Active" | "Draft" | "Out of Stock";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  status: ProductStatus;
  prescriptionRequired: boolean;
  color: string;
  imageUrl?: string;
  vendorId?: string;
  vendorName?: string;
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_CATEGORIES = [
  "Medicines",
  "Supplements",
  "Medical Devices",
  "Baby Care",
  "Personal Care",
  "Wellness",
];

const now = () => new Date().toISOString();

const products: Product[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<Product>(
  "products",
  products,
  () => []
);
await hydrate();

// One-time cleanup: drop the demo catalogue (p1..p8) that shipped with the
// initial seed. Admins add real inventory via /admin/products.
(function removeLegacySeedProducts() {
  const legacyIds = new Set(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]);
  let dirty = false;
  for (let i = products.length - 1; i >= 0; i--) {
    if (legacyIds.has(products[i].id)) {
      products.splice(i, 1);
      dirty = true;
    }
  }
  if (dirty) flush();
})();

const GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-teal-400 to-teal-600",
  "from-green-400 to-green-600",
  "from-yellow-400 to-orange-500",
  "from-pink-300 to-pink-500",
  "from-indigo-400 to-indigo-600",
  "from-purple-400 to-purple-600",
  "from-red-400 to-red-600",
];

function pickGradient(): string {
  return GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
}

function deriveStatus(
  stock: number,
  requested?: ProductStatus
): ProductStatus {
  if (requested === "Draft") return "Draft";
  return stock <= 0 ? "Out of Stock" : "Active";
}

export function listProducts(opts: {
  search?: string;
  category?: string;
  onlyActive?: boolean;
} = {}): Product[] {
  let list = [...products];
  if (opts.onlyActive) list = list.filter((p) => p.status === "Active");
  if (opts.category && opts.category !== "All") {
    list = list.filter((p) => p.category === opts.category);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  return list;
}

export function getProductById(id: string): Product | null {
  return products.find((p) => p.id === id) || null;
}

export interface ProductInput {
  name: string;
  description?: string;
  category: string;
  price: number;
  originalPrice?: number;
  stock: number;
  prescriptionRequired?: boolean;
  status?: ProductStatus;
  imageUrl?: string;
  vendorId?: string;
  vendorName?: string;
}

export function createProduct(input: ProductInput): Product {
  const stock = Math.max(0, Math.floor(input.stock || 0));
  const p: Product = {
    id: `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name.trim(),
    description: (input.description || "").trim(),
    category: input.category,
    price: Number(input.price),
    originalPrice: Number(input.originalPrice ?? input.price),
    stock,
    status: deriveStatus(stock, input.status),
    prescriptionRequired: Boolean(input.prescriptionRequired),
    color: pickGradient(),
    imageUrl: input.imageUrl,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    createdAt: now(),
    updatedAt: now(),
  };
  products.unshift(p);
  flush();
  return p;
}

export function updateProduct(
  id: string,
  patch: Partial<ProductInput>
): Product | null {
  const p = products.find((x) => x.id === id);
  if (!p) return null;
  if (patch.name !== undefined) p.name = patch.name.trim();
  if (patch.description !== undefined) p.description = patch.description.trim();
  if (patch.category !== undefined) p.category = patch.category;
  if (patch.price !== undefined) p.price = Number(patch.price);
  if (patch.originalPrice !== undefined)
    p.originalPrice = Number(patch.originalPrice);
  if (patch.stock !== undefined) p.stock = Math.max(0, Math.floor(patch.stock));
  if (patch.prescriptionRequired !== undefined)
    p.prescriptionRequired = Boolean(patch.prescriptionRequired);
  if (patch.imageUrl !== undefined) p.imageUrl = patch.imageUrl;
  p.status = deriveStatus(p.stock, patch.status ?? p.status);
  p.updatedAt = now();
  flush();
  return p;
}

export function deleteProduct(id: string): boolean {
  const idx = products.findIndex((p) => p.id === id);
  if (idx < 0) return false;
  products.splice(idx, 1);
  // Tombstone so the anti-clobber merge in flush() doesn't pull the row
  // back from Postgres and write it again.
  tombstone(id);
  flush();
  return true;
}

export function listProductsByVendor(vendorId: string): Product[] {
  return products.filter((p) => p.vendorId === vendorId);
}

export type BulkAction = "delete" | "in-stock" | "out-of-stock";

export function bulkUpdate(ids: string[], action: BulkAction): number {
  if (ids.length === 0) return 0;
  const set = new Set(ids);
  if (action === "delete") {
    const before = products.length;
    const kept = products.filter((p) => !set.has(p.id));
    products.length = 0;
    products.push(...kept);
    flush();
    return before - products.length;
  }
  let changed = 0;
  products.forEach((p) => {
    if (!set.has(p.id)) return;
    if (action === "in-stock") {
      p.stock = p.stock || 100;
      p.status = "Active";
    } else if (action === "out-of-stock") {
      p.stock = 0;
      p.status = "Out of Stock";
    }
    p.updatedAt = now();
    changed++;
  });
  if (changed) flush();
  return changed;
}

export function reserveStock(
  items: { productId: string; quantity: number }[]
): { ok: true } | { ok: false; unavailable: string[] } {
  const unavailable: string[] = [];
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId);
    if (!p || p.stock < it.quantity) unavailable.push(it.productId);
  }
  if (unavailable.length) return { ok: false, unavailable };
  for (const it of items) {
    const p = products.find((x) => x.id === it.productId)!;
    p.stock -= it.quantity;
    if (p.stock <= 0) p.status = "Out of Stock";
    p.updatedAt = now();
  }
  flush();
  return { ok: true };
}
