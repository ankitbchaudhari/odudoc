// Org branding API — admin-only writes, anyone-with-org-context reads.
//
// GET ?orgId=<id> → branding for that org (public-ish — used to
//                   render org-themed surfaces).
// POST → upsert branding. Caller must be admin / staff in the org.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteBranding, getBranding, upsertBranding, MAX_ASSET_BYTES } from "@/lib/org-branding/store";
import { getOrganizationById } from "@/lib/organizations-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });
  const branding = getBranding(orgId);
  return NextResponse.json({ branding, maxAssetBytes: MAX_ASSET_BYTES });
}

function isAdminLike(role: string | undefined): boolean {
  return role === "admin" || role === "staff" || role === "doctor";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!isAdminLike(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body.organizationId) return NextResponse.json({ error: "missing_organizationId" }, { status: 400 });
  // Org must exist.
  if (!getOrganizationById(String(body.organizationId))) {
    return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  }
  const result = upsertBranding({
    organizationId: String(body.organizationId),
    logoLight: body.logoLight,
    logoDark: body.logoDark,
    favicon: body.favicon,
    primaryColor: body.primaryColor,
    accentColor: body.accentColor,
    displayName: body.displayName,
    invoiceFooter: body.invoiceFooter,
    watermarkText: body.watermarkText,
    websiteUrl: body.websiteUrl,
    updatedBy: session?.user?.email || undefined,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ branding: result.branding });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdminLike(role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  if (!orgId) return NextResponse.json({ error: "missing_orgId" }, { status: 400 });
  const ok = deleteBranding(orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
