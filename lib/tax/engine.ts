// Country-aware tax engine.
//
// Healthcare invoicing is taxed differently per country: India runs
// GST with split CGST/SGST/IGST, the UK has 20% VAT (with healthcare
// exemptions for licensed practitioners), the US has state-level
// sales tax (rarely on medical), Saudi runs 15% VAT, Singapore 9%
// GST. We keep the table small + flat — operators flag country code
// at invoice time and we pick the right rule.
//
// IMPORTANT — healthcare exemptions:
//   Many jurisdictions exempt diagnostic + therapeutic services
//   provided by a licensed practitioner. The engine flags these
//   service codes as "exempt" so an invoice can split exempt vs
//   taxable lines instead of forcing a single rate on everything.

export type TaxRegime =
  | "gst_split"   // CGST + SGST when intra-state, IGST when inter-state (IN)
  | "vat_flat"    // single VAT line (UK, EU, GCC)
  | "sales_tax"   // state-level + maybe city (US)
  | "none";       // no consumption tax

export interface CountryTaxRule {
  countryIso2: string;
  countryName: string;
  regime: TaxRegime;
  /** Standard rate %. For gst_split, this is the COMBINED rate;
   *  the engine splits 50/50 into CGST + SGST when intra-state. */
  standardRatePct: number;
  /** Reduced rate for select healthcare items (medicines vs services). */
  reducedRatePct?: number;
  /** Whether licensed-practitioner medical services are typically
   *  exempt. Operators override per-line. */
  servicesExempt?: boolean;
  /** Currency code for display; tax is computed in rupees in our
   *  store but rendered in the local symbol when shown to the user. */
  currency: string;
}

export const COUNTRY_TAX_RULES: CountryTaxRule[] = [
  { countryIso2: "IN", countryName: "India",         regime: "gst_split", standardRatePct: 18, reducedRatePct: 12, servicesExempt: true,  currency: "INR" },
  { countryIso2: "GB", countryName: "United Kingdom", regime: "vat_flat",  standardRatePct: 20,                       servicesExempt: true,  currency: "GBP" },
  { countryIso2: "US", countryName: "United States", regime: "sales_tax", standardRatePct: 8,                                                  currency: "USD" },
  { countryIso2: "AE", countryName: "UAE",            regime: "vat_flat",  standardRatePct: 5,                        servicesExempt: true,  currency: "AED" },
  { countryIso2: "SA", countryName: "Saudi Arabia",   regime: "vat_flat",  standardRatePct: 15,                       servicesExempt: false, currency: "SAR" },
  { countryIso2: "SG", countryName: "Singapore",      regime: "vat_flat",  standardRatePct: 9,                        servicesExempt: true,  currency: "SGD" },
  { countryIso2: "AU", countryName: "Australia",      regime: "vat_flat",  standardRatePct: 10,                       servicesExempt: true,  currency: "AUD" },
  { countryIso2: "CA", countryName: "Canada",         regime: "vat_flat",  standardRatePct: 5,                        servicesExempt: true,  currency: "CAD" },
  { countryIso2: "DE", countryName: "Germany",        regime: "vat_flat",  standardRatePct: 19, reducedRatePct: 7,    servicesExempt: true,  currency: "EUR" },
  { countryIso2: "FR", countryName: "France",         regime: "vat_flat",  standardRatePct: 20, reducedRatePct: 10,   servicesExempt: true,  currency: "EUR" },
  { countryIso2: "ZA", countryName: "South Africa",   regime: "vat_flat",  standardRatePct: 15,                       servicesExempt: true,  currency: "ZAR" },
  { countryIso2: "NG", countryName: "Nigeria",        regime: "vat_flat",  standardRatePct: 7.5,                      servicesExempt: false, currency: "NGN" },
  { countryIso2: "KE", countryName: "Kenya",          regime: "vat_flat",  standardRatePct: 16,                       servicesExempt: true,  currency: "KES" },
  { countryIso2: "BD", countryName: "Bangladesh",     regime: "vat_flat",  standardRatePct: 15,                       servicesExempt: false, currency: "BDT" },
  { countryIso2: "PK", countryName: "Pakistan",       regime: "vat_flat",  standardRatePct: 18,                       servicesExempt: false, currency: "PKR" },
  { countryIso2: "LK", countryName: "Sri Lanka",      regime: "vat_flat",  standardRatePct: 18,                       servicesExempt: false, currency: "LKR" },
  { countryIso2: "ID", countryName: "Indonesia",      regime: "vat_flat",  standardRatePct: 11,                       servicesExempt: true,  currency: "IDR" },
  { countryIso2: "PH", countryName: "Philippines",    regime: "vat_flat",  standardRatePct: 12,                       servicesExempt: true,  currency: "PHP" },
  { countryIso2: "JP", countryName: "Japan",          regime: "vat_flat",  standardRatePct: 10, reducedRatePct: 8,    servicesExempt: true,  currency: "JPY" },
];

