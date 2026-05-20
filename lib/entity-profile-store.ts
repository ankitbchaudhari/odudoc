// Public entity profile pages — V11 of the Master Spec.
//
// Every entity in OduDoc (doctor / hospital / clinic / pharmacy / lab /
// diagnostic / insurance / pharma / manufacturer / education) gets a
// public-facing profile page at https://www.odudoc.com/e/<slug>.
//
// Profiles are composed of "sections" the entity arranges via a
// drag-and-drop builder (V11 §2.3 lists 20 section types). This store
// holds the section list as an ordered array, so reordering = swapping
// indexes, hiding = setting visible=false.
//
// Visibility is governed by V11 §3 per entity kind — pharma can't show
// patient testimonials (regulatory), insurance can't show retail
// pricing (regulatory), etc. The renderer enforces this.

import { bindPersistentArray } from "@/lib/persistent-array";

export type EntityKind =
  | "doctor" | "hospital" | "clinic" | "pharmacy" | "lab"
  | "diagnostic" | "insurance" | "pharma" | "manufacturer"
  | "education" | "distributor";

// V11 §2.3 — 20 section types. Each section row is { type, data, visible }.
export type SectionType =
  | "hero"             // Banner + headline + CTA
  | "about"            // Long-form description
  | "services"         // Service / specialty list with pricing
  | "team"             // Practitioner / staff cards
  | "contact"          // Address + phone + map
  | "stats"            // KPI tiles (years, patients, success rate)
  | "testimonials"     // Patient / partner quotes
  | "gallery"          // Image grid
  | "certifications"   // Accreditations + verifications
  | "products"         // Catalogue (pharma drugs, equipment, courses)
  | "pricing"          // Pricing tables (lab tests, courses, equipment)
  | "facilities"       // Hospital wards, OR count, ICU beds
  | "specialties"      // Hospital department list
  | "insurance_panel"  // Empanelled insurers
  | "research"         // Publications, trials
  | "education"        // CME courses, residency programmes
  | "press"            // News mentions, awards
  | "faq"              // Q&A pairs
  | "video"            // Embedded clip
  | "cta";             // Call-to-action band

export interface ProfileSection {
  id: string;
  type: SectionType;
  visible: boolean;
  data: Record<string, unknown>;
}

