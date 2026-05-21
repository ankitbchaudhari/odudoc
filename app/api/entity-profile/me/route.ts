// /api/entity-profile/me
//
// GET — return the signed-in entity's own profile (or null if they
//       haven't created one yet).
// PUT — upsert the profile (sections, status, hero, logo, tagline…).
//
// Authorisation: any signed-in user can own an entity profile
// (doctors get a doctor profile, vendors/manufacturers get manufacturer
// profiles, etc.). Super admin can edit any profile through a separate
// admin endpoint (not in this commit).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getProfileById,
  upsertProfile,
  type EntityKind,
  type ProfileSection,
} from "@/lib/entity-profile-store";
import { parseJson, z } from "@/lib/validate";
import { recordEvent } from "@/lib/accountability-store";

export const runtime = "nodejs";

function entityKindForRole(role: string | undefined): EntityKind {
  switch (role) {
    case "doctor":     return "doctor";
    case "pharmacist": return "pharmacy";
    case "vendor":     return "manufacturer";
    case "staff":      return "hospital";
    default:           return "doctor"; // patients don't get a public profile; default doctor for now
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const entityId = session.user.id || session.user.email;
  const profile = await getProfileById(entityId);
  return NextResponse.json({ profile });
}

const SectionSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum([
    "hero", "about", "services", "team", "contact", "stats", "testimonials",
    "gallery", "certifications", "products", "pricing", "facilities",
    "specialties", "insurance_panel", "research", "education", "press",
    "faq", "video", "cta",
  ]),
  visible: z.boolean(),
  data: z.record(z.string(), z.unknown()),
});

const Schema = z.object({
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, "lowercase, dashes only"),
  displayName: z.string().min(1).max(200),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().url().max(500).optional(),
  heroImageUrl: z.string().url().max(500).optional(),
  city: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  status: z.enum(["draft", "published"]),
  sections: z.array(SectionSchema).max(40),
});

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const kind = entityKindForRole(session.user.role);
  const entityId = session.user.id || session.user.email;

  const profile = await upsertProfile({
    entityKind: kind,
    entityId,
    slug: parsed.slug,
    displayName: parsed.displayName,
    tagline: parsed.tagline,
    logoUrl: parsed.logoUrl,
    heroImageUrl: parsed.heroImageUrl,
    city: parsed.city,
    country: parsed.country,
    status: parsed.status,
    sections: parsed.sections as ProfileSection[],
  });

  await recordEvent({
    category: "admin",
    action: "entity_profile.updated",
    actorEmail: session.user.email,
    actorRole: session.user.role,
    subjectKind: "entity_profile",
    subjectId: profile.slug,
    summary: `Entity profile ${profile.slug} ${parsed.status === "published" ? "published" : "saved as draft"}.`,
    after: { sectionsCount: parsed.sections.length, status: parsed.status },
  }).catch(() => {/* ignore */});

  return NextResponse.json({ profile });
}
