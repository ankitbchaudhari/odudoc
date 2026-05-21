// V10 §2 — Medical equipment marketplace.
//
// Manufacturers list equipment + consumables; hospitals / clinics /
// labs / diagnostic centres buy them. Two distinct customer
// journeys driven by V10 §2.3 dual pricing:
//   - Retail — a clinic buys 2 stethoscopes at MRP
//   - Wholesale — a hospital chain orders 200 vitals monitors at a
//     tiered quantity-break price
//
// Wholesale access is gated by V10 §3.3 "Verified Entity" — only
// hospital / clinic / lab / diagnostic buyers unlock the wholesale
// tier table. Patients can only buy at retail.
//
// V10 §2.7 commission — OduDoc takes 5–8% depending on category.
// Manufacturer payout settles to their wallet on DISPATCH (not at
// payment) to protect the buyer until the goods leave the dock.
//
// Distinct from lib/equipment-store.ts which is the biomedical
// inventory + maintenance register (in-hospital asset tracking).

import { bindPersistentArray } from "@/lib/persistent-array";
import { ensureWallet, transfer } from "@/lib/wallet-store";
import { recordEvent } from "@/lib/accountability-store";

export type EquipmentCategory =
  | "diagnostic" | "imaging" | "surgical" | "icu" | "lab"
  | "consumables" | "furniture" | "rehabilitation" | "ppe"
  | "dental" | "ophthalmology";

export interface PriceTier {
  /** Minimum quantity at this tier (inclusive). */
  minQty: number;
  /** Per-unit price in cents at this tier. */
  unitPriceCents: number;
}