export function getRule(countryIso2: string): CountryTaxRule | null {
  const k = countryIso2.trim().toUpperCase();
  return COUNTRY_TAX_RULES.find((r) => r.countryIso2 === k) || null;
}

export type LineCategory =
  | "consultation"     // doctor service — usually exempt under servicesExempt
  | "lab_test"
  | "imaging"
  | "medicine"
  | "consumable"
  | "room_charge"
  | "surgery"
  | "other";

export interface InvoiceLine {
  description: string;
  category: LineCategory;
  amountRupees: number;
  /** Force the line into a specific tax bucket. Overrides default. */
  taxOverride?: "exempt" | "standard" | "reduced";
}

export interface InvoiceTaxSummary {
  countryIso2: string;
  regime: TaxRegime;
  /** Per-line tax detail. */
  lines: Array<InvoiceLine & {
    appliedRatePct: number;
    taxRupees: number;
    bucketLabel: "Exempt" | "Standard" | "Reduced";
  }>;
  /** Bucketed totals. */
  exemptSubtotal: number;
  taxableStandardSubtotal: number;
  taxableReducedSubtotal: number;
  /** Computed taxes. For gst_split, total = cgst + sgst (intra) or igst (inter). */
  cgstRupees?: number;
  sgstRupees?: number;
  igstRupees?: number;
  vatRupees?: number;
  salesTaxRupees?: number;
  totalTaxRupees: number;
  grandTotalRupees: number;
}

export interface ComputeInvoiceInput {
  countryIso2: string;
  lines: InvoiceLine[];
  /** India only — buyer + seller in same state collects CGST + SGST;
   *  inter-state collects IGST. Flag is set by the org's billing
   *  layer based on its own GSTIN vs the patient's address. */
  intraStateInIndia?: boolean;
  /** Optional override of the default reduced-rate categories. */
  reducedCategories?: LineCategory[];
}

const DEFAULT_REDUCED_CATEGORIES: LineCategory[] = ["medicine"];

/** Pure: compute per-line tax breakdown + totals for an invoice. */
export function computeInvoice(input: ComputeInvoiceInput): InvoiceTaxSummary {
  const rule = getRule(input.countryIso2);
  const reducedCats = input.reducedCategories || DEFAULT_REDUCED_CATEGORIES;

  const out: InvoiceTaxSummary = {
    countryIso2: input.countryIso2.toUpperCase(),
    regime: rule?.regime || "none",
    lines: [],
    exemptSubtotal: 0,
    taxableStandardSubtotal: 0,
    taxableReducedSubtotal: 0,
    totalTaxRupees: 0,
    grandTotalRupees: 0,
  };

  for (const ln of input.lines) {
    let bucket: "exempt" | "standard" | "reduced" = "standard";
    if (ln.taxOverride) {
      bucket = ln.taxOverride;
    } else if (!rule) {
      bucket = "exempt";
    } else if (ln.category === "consultation" && rule.servicesExempt) {
      bucket = "exempt";
    } else if (reducedCats.includes(ln.category) && rule.reducedRatePct !== undefined) {
      bucket = "reduced";
    }
    let appliedRate = 0;
    if (rule) {
      if (bucket === "standard") appliedRate = rule.standardRatePct;
      else if (bucket === "reduced") appliedRate = rule.reducedRatePct ?? rule.standardRatePct;
    }
    const taxRupees = Math.round((ln.amountRupees * appliedRate) / 100);
    out.lines.push({
      ...ln,
      appliedRatePct: appliedRate,
      taxRupees,
      bucketLabel: bucket === "exempt" ? "Exempt" : bucket === "reduced" ? "Reduced" : "Standard",
    });
    if (bucket === "exempt") out.exemptSubtotal += ln.amountRupees;
    else if (bucket === "reduced") out.taxableReducedSubtotal += ln.amountRupees;
    else out.taxableStandardSubtotal += ln.amountRupees;
  }

  if (rule) {
    const standardTax = Math.round((out.taxableStandardSubtotal * rule.standardRatePct) / 100);
    const reducedTax = rule.reducedRatePct !== undefined
      ? Math.round((out.taxableReducedSubtotal * rule.reducedRatePct) / 100)
      : 0;
    const totalTax = standardTax + reducedTax;

    if (rule.regime === "gst_split") {
      if (input.intraStateInIndia) {
        out.cgstRupees = Math.round(totalTax / 2);
        out.sgstRupees = totalTax - out.cgstRupees;
      } else {
        out.igstRupees = totalTax;
      }
    } else if (rule.regime === "vat_flat") {
      out.vatRupees = totalTax;
    } else if (rule.regime === "sales_tax") {
      out.salesTaxRupees = totalTax;
    }
    out.totalTaxRupees = totalTax;
  }
  out.grandTotalRupees =
    out.exemptSubtotal +
    out.taxableStandardSubtotal +
    out.taxableReducedSubtotal +
    out.totalTaxRupees;
  return out;
}
