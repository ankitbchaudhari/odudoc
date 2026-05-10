// Org mini-website API. GET ?slug= public; GET ?orgId= admin;
// POST upserts (admin within org).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteSiteForOrg, getSiteByOrg, getSiteBySlug, upsertSite } from "@/lib/org-website/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const orgId = url.searchParams.get("orgId");
  if (slug) {
    const site = getSiteBySlug(slug);
    if (!site) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ site });
  }
  if (orgId) {
    const site = getSiteByOrg(orgId);
    return NextResponse.json({ site });
  }
  return NextResponse.json({ error: "missing_fields" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.organizationId || !body.slug) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const r = upsertSite({
    organizationId: String(body.organizationId),
    slug: String(body.slug),
    about: body.about,
    tagline: body.tagline,
    heroImageUrl: body.heroImageUrl,
    services: Array.isArray(body.services) ? body.services : undefined,
    team: Array.isArray(body.team) ? body.team : undefined,
    gallery: Array.isArray(body.gallery) ? body.gallery : undefined,
    contactBlock: body.contactBlock,
    enableBooking: body.enableBooking,
    showVacancies: body.showVacancies,
    showCourses: body.showCourses,
    published: body.published,
  });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ site: r.site });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deleteSiteForOrg(orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
