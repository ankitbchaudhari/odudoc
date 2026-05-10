// Org mini-website builder.
//
// Hospitals, clinics, labs, diagnostic centers, pharmacies, pharma
// companies, insurers, and education partners get a mini-site at
// /c/<slug> populated from a single record here. No theming
// gymnastics — pulls /lib/org-branding for logo + colors so each
// surface stays consistent. Vacancies + courses + drug catalogue
// pages cross-link in automatically based on the org's role.

import { bindPersistentArray } from "../persistent-array";

export interface TeamMember {
  name: string;
  role: string;
  photoUrl?: string;
  bio?: string;
}

export interface ServiceItem {
  title: string;
  description: string;
  icon?: string;            // emoji
}

export interface OrgWebsite {
  /** id == organizationId. */
  id: string;
  organizationId: string;
  /** Public-friendly slug — used in /c/<slug>. Must be unique across
   *  the platform (enforced at upsert time). */
  slug: string;
  /** Long-form intro shown on the home tab. */
  about?: string;
  /** Short headline above the hero — "Hyderabad's leading cardiac
   *  centre", etc. */
  tagline?: string;
  /** Hero background image — data: URL or external https. */
  heroImageUrl?: string;
  /** Up to 6 services / specialties highlighted on the home tab. */
  services: ServiceItem[];
  /** Up to 12 team members — doctors, leadership, faculty. */
  team: TeamMember[];
  /** Galleries — up to 12 image URLs. */
  gallery: string[];
  /** Plain-text contact block — phone / fax / hours. */
  contactBlock?: string;
  /** Show a button that opens the booking flow. */
  enableBooking: boolean;
  /** Show "Apply" button surfacing the org's open vacancies. */
  showVacancies: boolean;
  /** Show "Browse courses" button (education orgs). */
  showCourses: boolean;
  /** Public — if false the page returns 404 even with a valid slug. */
  published: boolean;
  updatedAt: string;
  createdAt: string;
}

const sites: OrgWebsite[] = [];
const { hydrate, flush, tombstone } = bindPersistentArray<OrgWebsite>(
  "org_websites",
  sites,
  () => []
);
await hydrate();

export interface UpsertSiteInput {
  organizationId: string;
  slug: string;
  about?: string;
  tagline?: string;
  heroImageUrl?: string;
  services?: ServiceItem[];
  team?: TeamMember[];
  gallery?: string[];
  contactBlock?: string;
  enableBooking?: boolean;
  showVacancies?: boolean;
  showCourses?: boolean;
  published?: boolean;
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export function upsertSite(input: UpsertSiteInput): { ok: true; site: OrgWebsite } | { ok: false; error: string } {
  const slug = input.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return { ok: false, error: "invalid_slug" };
  // Slug must be unique across orgs.
  const slugClash = sites.find((s) => s.slug === slug && s.organizationId !== input.organizationId);
  if (slugClash) return { ok: false, error: "slug_taken" };

  const at = new Date().toISOString();
  let s = sites.find((x) => x.organizationId === input.organizationId);
  if (s) {
    s.slug = slug;
    if (input.about !== undefined) s.about = input.about?.trim() || undefined;
    if (input.tagline !== undefined) s.tagline = input.tagline?.trim() || undefined;
    if (input.heroImageUrl !== undefined) s.heroImageUrl = input.heroImageUrl || undefined;
    if (input.services !== undefined) s.services = input.services.slice(0, 6);
    if (input.team !== undefined) s.team = input.team.slice(0, 12);
    if (input.gallery !== undefined) s.gallery = input.gallery.slice(0, 12);
    if (input.contactBlock !== undefined) s.contactBlock = input.contactBlock?.trim() || undefined;
    if (input.enableBooking !== undefined) s.enableBooking = !!input.enableBooking;
    if (input.showVacancies !== undefined) s.showVacancies = !!input.showVacancies;
    if (input.showCourses !== undefined) s.showCourses = !!input.showCourses;
    if (input.published !== undefined) s.published = !!input.published;
    s.updatedAt = at;
  } else {
    s = {
      id: `site-${input.organizationId}`,
      organizationId: input.organizationId,
      slug,
      about: input.about?.trim() || undefined,
      tagline: input.tagline?.trim() || undefined,
      heroImageUrl: input.heroImageUrl,
      services: (input.services || []).slice(0, 6),
      team: (input.team || []).slice(0, 12),
      gallery: (input.gallery || []).slice(0, 12),
      contactBlock: input.contactBlock?.trim() || undefined,
      enableBooking: input.enableBooking ?? true,
      showVacancies: input.showVacancies ?? true,
      showCourses: input.showCourses ?? false,
      published: input.published ?? false,
      updatedAt: at, createdAt: at,
    };
    sites.push(s);
  }
  flush();
  return { ok: true, site: s };
}

export function getSiteByOrg(organizationId: string): OrgWebsite | null {
  return sites.find((s) => s.organizationId === organizationId) || null;
}

export function getSiteBySlug(slug: string): OrgWebsite | null {
  const s = sites.find((x) => x.slug === slug.toLowerCase());
  if (!s || !s.published) return null;
  return s;
}

export function deleteSiteForOrg(organizationId: string): boolean {
  const i = sites.findIndex((s) => s.organizationId === organizationId);
  if (i < 0) return false;
  tombstone(sites[i].id);
  sites.splice(i, 1);
  flush();
  return true;
}
