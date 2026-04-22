// Normalizes a store product (from /api/products) into the full `Product`
// shape used by the shop UI and cart context. Vendor-added products don't
// come with the rich fields (rating, reviews, benefits, etc.) that the
// original seeded demo catalog has, so we synthesize sensible defaults.

import type { Product } from "./data";

// Shape returned by /api/products (from lib/products-store.ts)
export interface ApiProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  originalPrice: number;
  stock: number;
  status: "Active" | "Draft" | "Out of Stock";
  prescriptionRequired: boolean;
  color: string;
  imageUrl?: string;
  vendorId?: string;
  vendorName?: string;
}

export type NormalizedShopProduct = Product & {
  stock?: number;
  vendorId?: string;
  vendorName?: string;
};

export function normalizeApiProduct(p: ApiProduct): NormalizedShopProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.id,
    description: p.description || "",
    fullDescription: p.description || "",
    category: p.category,
    price: p.price,
    originalPrice:
      p.originalPrice && p.originalPrice > p.price ? p.originalPrice : undefined,
    rating: 4.5,
    reviewCount: 0,
    inStock: p.status === "Active" && p.stock > 0,
    prescriptionRequired: p.prescriptionRequired,
    benefits: [],
    color: p.color || "from-primary-400 to-primary-600",
    // tack on extras for vendor-aware UI
    stock: p.stock,
    vendorId: p.vendorId,
    vendorName: p.vendorName,
  };
}