export interface EntityProfile {
  /** Slug used in the public URL — odudoc.com/e/<slug>. Locked at
   *  publish time; renames create a redirect from the old slug. */
  slug: string;
  entityKind: EntityKind;
  /** Owner entity id (user / hospital / pharmacy etc. id). */
  entityId: string;
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  city?: string;
  country?: string;
  verifiedAt?: string;
  /** "draft" — not visible to public.
   *  "published" — visible at /e/<slug>.
   *  "featured" — paid placement on the home page directory (V11 §5.3). */
  status: "draft" | "published" | "featured";
  sections: ProfileSection[];
  /** Last reviewed-by-super-admin timestamp (V11 §5.1 review queue). */
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

const profiles: EntityProfile[] = [];
const handle = bindPersistentArray<EntityProfile>("entity_profiles", profiles, () => SEED_PROFILES);

let hydrated = false;
async function ensureHydrated() {
  if (hydrated) return;
  await handle.hydrate();
  hydrated = true;
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Visibility rules (V11 §3) ─────────────────────────────────────
//
// Each entity kind has a set of allowed section types. The renderer
// silently drops disallowed sections so a misconfigured profile never
// leaks pharma testimonials etc.

const ALLOWED: Record<EntityKind, Set<SectionType>> = {
  doctor: new Set([
    "hero", "about", "services", "stats", "testimonials", "education",
    "certifications", "press", "research", "faq", "contact", "cta", "video",
  ]),
  hospital: new Set([
    "hero", "about", "specialties", "team", "facilities", "stats",
    "certifications", "insurance_panel", "gallery", "press", "faq",
    "contact", "cta", "video", "testimonials",
  ]),
  clinic: new Set([
    "hero", "about", "services", "team", "stats", "certifications",
    "testimonials", "faq", "contact", "cta", "gallery",
  ]),
  pharmacy: new Set([
    "hero", "about", "products", "stats", "certifications",
    "faq", "contact", "cta",
  ]),
  lab: new Set([
    "hero", "about", "services", "pricing", "stats", "certifications",
    "gallery", "faq", "contact", "cta",
  ]),
  diagnostic: new Set([
    "hero", "about", "services", "pricing", "stats", "certifications",
    "gallery", "faq", "contact", "cta",
  ]),
  insurance: new Set([
    "hero", "about", "products", "stats", "certifications", "faq",
    "press", "contact", "cta",
  ]),
  pharma: new Set([
    // No testimonials, no patient-facing claims (regulatory).
    "hero", "about", "products", "research", "stats", "certifications",
    "press", "faq", "contact",
  ]),
  manufacturer: new Set([
    "hero", "about", "products", "pricing", "stats", "certifications",
    "gallery", "research", "press", "faq", "contact", "cta",
  ]),
  education: new Set([
    "hero", "about", "education", "team", "stats", "certifications",
    "gallery", "press", "faq", "contact", "cta", "testimonials",
  ]),
  distributor: new Set([
    "hero", "about", "products", "stats", "certifications", "contact",
  ]),
};

export function visibleSections(p: EntityProfile): ProfileSection[] {
  const allowed = ALLOWED[p.entityKind] || new Set<SectionType>();
  return p.sections.filter((s) => s.visible && allowed.has(s.type));
}

// ── Read ──────────────────────────────────────────────────────────

export async function getProfileBySlug(slug: string): Promise<EntityProfile | null> {
  await ensureHydrated();
  return profiles.find((p) => p.slug === slug && p.status !== "draft") || null;
}

export async function getProfileById(id: string): Promise<EntityProfile | null> {
  await ensureHydrated();
  return profiles.find((p) => p.entityId === id) || null;
}

export async function listPublishedProfiles(filter: { entityKind?: EntityKind; featured?: boolean } = {}): Promise<EntityProfile[]> {
  await ensureHydrated();
  let rows = profiles.filter((p) => p.status === "published" || p.status === "featured");
  if (filter.entityKind) rows = rows.filter((p) => p.entityKind === filter.entityKind);
  if (filter.featured) rows = rows.filter((p) => p.status === "featured");
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ── Write ─────────────────────────────────────────────────────────

export interface UpsertInput {
  entityKind: EntityKind;
  entityId: string;
  slug: string;
  displayName: string;
  tagline?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  city?: string;
  country?: string;
  status?: EntityProfile["status"];
  sections?: ProfileSection[];
}

export async function upsertProfile(input: UpsertInput): Promise<EntityProfile> {
  await ensureHydrated();
  const now = new Date().toISOString();
  const existing = profiles.find((p) => p.entityId === input.entityId);
  if (existing) {
    Object.assign(existing, input);
    existing.updatedAt = now;
    handle.flush();
    return existing;
  }
  const p: EntityProfile = {
    slug: input.slug,
    entityKind: input.entityKind,
    entityId: input.entityId,
    displayName: input.displayName,
    tagline: input.tagline,
    logoUrl: input.logoUrl,
    heroImageUrl: input.heroImageUrl,
    city: input.city,
    country: input.country,
    status: input.status || "draft",
    sections: input.sections || [],
    createdAt: now,
    updatedAt: now,
  };
  profiles.push(p);
  handle.flush();
  return p;
}

export async function appendSection(slug: string, section: Omit<ProfileSection, "id">): Promise<EntityProfile | null> {
  await ensureHydrated();
  const p = profiles.find((x) => x.slug === slug);
  if (!p) return null;
  p.sections.push({ ...section, id: uid("sec") });
  p.updatedAt = new Date().toISOString();
  handle.flush();
  return p;
}

// ── Seed (one example profile per entity kind, so /e/* works in dev)
//
// We seed once on cold start; bindPersistentArray's seed() runs only
// when no row exists in Postgres yet.

const SEED_PROFILES: EntityProfile[] = [
  {
    slug: "apollo-vadodara",
    entityKind: "hospital",
    entityId: "apollo-vadodara",
    displayName: "Apollo Hospital — Vadodara",
    tagline: "Tertiary care, every day.",
    city: "Vadodara",
    country: "India",
    status: "published",
    sections: [
      {
        id: "sec_hero",
        type: "hero",
        visible: true,
        data: {
          headline: "World-class care, close to home.",
          subheadline: "350 beds · 24/7 emergency · 18 specialties · NABH-accredited.",
          ctaLabel: "Book a consultation",
          ctaHref: "/doctors?city=vadodara",
        },
      },
      {
        id: "sec_stats",
        type: "stats",
        visible: true,
        data: {
          tiles: [
            { label: "Years serving", value: "28" },
            { label: "Patients treated", value: "1.2M+" },
            { label: "Specialist doctors", value: "180+" },
            { label: "ICU beds", value: "48" },
          ],
        },
      },
      {
        id: "sec_specialties",
        type: "specialties",
        visible: true,
        data: {
          items: [
            "Cardiology", "Neurology", "Oncology", "Orthopaedics",
            "Pulmonology", "Nephrology", "Paediatrics", "Obstetrics",
            "ENT", "Ophthalmology", "Gastroenterology", "Endocrinology",
          ],
        },
      },
      {
        id: "sec_certifications",
        type: "certifications",
        visible: true,
        data: {
          items: ["NABH", "NABL (Lab)", "JCI affiliated", "Green OT certified"],
        },
      },
      {
        id: "sec_contact",
        type: "contact",
        visible: true,
        data: {
          address: "Apollo Road, Vadodara, Gujarat 390007, India",
          phone: "+91 265 240 0000",
          email: "info@apollovadodara.example",
          hoursLabel: "24×7 Emergency · OPD 8 AM – 8 PM",
        },
      },
      {
        id: "sec_cta",
        type: "cta",
        visible: true,
        data: {
          headline: "Need same-day care?",
          subheadline: "Book a video consult or in-clinic visit in under 30 seconds.",
          ctaLabel: "Find a doctor",
          ctaHref: "/doctors",
        },
      },
    ],
    createdAt: "2026-05-21T00:00:00.000Z",
    updatedAt: "2026-05-21T00:00:00.000Z",
  },
];
