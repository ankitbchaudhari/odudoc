// Admin CRUD for site-wide special offers.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getOffers,
  addOffer,
  updateOffer,
  deleteOffer,
} from "@/lib/offers-store";

export const runtime = "nodejs";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  return user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({ offers: getOffers() });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.title || !body.discountValue || !body.discountType) {
      return NextResponse.json(
        { error: "title, discountType and discountValue are required" },
        { status: 400 }
      );
    }
    const offer = addOffer({
      title: String(body.title),
      bannerText: body.bannerText ? String(body.bannerText) : undefined,
      discountType: body.discountType === "fixed" ? "fixed" : "percentage",
      discountValue: Number(body.discountValue) || 0,
      minOrder: Number(body.minOrder) || 0,
      kind: ["site", "consult", "shop"].includes(body.kind) ? body.kind : "site",
      startsAt: body.startsAt || "",
      endsAt: body.endsAt || "",
      active: body.active !== false,
      autoApply: body.autoApply !== false,
    });
    return NextResponse.json({ offer }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const updated = updateOffer(body.id, body);
    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ offer: updated });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const ok = deleteOffer(id);
  if (!ok) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
