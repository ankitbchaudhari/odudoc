// Tele-ICU bed registry — list / create.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  createBed,
  listBedsForOrg,
  listAllBeds,
} from "@/lib/teleicu/bed-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.searchParams.get("scope") === "all") {
    return NextResponse.json({ beds: listAllBeds() });
  }
  try {
    const { orgId } = await requireOrg();
    return NextResponse.json({ beds: listBedsForOrg(orgId) });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireOrg();
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const bedLabel = String(body.bedLabel || "").trim();
    if (!bedLabel) return NextResponse.json({ error: "missing_label" }, { status: 400 });
    const bed = createBed({ organizationId: orgId, bedLabel, ward: body.ward });
    try { await awaitAllFlushesStrict(); } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ bed });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
