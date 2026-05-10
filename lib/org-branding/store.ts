// Org branding — per-organization logo, theme, watermark.
//
// Every hospital / lab / diagnostic / pharmacy / pharma / insurer /
// education partner can upload their own logo set + color theme so
// invoices, patient files, prescription PDFs, billing footers,
// and dashboards render in their visual identity. OduDoc-the-platform
// stays present as a co-brand in the footer ("powered by OduDoc")
// rather than disappearing entirely — protects against rogue orgs
// passing off OduDoc-issued documents as fully independent.
//
// File limits intentionally tight (256 KB each, 5 assets max) so
// the JSON-blob persistence stays sane.

import { bindPersistentArray } from "../persistent-array";

export interface OrgBranding {
  /** id == organizationId. */
  id: string;
  organizationId: string;
  /** data: URL — light backgrounds. Drives most surfaces. */
  logoLight?: string;
  /** data: URL — dark backgrounds. Falls back to light when missing. */
  logoDark?: string;
  /** data: URL — favicon for the org's white-label sub-app. */
  favicon?: string;
  /** Hex — primary brand color. Used for primary buttons, accents. */
  primaryColor?: string;
  /** Hex — accent color. Secondary CTAs, links. */
  accentColor?: string;
  /** Override of the displayed name on documents. */
  displayName?: string;
  /** Footer line on invoices + reports. */
  invoiceFooter?: string;
  /** Watermark text on internal documents (defaults to display name). */
  watermarkText?: string;
  /** Org website URL — linked from public-facing pages. */
  websiteUrl?: string;
  updatedAt: string;
  updatedBy?: string;
}

const records: OrgBranding[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<OrgBranding>(
  "org_branding",
  records,
  () => []
);
await hydrate();

export const MAX_ASSET_BYTES = 256 * 1024;

export function getBranding(organizationId: string): OrgBranding | null {
  return records.find((r) => r.organizationId === organizationId) || null;
}

export interface UpsertBrandingInput {
  organizationId: string;
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  primaryColor?: string;
  accentColor?: string;
  displayName?: string;
  invoiceFooter?: string;
  watermarkText?: string;
  websiteUrl?: string;
  updatedBy?: string;
}

export function upsertBranding(input: UpsertBrandingInput): { ok: true; branding: OrgBranding } | { ok: false; error: string } {
  for (const k of ["logoLight", "logoDark", "favicon"] as const) {
    const v = input[k];
    if (v !== undefined && v !== "" && !isDataUrlWithinLimit(v)) {
      return { ok: false, error: `${k}_invalid_or_too_large` };
    }
  }
  for (const k of ["primaryColor", "accentColor"] as const) {
    const v = input[k];
    if (v !== undefined && v !== "" && !isHex(v)) {
      return { ok: false, error: `${k}_invalid_hex` };
    }
  }
  const at = new Date().toISOString();
  let r = records.find((x) => x.organizationId === input.organizationId);
  if (r) {
    if (input.logoLight !== undefined) r.logoLight = input.logoLight || undefined;
    if (input.logoDark !== undefined) r.logoDark = input.logoDark || undefined;
    if (input.favicon !== undefined) r.favicon = input.favicon || undefined;
    if (input.primaryColor !== undefined) r.primaryColor = input.primaryColor || undefined;
    if (input.accentColor !== undefined) r.accentColor = input.accentColor || undefined;
    if (input.displayName !== undefined) r.displayName = input.displayName?.trim() || undefined;
    if (input.invoiceFooter !== undefined) r.invoiceFooter = input.invoiceFooter?.trim() || undefined;
    if (input.watermarkText !== undefined) r.watermarkText = input.watermarkText?.trim() || undefined;
    if (input.websiteUrl !== undefined) r.websiteUrl = input.websiteUrl?.trim() || undefined;
    r.updatedAt = at;
    r.updatedBy = input.updatedBy;
  } else {
    r = {
      id: `brand-${input.organizationId}`,
      organizationId: input.organizationId,
      logoLight: input.logoLight || undefined,
      logoDark: input.logoDark || undefined,
      favicon: input.favicon || undefined,
      primaryColor: input.primaryColor || undefined,
      accentColor: input.accentColor || undefined,
      displayName: input.displayName?.trim() || undefined,
      invoiceFooter: input.invoiceFooter?.trim() || undefined,
      watermarkText: input.watermarkText?.trim() || undefined,
      websiteUrl: input.websiteUrl?.trim() || undefined,
      updatedAt: at,
      updatedBy: input.updatedBy,
    };
    records.push(r);
  }
  flush();
  return { ok: true, branding: r };
}

export function deleteBranding(organizationId: string): boolean {
  const i = records.findIndex((r) => r.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(records[i].id);
  records.splice(i, 1);
  flush();
  return true;
}

function isHex(s: string): boolean {
  return /^#?[0-9a-f]{3,8}$/i.test(s.trim());
}

function isDataUrlWithinLimit(s: string): boolean {
  if (!s.startsWith("data:")) return false;
  const idx = s.indexOf(",");
  if (idx < 0) return false;
  const b64 = s.slice(idx + 1);
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
  return bytes <= MAX_ASSET_BYTES;
}

/** List all branded orgs — useful for the super-admin overview. */
export function listAllBranding(): OrgBranding[] {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
