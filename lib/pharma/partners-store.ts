// Pharma authorized partners — distributors and retailers.
//
// Pharma uploads each authorized partner with name, GSTIN, address,
// geo-location, and contact details. Doctors / pharmacists query
// this to verify a vendor before purchasing — "is this distributor
// genuinely authorized to sell <brand>?". Anti-counterfeit pillar:
// counterfeiters cannot fake distributor papers if the verification
// runs against the pharma company's own roster, not the
// counterfeiter's claim.

import { bindPersistentArray } from "../persistent-array";

export type PartnerKind = "distributor" | "retailer" | "stockist" | "agent";

export interface AuthorizedPartner {
  id: string;
  organizationId: string;        // pharma company
  kind: PartnerKind;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  drugLicense?: string;
  address: string;
  city: string;
  state: string;
  countryIso2: string;
  pincode?: string;
  /** WGS-84 lat/lng — geo-verification. */
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  /** Brands this partner is authorized for. Empty = all. */
  authorizedBrands?: string[];
  /** Authorization valid until — past this date, queries return
   *  status="expired". */
  validUntil?: string;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const partners: AuthorizedPartner[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<AuthorizedPartner>(
  "pharma_partners",
  partners,
  () => []
);
await hydrate();

export interface CreatePartnerInput {
  organizationId: string;
  kind: PartnerKind;
  legalName: string;
  tradeName?: string;
  gstin?: string;
  drugLicense?: string;
  address: string;
  city: string;
  state: string;
  countryIso2: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  authorizedBrands?: string[];
  validUntil?: string;
  notes?: string;
}

export function createPartner(input: CreatePartnerInput): AuthorizedPartner {
  const at = new Date().toISOString();
  const p: AuthorizedPartner = {
    id: `pp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    organizationId: input.organizationId,
    kind: input.kind,
    legalName: input.legalName.trim(),
    tradeName: input.tradeName?.trim() || undefined,
    gstin: input.gstin?.trim().toUpperCase() || undefined,
    drugLicense: input.drugLicense?.trim() || undefined,
    address: input.address.trim(),
    city: input.city.trim(),
    state: input.state.trim(),
    countryIso2: input.countryIso2.trim().toUpperCase(),
    pincode: input.pincode?.trim() || undefined,
    lat: input.lat,
    lng: input.lng,
    contactName: input.contactName?.trim() || undefined,
    contactPhone: input.contactPhone?.trim() || undefined,
    contactEmail: input.contactEmail?.trim() || undefined,
    authorizedBrands: input.authorizedBrands?.map((b) => b.trim()).filter(Boolean),
    validUntil: input.validUntil,
    active: true,
    notes: input.notes?.trim() || undefined,
    createdAt: at, updatedAt: at,
  };
  partners.unshift(p);
  flush();
  return p;
}

export function listPartners(opts: { organizationId?: string; kind?: PartnerKind; query?: string } = {}): AuthorizedPartner[] {
  let list = [...partners];
  if (opts.organizationId) list = list.filter((p) => p.organizationId === opts.organizationId);
  if (opts.kind) list = list.filter((p) => p.kind === opts.kind);
  if (opts.query) {
    const q = opts.query.toLowerCase();
    list = list.filter((p) =>
      p.legalName.toLowerCase().includes(q) ||
      p.tradeName?.toLowerCase().includes(q) ||
      p.gstin?.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q)
    );
  }
  return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function updatePartner(id: string, organizationId: string, patch: Partial<CreatePartnerInput> & { active?: boolean }): AuthorizedPartner | null {
  const p = partners.find((x) => x.id === id && x.organizationId === organizationId);
  if (!p) return null;
  Object.assign(p, patch);
  p.updatedAt = new Date().toISOString();
  flush();
  return p;
}

export function deletePartner(id: string, organizationId: string): boolean {
  const i = partners.findIndex((p) => p.id === id && p.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(partners[i].id);
  partners.splice(i, 1);
  flush();
  return true;
}

export function deletePartnersForOrg(organizationId: string): number {
  let n = 0;
  for (let i = partners.length - 1; i >= 0; i--) {
    if (partners[i].organizationId === organizationId) {
      tombstone(partners[i].id);
      partners.splice(i, 1);
      n++;
    }
  }
  if (n) flush();
  return n;
}

export type VerifyPartnerStatus =
  | "verified"           // authorized, valid, brand on the list
  | "verified_all_brands" // authorized, valid, no brand restriction
  | "wrong_brand"        // authorized but not for this brand
  | "expired"            // authorization past validUntil
  | "inactive"           // marked inactive
  | "not_found";

/** Doctor-side verification: given a partner identifier (legal name,
 *  GSTIN, or drug license) and the brand they're claiming to sell,
 *  return whether they're authorized.
 */
export function verifyPartner(input: { identifier: string; brandName?: string }): { status: VerifyPartnerStatus; partner?: AuthorizedPartner } {
  const id = input.identifier.trim().toLowerCase();
  const brand = input.brandName?.trim().toLowerCase();
  const hit = partners.find((p) =>
    p.legalName.toLowerCase() === id ||
    p.tradeName?.toLowerCase() === id ||
    p.gstin?.toLowerCase() === id ||
    p.drugLicense?.toLowerCase() === id
  );
  if (!hit) return { status: "not_found" };
  if (!hit.active) return { status: "inactive", partner: hit };
  if (hit.validUntil && new Date(hit.validUntil) < new Date()) {
    return { status: "expired", partner: hit };
  }
  if (!brand) {
    return { status: hit.authorizedBrands && hit.authorizedBrands.length > 0 ? "verified" : "verified_all_brands", partner: hit };
  }
  if (!hit.authorizedBrands || hit.authorizedBrands.length === 0) {
    return { status: "verified_all_brands", partner: hit };
  }
  if (hit.authorizedBrands.some((b) => b.toLowerCase() === brand)) {
    return { status: "verified", partner: hit };
  }
  return { status: "wrong_brand", partner: hit };
}
