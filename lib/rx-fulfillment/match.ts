// Rx → pharmacy match engine.
//
// Pure function. Takes a list of Rx items + (optional) patient
// pincode, returns a ranked list of pharmacy "offers" — each one
// describing what fraction of the Rx the pharmacy can fulfill,
// the line-by-line price + discount, the delivery ETA, and whether
// the pharmacy needs a prescription upload.
//
// Ranking heuristic (in decreasing weight):
//   1. Coverage — how many Rx lines does this pharmacy stock?
//   2. Total price after discount (lower is better)
//   3. Delivery ETA (lower is better)
//   4. Same-pincode bonus when patient pincode is supplied
//
// We deliberately don't auto-pick a pharmacy. The patient sees the
// ranked list and chooses; that decision is the basis for the
// marketplace cut OduDoc takes (we already prioritise discount, so
// we're not pushing high-margin pharmacies up the ranking).

import {
  findStockByGeneric,
  normaliseDrug,
  type PharmacyStockEntry,
} from "./pharmacy-stock-store";

export interface RxLine {
  /** Free-text drug name as written. We normalise on input. */
  drugName: string;
  /** Strength + form to disambiguate when a pharmacy carries
   *  multiple SKUs of the same generic. */
  strength?: string;
  form?: string;
  /** Number of strips / bottles / vials the patient needs. */
  quantity: number;
}

export interface MatchedLine extends RxLine {
  inStock: boolean;
  pricedRupees?: number;       // pharmacy MRP × quantity, after discount
  mrpRupees?: number;          // before discount
  brand?: string;
  packSize?: number;
  stockId?: string;
  prescriptionRequired?: boolean;
}

export interface PharmacyOffer {
  pharmacyId: string;
  pharmacyName: string;
  city?: string;
  pincode?: string;
  /** Ranked items — same length as input, each with stock / price. */
  lines: MatchedLine[];
  /** Coverage = items in stock / total items. */
  coveragePct: number;
  /** Total of pricedRupees for the lines that ARE in stock. */
  totalRupees: number;
  /** Total MRP (no discount). */
  totalMrpRupees: number;
  /** Sum of savings across all lines this pharmacy fulfils. */
  savingsRupees: number;
  /** Worst delivery ETA across the stocked lines (delivery is one
   *  shipment; the slowest line gates the package). */
  deliveryEtaHours: number;
  /** Does any line require a prescription upload? */
  prescriptionRequired: boolean;
  /** Pharmacy-extended discount across the offer (weighted average). */
  effectiveDiscountPct: number;
  /** Score used for sort order — higher is better. */
  score: number;
  /** Set when a pincode hint was passed AND this pharmacy is in it. */
  samePincode: boolean;
}

export interface MatchInput {
  rx: RxLine[];
  patientPincode?: string;
  /** When true, we surface partial-coverage pharmacies even at the
   *  bottom of the list. Useful for the "show me everything" view. */
  includePartial?: boolean;
}

export function matchRxToPharmacies(input: MatchInput): PharmacyOffer[] {
  const offersByPharmacy = new Map<string, PharmacyOffer>();
  const linesNorm = input.rx.map((l) => ({
    ...l,
    norm: normaliseDrug(l.drugName),
  }));

  // Walk every Rx line; collect every pharmacy that has a matching
  // SKU and add a priced line into that pharmacy's offer.
  for (let li = 0; li < linesNorm.length; li++) {
    const line = linesNorm[li];
    const candidates = findStockByGeneric(line.norm).filter((s) => {
      // Strength + form filter when the Rx specifies them; else
      // accept any SKU of the same generic.
      if (line.strength && s.strength && line.strength !== s.strength) return false;
      if (line.form && s.form && line.form !== s.form) return false;
      return s.stockUnits >= line.quantity;
    });

    // Group every candidate match by its pharmacy. If a pharmacy has
    // multiple SKUs that fit (different brands), we pick the cheapest
    // post-discount.
    const byPharmacy = new Map<string, PharmacyStockEntry>();
    for (const c of candidates) {
      const existing = byPharmacy.get(c.pharmacyId);
      if (!existing) { byPharmacy.set(c.pharmacyId, c); continue; }
      const existingPrice = existing.mrpRupees * (1 - existing.discountPct / 100);
      const cPrice = c.mrpRupees * (1 - c.discountPct / 100);
      if (cPrice < existingPrice) byPharmacy.set(c.pharmacyId, c);
    }

    for (const [pharmacyId, sku] of byPharmacy) {
      let offer = offersByPharmacy.get(pharmacyId);
      if (!offer) {
        offer = {
          pharmacyId,
          pharmacyName: sku.pharmacyName,
          city: sku.city,
          pincode: sku.pincode,
          lines: input.rx.map((l) => ({ ...l, inStock: false })),
          coveragePct: 0,
          totalRupees: 0,
          totalMrpRupees: 0,
          savingsRupees: 0,
          deliveryEtaHours: 0,
          prescriptionRequired: false,
          effectiveDiscountPct: 0,
          score: 0,
          samePincode: false,
        };
        offersByPharmacy.set(pharmacyId, offer);
      }
      const linePrice = sku.mrpRupees * line.quantity * (1 - sku.discountPct / 100);
      const lineMrp = sku.mrpRupees * line.quantity;
      offer.lines[li] = {
        ...input.rx[li],
        inStock: true,
        pricedRupees: Math.round(linePrice),
        mrpRupees: Math.round(lineMrp),
        brand: sku.brand,
        packSize: sku.packSize,
        stockId: sku.id,
        prescriptionRequired: sku.prescriptionRequired,
      };
      offer.totalRupees += linePrice;
      offer.totalMrpRupees += lineMrp;
      offer.deliveryEtaHours = Math.max(offer.deliveryEtaHours, sku.deliveryEtaHours);
      if (sku.prescriptionRequired) offer.prescriptionRequired = true;
    }
  }

  // Finalise per-offer aggregates + scoring.
  const totalLines = input.rx.length || 1;
  const offers: PharmacyOffer[] = [];
  for (const offer of offersByPharmacy.values()) {
    const stocked = offer.lines.filter((l) => l.inStock).length;
    offer.coveragePct = Math.round((stocked / totalLines) * 100);
    offer.savingsRupees = Math.round(offer.totalMrpRupees - offer.totalRupees);
    offer.totalRupees = Math.round(offer.totalRupees);
    offer.totalMrpRupees = Math.round(offer.totalMrpRupees);
    offer.effectiveDiscountPct =
      offer.totalMrpRupees > 0
        ? Math.round((offer.savingsRupees / offer.totalMrpRupees) * 100)
        : 0;
    if (input.patientPincode && offer.pincode === input.patientPincode) {
      offer.samePincode = true;
    }
    // Skip partials unless the caller asked for them.
    if (!input.includePartial && offer.coveragePct < 100) continue;

    // Composite score: coverage dominates, then price (rank within
    // partial-coverage band), then ETA + pincode tiebreaker.
    let score = offer.coveragePct * 100;
    score -= Math.min(50, offer.totalRupees / 100); // discourage expensive offers
    score -= offer.deliveryEtaHours; // each hour of ETA hurts a tiny bit
    if (offer.samePincode) score += 25;
    offer.score = Math.round(score);
    offers.push(offer);
  }
  offers.sort((a, b) => b.score - a.score);
  return offers;
}
