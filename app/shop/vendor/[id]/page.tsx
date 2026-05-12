"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { normalizeApiProduct, type ApiProduct } from "@/lib/product-normalize";
import type { Product } from "@/lib/data";

type ShopProduct = Product & { stock?: number; vendorName?: string };

interface PublicVendor {
  id: string;
  name: string;
  city: string;
  country: string;
  approvedAt?: string;
}

export default function VendorStorefrontPage() {
  const params = useParams();
  const id = String(params?.id || "");
  const { addToCart } = useCart();

  const [vendor, setVendor] = useState<PublicVendor | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/vendors/${id}/storefront`);
        if (res.status === 404) { setNotFound(true); return; }
        if (!res.ok) return;
        const data = await res.json();
        setVendor(data.vendor);
        const list: ApiProduct[] = Array.isArray(data.products) ? data.products : [];
        setProducts(list.map((p) => normalizeApiProduct(p)));
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-gray-400 dark:text-slate-500">Loading vendor…</div>;

  if (notFound || !vendor) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Vendor not found</h1>
        <p className="mt-2 text-gray-500 dark:text-slate-400">This vendor may not be approved yet, or the link is incorrect.</p>
        <Link href="/shop" className="btn-primary mt-6 inline-block">Browse all products</Link>
      </div>
    );
  }

  const handleAdd = (p: ShopProduct) => {
    if (!p.inStock) return;
    addToCart(p);
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 400);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <section className="bg-gradient-to-r from-primary-700 to-primary-900 px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-4 text-sm text-primary-100">
            <Link href="/shop" className="hover:text-white">Shop</Link>
            <span className="mx-2">/</span>
            <span>{vendor.name}</span>
          </nav>
          <h1 className="text-3xl font-bold md:text-4xl">{vendor.name}</h1>
          <p className="mt-2 text-primary-100">
            {vendor.city}{vendor.city && vendor.country ? ", " : ""}{vendor.country}
            {vendor.approvedAt && (
              <span className="ml-3 text-sm opacity-80">
                · Selling on OduDoc since {new Date(vendor.approvedAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}
              </span>
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-slate-400">{products.length} product{products.length !== 1 ? "s" : ""} from this vendor</p>
          <Link href="/shop" className="text-sm font-medium text-primary-600 hover:underline">Browse all vendors →</Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-16 text-center">
            <p className="text-sm text-gray-500 dark:text-slate-400">This vendor hasn&apos;t listed any products yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="group overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <Link href={`/shop/${p.id}`}>
                  <div className={`relative h-40 bg-gradient-to-br ${p.color}`}>
                    <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                      {p.category}
                    </span>
                  </div>
                </Link>
                <div className="p-4">
                  <Link href={`/shop/${p.id}`}>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100 group-hover:text-primary-600">{p.name}</h3>
                  </Link>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">{p.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <span className="text-lg font-bold text-gray-900 dark:text-slate-100">${p.price.toFixed(2)}</span>
                      {p.originalPrice && (
                        <span className="ml-2 text-xs text-gray-400 dark:text-slate-500 line-through">${p.originalPrice.toFixed(2)}</span>
                      )}
                    </div>
                    <button disabled={!p.inStock} onClick={() => handleAdd(p)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        addedId === p.id ? "scale-95 bg-green-500 text-white"
                          : "bg-primary-600 text-white hover:bg-primary-700"
                      } disabled:opacity-50`}>
                      {addedId === p.id ? "Added!" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
