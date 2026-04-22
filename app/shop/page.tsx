"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { productCategories, Product } from "@/lib/data";
import { useCart } from "@/lib/cart-context";
import { normalizeApiProduct, type ApiProduct } from "@/lib/product-normalize";

type ShopProduct = Product & { stock?: number; vendorId?: string; vendorName?: string };

const categoryIcons: Record<string, string> = {
  Medicines: "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18",
  Supplements: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  "Personal Care": "M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z",
  "Medical Devices": "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
  "Baby Care": "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  Wellness: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
};

function ProductIcon({ category, className = "h-12 w-12" }: { category: string; className?: string }) {
  const path = categoryIcons[category] || categoryIcons["Medicines"];
  return (
    <svg className={`${className} text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
    </svg>
  );
}

const ITEMS_PER_PAGE = 9;

export default function ShopPage() {
  const { addToCart } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [priceRange, setPriceRange] = useState<number>(100);
  const [minRating, setMinRating] = useState<number>(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState("popular");
  const [page, setPage] = useState(1);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        const list: ApiProduct[] = Array.isArray(data.products) ? data.products : [];
        setProducts(list.map((p) => normalizeApiProduct(p)));
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchesPrice = p.price <= priceRange;
      const matchesRating = p.rating >= minRating;
      const matchesStock = !inStockOnly || p.inStock;
      return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesStock;
    });

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        result.sort((a, b) => b.id.localeCompare(a.id));
        break;
      default:
        result.sort((a, b) => b.reviewCount - a.reviewCount);
    }
    return result;
  }, [search, selectedCategory, priceRange, minRating, inStockOnly, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const handleAddToCart = (product: ShopProduct) => {
    if (!product.inStock) return;
    addToCart(product);
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 400);
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Categories</h3>
        <div className="space-y-2">
          {["All", ...productCategories].map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setPage(1); }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-primary-50 font-medium text-primary-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Price Range</h3>
        <div className="px-1">
          <input
            type="range"
            min={1}
            max={100}
            value={priceRange}
            onChange={(e) => { setPriceRange(Number(e.target.value)); setPage(1); }}
            className="w-full accent-primary-600"
          />
          <div className="mt-1 flex justify-between text-xs text-gray-500">
            <span>$1</span>
            <span className="font-medium text-primary-600">${priceRange}</span>
            <span>$100</span>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Rating</h3>
        <div className="space-y-2">
          {[
            { label: "4+ Stars", value: 4 },
            { label: "3+ Stars", value: 3 },
            { label: "2+ Stars", value: 2 },
            { label: "All Ratings", value: 0 },
          ].map((r) => (
            <button
              key={r.value}
              onClick={() => { setMinRating(r.value); setPage(1); }}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                minRating === r.value
                  ? "bg-primary-50 font-medium text-primary-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {r.value > 0 && (
                <span className="flex">
                  {[...Array(r.value)].map((_, i) => (
                    <svg key={i} className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </span>
              )}
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Availability</h3>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          In Stock Only
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-600 to-primary-800 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">
            OduDoc Pharmacy & Health Store
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-primary-100">
            Quality medicines, supplements, and healthcare products delivered to your doorstep.
          </p>
          {/* Search */}
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search medicines, supplements, health products..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-xl border-0 py-3.5 pl-12 pr-4 text-gray-900 shadow-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Sort bar + mobile filter toggle */}
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} found
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="popular">Popular</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="mb-4 text-base font-bold text-gray-900">Filters</h2>
              <FilterSidebar />
            </div>
          </aside>

          {/* Mobile Filter Overlay */}
          {mobileFilterOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilterOpen(false)} />
              <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Filters</h2>
                  <button onClick={() => setMobileFilterOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <FilterSidebar />
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="btn-primary mt-6 w-full"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          {/* Product Grid */}
          <div className="flex-1">
            {loading ? (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400">
                Loading products…
              </div>
            ) : paginatedProducts.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
                <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {paginatedProducts.map((product) => (
                    <div
                      key={product.id}
                      className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      {/* Out of stock overlay */}
                      {!product.inStock && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
                          <span className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      {/* Product image */}
                      <Link href={`/shop/${product.id}`}>
                        <div className={`relative h-48 bg-gradient-to-br ${product.color} flex items-center justify-center overflow-hidden`}>
                          {/* Decorative circles */}
                          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
                          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10" />
                          {/* Icon */}
                          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                            <ProductIcon category={product.category} />
                          </div>
                          {/* Category badge */}
                          <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                            {product.category}
                          </span>
                          {/* Discount badge */}
                          {product.originalPrice && (
                            <span className="absolute right-3 top-3 rounded-full bg-green-500 px-2.5 py-1 text-xs font-bold text-white">
                              {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                            </span>
                          )}
                          {/* Prescription badge */}
                          {product.prescriptionRequired && !product.originalPrice && (
                            <span className="absolute right-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-medium text-white">
                              Rx
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Info */}
                      <div className="p-4">
                        <Link href={`/shop/${product.id}`}>
                          <h3 className="font-semibold text-gray-900 transition-colors group-hover:text-primary-600">
                            {product.name}
                          </h3>
                        </Link>
                        {product.vendorName && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            by {product.vendorId ? (
                              <Link href={`/shop/vendor/${product.vendorId}`} className="text-gray-500 hover:text-primary-600 hover:underline">
                                {product.vendorName}
                              </Link>
                            ) : product.vendorName}
                          </p>
                        )}
                        <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                          {product.description}
                        </p>

                        {/* Rating */}
                        <div className="mt-2 flex items-center gap-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-3.5 w-3.5 ${i < Math.floor(product.rating) ? "text-yellow-400" : "text-gray-200"}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">
                            {product.rating} ({product.reviewCount})
                          </span>
                        </div>

                        {/* Price + Add to Cart */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-gray-900">
                              ${product.price.toFixed(2)}
                            </span>
                            {product.originalPrice && (
                              <span className="text-sm text-gray-400 line-through">
                                ${product.originalPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={!product.inStock}
                            className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-200 ${
                              addedId === product.id
                                ? "scale-95 bg-green-500 text-white"
                                : "bg-primary-600 text-white hover:bg-primary-700 active:scale-95"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                          >
                            {addedId === product.id ? "Added!" : "Add to Cart"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i + 1)}
                        className={`h-10 w-10 rounded-lg text-sm font-medium transition-colors ${
                          page === i + 1
                            ? "bg-primary-600 text-white"
                            : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