export interface EquipmentProduct {
  id: string;
  slug: string;
  manufacturerId: string;
  manufacturerName: string;
  title: string;
  tagline: string;
  description: string;
  category: EquipmentCategory;
  modelNumber: string;
  imageUrls: string[];
  /** V10 §2.3 retail MRP — what a one-off buyer pays. */
  retailPriceCents: number;
  /** V10 §2.4 wholesale tiers, ascending by minQty. */
  wholesaleTiers: PriceTier[];
  currency: string;
  /** Months of manufacturer warranty (V10 §2.6.1 — auto-registered
   *  on purchase). */
  warrantyMonths: number;
  freeShippingMinCents?: number;
  leadDays: number;
  certifications: string[];
  status: "draft" | "published" | "archived";
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentOrder {
  id: string;
  productId: string;
  productTitle: string;
  manufacturerId: string;
  buyerId: string;
  buyerKind: "hospital" | "clinic" | "lab" | "diagnostic" | "patient";
  buyerName: string;
  qty: number;
  unitPriceCents: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  currency: string;
  isWholesale: boolean;
  status: "pending" | "paid" | "dispatched" | "delivered" | "cancelled" | "refunded";
  warrantyExpiresAt?: string;
  trackingRef?: string;
  payoutTxId?: string;
  createdAt: string;
  paidAt?: string;
  dispatchedAt?: string;
  deliveredAt?: string;
}

const products: EquipmentProduct[] = [];
const orders: EquipmentOrder[] = [];

const productsHandle = bindPersistentArray<EquipmentProduct>("equipment_mkt_products", products, () => SEED_PRODUCTS);
const ordersHandle   = bindPersistentArray<EquipmentOrder>("equipment_mkt_orders", orders);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await Promise.all([productsHandle.hydrate(), ordersHandle.hydrate()]);
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// V10 §2.7 — category-specific platform commission %.
const COMMISSION_BY_CATEGORY: Record<EquipmentCategory, number> = {
  diagnostic: 7, imaging: 5, surgical: 7, icu: 6, lab: 6,
  consumables: 8, furniture: 7, rehabilitation: 7, ppe: 8,
  dental: 7, ophthalmology: 7,
};

const WHOLESALE_ELIGIBLE: EquipmentOrder["buyerKind"][] = ["hospital", "clinic", "lab", "diagnostic"];

// ── Pricing math ─────────────────────────────────────────────────

export function priceForQuantity(
  p: EquipmentProduct,
  qty: number,
  isWholesaleEligible: boolean,
): { unitPriceCents: number; isWholesale: boolean } {
  if (!isWholesaleEligible || qty < 1) {
    return { unitPriceCents: p.retailPriceCents, isWholesale: false };
  }
  const tiers = [...p.wholesaleTiers].sort((a, b) => a.minQty - b.minQty);
  let best: PriceTier | null = null;
  for (const t of tiers) if (qty >= t.minQty) best = t;
  if (!best) return { unitPriceCents: p.retailPriceCents, isWholesale: false };
  return { unitPriceCents: best.unitPriceCents, isWholesale: true };
}

// ── Read ─────────────────────────────────────────────────────────

export async function listProducts(filter: { category?: EquipmentCategory; tag?: string; status?: EquipmentProduct["status"] } = {}): Promise<EquipmentProduct[]> {
  await ensureHydrated();
  let rows = products.filter((p) => p.status === (filter.status || "published"));
  if (filter.category) rows = rows.filter((p) => p.category === filter.category);
  if (filter.tag)      rows = rows.filter((p) => p.tags.includes(filter.tag!));
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProductBySlug(slug: string): Promise<EquipmentProduct | null> {
  await ensureHydrated();
  return products.find((p) => p.slug === slug) || null;
}

export async function listOrdersForBuyer(buyerId: string): Promise<EquipmentOrder[]> {
  await ensureHydrated();
  return orders.filter((o) => o.buyerId === buyerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listOrdersForManufacturer(manufacturerId: string): Promise<EquipmentOrder[]> {
  await ensureHydrated();
  return orders.filter((o) => o.manufacturerId === manufacturerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Order placement ──────────────────────────────────────────────

export interface PlaceOrderInput {
  productId: string;
  qty: number;
  buyer: { id: string; kind: EquipmentOrder["buyerKind"]; name: string };
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ ok: boolean; order?: EquipmentOrder; error?: string }> {
  await ensureHydrated();
  const p = products.find((x) => x.id === input.productId);
  if (!p) return { ok: false, error: "product_not_found" };
  if (p.status !== "published") return { ok: false, error: "product_not_listed" };
  if (!Number.isInteger(input.qty) || input.qty <= 0) return { ok: false, error: "invalid_qty" };

  const isEligible = WHOLESALE_ELIGIBLE.includes(input.buyer.kind);
  const { unitPriceCents, isWholesale } = priceForQuantity(p, input.qty, isEligible);
  const subtotalCents = unitPriceCents * input.qty;
  const shippingCents = p.freeShippingMinCents !== undefined && subtotalCents >= p.freeShippingMinCents
    ? 0
    : Math.max(50_000, Math.round(subtotalCents * 0.02)); // 2% with ₹500 floor
  const totalCents = subtotalCents + shippingCents;

  const buyerWalletKind = (input.buyer.kind === "clinic" ? "hospital" : input.buyer.kind) as Parameters<typeof ensureWallet>[0];

  try {
    const buyerWallet = await ensureWallet(buyerWalletKind, input.buyer.id, p.currency);
    const platformWallet = await ensureWallet("platform", "platform-singleton", p.currency);
    if (buyerWallet.balanceCents < totalCents) {
      return { ok: false, error: "insufficient_balance" };
    }
    await transfer({
      kind: "equipment_purchase",
      fromWalletId: buyerWallet.id,
      toWalletId: platformWallet.id,
      amountCents: totalCents,
      currency: p.currency,
      refKind: "equipment_order",
      refId: p.id,
      note: `${input.qty} × ${p.title} (${isWholesale ? "wholesale" : "retail"})`,
      actorEmail: input.buyer.id,
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }

  const now = new Date().toISOString();
  const order: EquipmentOrder = {
    id: uid("ord"),
    productId: p.id,
    productTitle: p.title,
    manufacturerId: p.manufacturerId,
    buyerId: input.buyer.id,
    buyerKind: input.buyer.kind,
    buyerName: input.buyer.name,
    qty: input.qty,
    unitPriceCents,
    subtotalCents,
    shippingCents,
    totalCents,
    currency: p.currency,
    isWholesale,
    status: "paid",
    warrantyExpiresAt: p.warrantyMonths > 0
      ? new Date(Date.now() + p.warrantyMonths * 30 * 86_400_000).toISOString()
      : undefined,
    createdAt: now,
    paidAt: now,
  };
  orders.push(order);
  ordersHandle.flush();

  await recordEvent({
    category: "financial",
    action: "equipment.order.paid",
    actorEmail: input.buyer.id,
    subjectKind: "equipment_order",
    subjectId: order.id,
    summary: `${order.qty} × ${p.title} (${isWholesale ? "wholesale" : "retail"}) · ${(totalCents / 100).toLocaleString()} ${p.currency}`,
    after: { manufacturerId: p.manufacturerId, isWholesale, totalCents, currency: p.currency },
  }).catch(() => {/* never block on audit */});

  return { ok: true, order };
}

/** Manufacturer dispatches — settles the manufacturer's share to
 *  their wallet (total minus platform commission). */
export async function markDispatched(orderId: string, trackingRef: string, by: { email: string; role?: string }): Promise<EquipmentOrder | null> {
  await ensureHydrated();
  const o = orders.find((x) => x.id === orderId);
  if (!o || o.status !== "paid") return o || null;

  const p = products.find((x) => x.id === o.productId);
  if (!p) return null;

  const commission = Math.round((o.totalCents * COMMISSION_BY_CATEGORY[p.category]) / 100);
  const manufacturerCut = o.totalCents - commission;

  try {
    const platformWallet = await ensureWallet("platform", "platform-singleton", o.currency);
    const mfgWallet = await ensureWallet("manufacturer", o.manufacturerId, o.currency);
    const tx = await transfer({
      kind: "settlement",
      fromWalletId: platformWallet.id,
      toWalletId: mfgWallet.id,
      amountCents: manufacturerCut,
      currency: o.currency,
      refKind: "equipment_order",
      refId: o.id,
      note: `Manufacturer payout · ${100 - COMMISSION_BY_CATEGORY[p.category]}% of order ${o.id}`,
      actorEmail: by.email,
      actorRole: by.role,
    });
    o.payoutTxId = tx.id;
  } catch {/* settlement best-effort */}

  o.status = "dispatched";
  o.dispatchedAt = new Date().toISOString();
  o.trackingRef = trackingRef;
  ordersHandle.flush();
  return o;
}

// ── Seeds ─────────────────────────────────────────────────────────

const SEED_PRODUCTS: EquipmentProduct[] = [
  {
    id: "eq_pulse_oximeter",
    slug: "fingertip-pulse-oximeter-spo2",
    manufacturerId: "demo-mfg-cardiocare",
    manufacturerName: "CardioCare Medical",
    title: "Fingertip Pulse Oximeter — SpO₂ & Heart Rate",
    tagline: "Clinical-grade SpO₂ in 8 seconds. Bluetooth sync to OduDoc Pro.",
    description: "OLED display. Auto-on / auto-off. Two-AAA battery (40h). FDA-cleared, CE-marked, BIS-registered. Includes lanyard + carry pouch. Bulk packs ship in 50-unit cases.",
    category: "diagnostic",
    modelNumber: "CC-POX-200",
    imageUrls: [],
    retailPriceCents: 295_000,
    wholesaleTiers: [
      { minQty: 10,  unitPriceCents: 215_000 },
      { minQty: 50,  unitPriceCents: 185_000 },
      { minQty: 200, unitPriceCents: 165_000 },
    ],
    currency: "INR",
    warrantyMonths: 24,
    freeShippingMinCents: 1_000_000,
    leadDays: 3,
    certifications: ["FDA-cleared", "CE", "BIS IS 14155"],
    status: "published",
    tags: ["spo2", "vitals", "bluetooth", "bestseller"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
  {
    id: "eq_vitals_monitor",
    slug: "5-parameter-vitals-monitor-icu",
    manufacturerId: "demo-mfg-iconmed",
    manufacturerName: "IconMed Systems",
    title: "5-Parameter Vitals Monitor (ICU-grade)",
    tagline: "ECG · SpO₂ · NIBP · Temp · Resp. 12-inch touch. HL7 / FHIR export.",
    description: "Designed for ICU and step-down. Real-time streaming to OduDoc accountability log. Built-in 4h battery for inter-facility transfer. 36-month replace-on-fail warranty.",
    category: "icu",
    modelNumber: "IM-VM5-PRO",
    imageUrls: [],
    retailPriceCents: 18_500_000,
    wholesaleTiers: [
      { minQty: 4,  unitPriceCents: 16_500_000 },
      { minQty: 10, unitPriceCents: 14_800_000 },
      { minQty: 25, unitPriceCents: 13_500_000 },
    ],
    currency: "INR",
    warrantyMonths: 36,
    leadDays: 14,
    certifications: ["FDA-cleared", "CE", "ISO 13485"],
    status: "published",
    tags: ["icu", "monitor", "hl7"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
  {
    id: "eq_surgical_gloves",
    slug: "sterile-surgical-gloves-latex-free",
    manufacturerId: "demo-mfg-protec",
    manufacturerName: "ProTec Supplies",
    title: "Sterile Surgical Gloves — Latex-Free (box of 50 pairs)",
    tagline: "Powder-free, latex-free. AQL 1.0. Sizes 6.0 to 9.0.",
    description: "Polyisoprene formulation. Textured fingertips for instrument grip. Sterile EO. Each box of 50 pairs.",
    category: "consumables",
    modelNumber: "PT-SG-LF",
    imageUrls: [],
    retailPriceCents: 95_000,
    wholesaleTiers: [
      { minQty: 20,  unitPriceCents: 78_000 },
      { minQty: 100, unitPriceCents: 68_000 },
      { minQty: 500, unitPriceCents: 58_000 },
    ],
    currency: "INR",
    warrantyMonths: 0,
    freeShippingMinCents: 2_000_000,
    leadDays: 2,
    certifications: ["CE", "FDA 510(k)"],
    status: "published",
    tags: ["gloves", "consumables", "ot"],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];
