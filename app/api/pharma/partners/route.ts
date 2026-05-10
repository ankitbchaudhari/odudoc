// Pharma authorized-partner registry API.
//
// GET ?orgId= → list (pharma sees own roster)
// POST       → create / update (pharma admin)
// DELETE ?id=&orgId= → remove
// PUT (verify) → public-ish: doctor verifies a vendor before purchase

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createPartner, deletePartner, listPartners, updatePartner, verifyPartner, PartnerKind,
} from "@/lib/pharma/partners-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: PartnerKind[] = ["distributor", "retailer", "stockist", "agent"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");
  const kind = url.searchParams.get("kind") as PartnerKind | null;
  const query = url.searchParams.get("query") || undefined;
  return NextResponse.json({
    partners: listPartners({
      organizationId: orgId || undefined,
      kind: kind && KINDS.includes(kind) ? kind : undefined,
      query,
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create";

  if (action === "create") {
    if (!body.organizationId || !KINDS.includes(body.kind) || !body.legalName || !body.address || !body.city || !body.state || !body.countryIso2) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const p = createPartner({
      organizationId: String(body.organizationId),
      kind: body.kind,
      legalName: String(body.legalName),
      tradeName: body.tradeName,
      gstin: body.gstin,
      drugLicense: body.drugLicense,
      address: String(body.address),
      city: String(body.city),
      state: String(body.state),
      countryIso2: String(body.countryIso2),
      pincode: body.pincode,
      lat: body.lat !== undefined ? Number(body.lat) : undefined,
      lng: body.lng !== undefined ? Number(body.lng) : undefined,
      contactName: body.contactName,
      contactPhone: body.contactPhone,
      contactEmail: body.contactEmail,
      authorizedBrands: Array.isArray(body.authorizedBrands) ? body.authorizedBrands : undefined,
      validUntil: body.validUntil,
      notes: body.notes,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ partner: p });
  }

  if (action === "update") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const p = updatePartner(String(body.id), String(body.organizationId), body.patch || {});
    if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ partner: p });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

/** Public verification endpoint — doctors / pharmacists hit this
 *  before purchasing. Returns status + (limited) partner record;
 *  the full address is exposed because that's the verification
 *  point, but we deliberately omit contactPhone/contactEmail. */
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.identifier) return NextResponse.json({ error: "missing_identifier" }, { status: 400 });
  const r = verifyPartner({ identifier: String(body.identifier), brandName: body.brandName });
  if (!r.partner) return NextResponse.json({ status: r.status });
  const safe = {
    id: r.partner.id,
    legalName: r.partner.legalName,
    tradeName: r.partner.tradeName,
    kind: r.partner.kind,
    address: r.partner.address,
    city: r.partner.city,
    state: r.partner.state,
    countryIso2: r.partner.countryIso2,
    pincode: r.partner.pincode,
    lat: r.partner.lat,
    lng: r.partner.lng,
    authorizedBrands: r.partner.authorizedBrands,
    validUntil: r.partner.validUntil,
    active: r.partner.active,
  };
  return NextResponse.json({ status: r.status, partner: safe });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const ok = deletePartner(id, orgId);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ ok: true });
}
