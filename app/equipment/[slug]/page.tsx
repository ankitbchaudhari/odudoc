// V10 §2 — Equipment product detail.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/equipment-marketplace-store";
import OrderForm from "./OrderForm";

export const revalidate = 60;

interface Params { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found — OduDoc" };
  return { title: `${p.title} — OduDoc Marketplace`, description: p.tagline };
}

function fmt(cents: number, currency: string): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString()}`;
}

export default async function ProductDetailPage({ params }: Params) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-[#0F6E56] via-[#0A5942] to-[#042C53] py-12 text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Link href="/equipment" className="text-xs font-semibold text-white/70 hover:underline">← All equipment</Link>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">{p.category}</span>
            <span className="text-xs text-white/70">Model {p.modelNumber}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{p.title}</h1>
          <p className="mt-2 text-lg text-white/85">{p.tagline}</p>
          <p className="mt-1 text-sm text-white/60">By {p.manufacturerName}</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">About this product</h2>
              <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-gray-700">{p.description}</p>
            </div>

            {p.certifications.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Certifications</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.certifications.map((c) => (
                    <span key={c} className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">{c}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h3 className="text-sm font-bold text-gray-900">Wholesale pricing</h3>
              <p className="mt-1 text-xs text-gray-500">Available to verified hospitals, clinics, labs, and diagnostic centres (V10 §3.3).</p>
              <ul className="mt-3 divide-y divide-gray-200">
                <li className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">1–{p.wholesaleTiers[0]?.minQty ? p.wholesaleTiers[0].minQty - 1 : "∞"} units</span>
                  <span className="font-bold text-gray-900">{fmt(p.retailPriceCents, p.currency)} / unit (retail)</span>
                </li>
                {p.wholesaleTiers.map((t, i) => {
                  const next = p.wholesaleTiers[i + 1];
                  return (
                    <li key={i} className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {t.minQty}{next ? `–${next.minQty - 1}` : "+"} units
                      </span>
                      <span className="font-bold text-[#0F6E56]">{fmt(t.unitPriceCents, p.currency)} / unit</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">Retail</p>
              <p className="text-3xl font-extrabold text-[#0F6E56]">{fmt(p.retailPriceCents, p.currency)}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-gray-700">
                <li>🚚 Lead time: {p.leadDays} days</li>
                {p.warrantyMonths > 0 && <li>🛡️ {p.warrantyMonths} months warranty (auto-registered)</li>}
                {p.freeShippingMinCents !== undefined && <li>📦 Free shipping over {fmt(p.freeShippingMinCents, p.currency)}</li>}
              </ul>
            </div>
            <OrderForm slug={p.slug} retailPriceCents={p.retailPriceCents} currency={p.currency} wholesaleTiers={p.wholesaleTiers} />
          </aside>
        </div>
      </section>
    </div>
  );
}
