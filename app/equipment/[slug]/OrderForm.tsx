"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface PriceTier { minQty: number; unitPriceCents: number; }

interface Props {
  slug: string;
  retailPriceCents: number;
  currency: string;
  wholesaleTiers: PriceTier[];
}

function fmt(cents: number, currency: string): string {
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString()}`;
}

function priceForQty(qty: number, retail: number, tiers: PriceTier[], wholesaleEligible: boolean): { unit: number; isWholesale: boolean } {
  if (!wholesaleEligible || qty < 1) return { unit: retail, isWholesale: false };
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  let best: PriceTier | null = null;
  for (const t of sorted) if (qty >= t.minQty) best = t;
  return best ? { unit: best.unitPriceCents, isWholesale: true } : { unit: retail, isWholesale: false };
}

export default function OrderForm({ slug, retailPriceCents, currency, wholesaleTiers }: Props) {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string })?.role;
  // V10 §3.3: hospital / clinic / lab / diagnostic users unlock
  // wholesale. Mapping web-side roles to buyer kinds: admin/staff
  // act as hospital, vendor doesn't buy. Patients always retail.
  const buyerKind: "hospital" | "clinic" | "lab" | "diagnostic" | "patient" =
    role === "admin" || role === "staff" ? "hospital"
    : role === "support" ? "hospital"
    : role === "doctor" ? "clinic"
    : "patient";
  const wholesaleEligible = buyerKind !== "patient";

  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const { unit, isWholesale } = useMemo(
    () => priceForQty(qty, retailPriceCents, wholesaleTiers, wholesaleEligible),
    [qty, retailPriceCents, wholesaleTiers, wholesaleEligible],
  );
  const subtotal = unit * qty;

  const place = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/equipment/${slug}/order`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.error === "insufficient_balance") setMsg({ ok: false, text: "Wallet under-funded. Top up at /dashboard/finance." });
        else if (j.error === "unauthenticated") setMsg({ ok: false, text: "Please sign in." });
        else setMsg({ ok: false, text: j.error || "Order failed." });
        return;
      }
      setMsg({ ok: true, text: `Order placed · ${fmt(j.order.totalCents, j.order.currency)} charged. Manufacturer will dispatch.` });
    } finally {
      setBusy(false);
    }
  };

  if (status !== "authenticated") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-600">Sign in to order. Verified hospitals + clinics see wholesale pricing.</p>
        <Link href={`/auth/login?callbackUrl=${encodeURIComponent(`/equipment/${slug}`)}`} className="mt-3 block w-full rounded-xl bg-[#0F6E56] py-3 text-center text-sm font-semibold text-white hover:bg-[#0A5942]">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Order</p>
      {wholesaleEligible
        ? <p className="mt-1 text-[11px] font-semibold text-[#0F6E56]">✓ Wholesale eligible ({buyerKind})</p>
        : <p className="mt-1 text-[11px] text-gray-500">Retail pricing (sign in as a verified entity for wholesale)</p>
      }
      <label className="mt-3 block text-xs font-semibold text-gray-700">
        Quantity
        <input
          type="number"
          value={qty}
          min={1}
          onChange={(e) => setQty(Math.max(1, Math.round(Number(e.target.value) || 1)))}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </label>
      <div className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Unit price</span>
          <span className="font-semibold">{fmt(unit, currency)} {isWholesale && <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">WHOLESALE</span>}</span>
        </div>
        <div className="flex justify-between border-t border-gray-100 pt-1">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-bold text-gray-900">{fmt(subtotal, currency)}</span>
        </div>
        <p className="text-[11px] text-gray-400">Shipping calculated at checkout.</p>
      </div>
      <button
        onClick={place}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-[#0F6E56] py-3 text-sm font-bold text-white hover:bg-[#0A5942] disabled:opacity-60"
      >
        {busy ? "Placing order…" : `Buy ${qty} unit${qty === 1 ? "" : "s"}`}
      </button>
      {msg && (
        <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{msg.text}</p>
      )}
    </div>
  );
}
