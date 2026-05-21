// V10 §2 — Equipment marketplace public catalogue.

import Link from "next/link";
import { listProducts, type EquipmentCategory } from "@/lib/equipment-marketplace-store";

export const revalidate = 60;
export const metadata = {
  title: "Medical Equipment Marketplace — OduDoc",
  description: "Verified manufacturers. Dual retail + wholesale pricing. Warranty registered automatically. Latest products on OduDoc.",
};

const CAT_LABEL: Record<EquipmentCategory, string> = {
  diagnostic: "Diagnostic", imaging: "Imaging", surgical: "Surgical",
  icu: "ICU", lab: "Laboratory", consumables: "Consumables",
  furniture: "Furniture", rehabilitation: "Rehabilitation", ppe: "PPE",
  dental: "Dental", ophthalmology: "Ophthalmology",
};

function fmt(cents: number, currency: string): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString()}`;
}

export default async function EquipmentPage() {
  const products = await listProducts();
  const cats = new Set<EquipmentCategory>(products.map((p) => p.category));

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-[#0F6E56] via-[#0A5942] to-[#042C53] py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">OduDoc Marketplace</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Equipment for every part of your facility.
          </h1>
          <p className="mt-4 text-lg text-white/85">
            Verified manufacturers. Transparent retail + wholesale pricing.
            Warranty registered the moment you pay.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse</h2>
            <p className="mt-1 text-sm text-gray-600">{products.length} products listed.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...cats].map((c) => (
              <span key={c} className="rounded-full border border-[#0F6E56]/30 px-3 py-1 text-xs font-medium text-[#0F6E56]">
                {CAT_LABEL[c]}
              </span>
            ))}
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No products listed yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => {
              const wholesaleFloor = p.wholesaleTiers.length > 0
                ? Math.min(...p.wholesaleTiers.map((t) => t.unitPriceCents))
                : null;
              return (
                <Link
                  key={p.id}
                  href={`/equipment/${p.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
                >
                  <div className="relative h-40 bg-gradient-to-br from-[#0F6E56] to-[#042C53]">
                    {p.imageUrls[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrls[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-white">
                        <span className="text-4xl font-extrabold opacity-30">{p.title.charAt(0)}</span>
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-bold text-[#0F6E56]">
                      {CAT_LABEL[p.category]}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#0F6E56]">{p.manufacturerName}</p>
                    <h3 className="mt-1 text-base font-bold text-gray-900 group-hover:text-[#0F6E56]">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-gray-600">{p.tagline}</p>
                    <div className="mt-4 border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500">Retail</p>
                      <p className="text-lg font-extrabold text-[#0F6E56]">{fmt(p.retailPriceCents, p.currency)}</p>
                      {wholesaleFloor && (
                        <p className="mt-1 text-[11px] text-gray-500">
                          Wholesale from <span className="font-bold text-gray-800">{fmt(wholesaleFloor, p.currency)}</span> / unit
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="bg-gray-50 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
          <Tile emoji="🛡️" title="Warranty auto-registered" body="The moment you pay, your warranty is on the manufacturer's books. Repair claims flow through OduDoc." />
          <Tile emoji="🏥" title="Wholesale for verified entities" body="Hospitals, clinics, labs, and diagnostic centres unlock tiered wholesale pricing." />
          <Tile emoji="🔐" title="Pay-on-dispatch" body="Manufacturer payout settles only when the goods leave the dock. Buyer is protected." />
        </div>
      </section>
    </div>
  );
}

function Tile({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-2 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-600">{body}</p>
    </div>
  );
}
