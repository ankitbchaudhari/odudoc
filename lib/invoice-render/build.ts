// Invoice rendering pipeline.
//
// One function — buildInvoiceRender — takes a hospital invoice id
// and returns a fully-resolved view model the print page renders:
//
//   - org branding (logo light/dark, primary color, invoice footer)
//     pulled from /lib/org-branding
//   - tax breakdown computed via /lib/tax/engine using the org's
//     country (CGST/SGST/IGST for IN intra-state, IGST for inter-state,
//     VAT for the rest). Per-category line classification matches
//     the hospital invoice categories to the tax engine's
//     LineCategory.
//   - patient + org metadata
//
// Pure-ish — only reads from stores, no side effects.

import { computeInvoice, getRule, type InvoiceLine, type InvoiceTaxSummary, type LineCategory } from "../tax/engine";
import { getInvoiceById, type Invoice } from "../hospital/invoices-store";
import { getOrganizationById, type Organization } from "../organizations-store";
import { getBranding, type OrgBranding } from "../org-branding/store";

export interface InvoiceRender {
  invoice: Invoice;
  org: Organization | null;
  branding: OrgBranding | null;
  tax: InvoiceTaxSummary;
  /** Resolved title shown on the receipt. */
  displayName: string;
  /** Currency code from the country rule (overrides invoice.currency
   *  when they disagree — country is canonical). */
  currency: string;
  /** Hex stripe — org primary color, falls back to the platform's
   *  indigo when unset. */
  primaryColor: string;
}

/** Hospital invoice categories ↔ tax engine LineCategory. */
function mapCategory(c: Invoice["items"][number]["category"]): LineCategory {
  switch (c) {
    case "consultation": return "consultation";
    case "procedure":    return "surgery";
    case "lab":          return "lab_test";
    case "pharmacy":     return "medicine";
    case "room":         return "room_charge";
    case "other":
    default:             return "other";
  }
}

export interface BuildOptions {
  invoiceId: string;
  organizationId: string;
  /** True when the patient's billing address is in the same Indian
   *  state as the org. Drives CGST+SGST vs IGST split. Caller looks
   *  this up — we don't have address stamping yet. */
  intraStateInIndia?: boolean;
}

export function buildInvoiceRender(opts: BuildOptions): InvoiceRender | null {
  const inv = getInvoiceById(opts.invoiceId, opts.organizationId);
  if (!inv) return null;
  const org = getOrganizationById(inv.organizationId);
  const branding = getBranding(inv.organizationId);
  const country = (org?.country || "IN").toUpperCase();
  const rule = getRule(country);

  // Build tax-engine line set off the invoice's own line items —
  // we do NOT trust per-line taxPercent from the existing schema
  // (operators may set it inconsistently). Tax is recomputed off
  // the country rule + line category every render.
  const taxLines: InvoiceLine[] = inv.items.map((it) => {
    const lineSubtotal = it.quantity * it.unitPrice - (it.discount || 0);
    return {
      description: it.description,
      category: mapCategory(it.category),
      amountRupees: Math.max(0, Math.round(lineSubtotal)),
    };
  });
  const tax = computeInvoice({
    countryIso2: country,
    lines: taxLines,
    intraStateInIndia: opts.intraStateInIndia,
  });

  return {
    invoice: inv,
    org,
    branding,
    tax,
    displayName: branding?.displayName || org?.name || "Organization",
    currency: rule?.currency || inv.currency || "INR",
    primaryColor: branding?.primaryColor || "#4f46e5",
  };
}
