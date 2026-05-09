// Bed availability live feed.
//
// GET  → snapshot for the active org PLUS every connected partner,
//        merged with org metadata so the UI can render a city/region
//        list with bed counts.
// POST → upsert the active org's snapshot. Caller must be admin/owner
//        or have one of the operational roles (receptionist, nurse).

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  getBedSnapshot,
  listBedSnapshots,
  upsertBedSnapshot,
  reloadBedSnapshots,
  type BedCategory,
} from "@/lib/inter-org-beds-store";
import {
  listConnectedPartnerIds,
  reloadConnections,
} from "@/lib/inter-org-network-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_CATEGORIES: BedCategory[] = [
  "icu", "hdu", "ventilator", "general", "private",
  "maternity", "nicu", "paediatric", "emergency",
  "isolation", "post_op",
];

export async function GET() {
  try {
    const { orgId } = await requireOrg();
    await Promise.all([reloadConnections(), reloadBedSnapshots()]);
    const partnerIds = [orgId, ...listConnectedPartnerIds(orgId)];
    const snapshots = listBedSnapshots(partnerIds);
    const out = partnerIds.map((oid) => {
      const org = getOrganizationById(oid);
      const snap = snapshots.find((s) => s.organizationId === oid);
      const totalAvailable = snap
        ? Object.values(snap.available).reduce<number>((a, n) => a + (n || 0), 0)
        : 0;
      const totalCapacity = snap
        ? Object.values(snap.capacity).reduce<number>((a, n) => a + (n || 0), 0)
        : 0;
      return {
        orgId: oid,
        orgName: org?.name || "(unknown)",
        country: org?.country,
        capacity: snap?.capacity || {},
        available: snap?.available || {},
        totalAvailable,
        totalCapacity,
        staffShortage: snap?.staffShortage || false,
        notice: snap?.notice,
        updatedAt: snap?.updatedAt,
        isSelf: oid === orgId,
        // Stale = no update in 24h. Operationally important — a stale
        // feed is misleading, hospitals should be encouraged to refresh
        // at least daily.
        stale: snap
          ? Date.now() - new Date(snap.updatedAt).getTime() > 24 * 60 * 60 * 1000
          : true,
      };
    });
    return NextResponse.json({ feed: out });
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
      !["owner", "admin", "nurse", "receptionist"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const capacity: Partial<Record<BedCategory, number>> = {};
    const available: Partial<Record<BedCategory, number>> = {};
    if (body.capacity && typeof body.capacity === "object") {
      for (const cat of ALLOWED_CATEGORIES) {
        const v = (body.capacity as Record<string, unknown>)[cat];
        if (typeof v === "number" && v >= 0) capacity[cat] = Math.floor(v);
      }
    }
    if (body.available && typeof body.available === "object") {
      for (const cat of ALLOWED_CATEGORIES) {
        const v = (body.available as Record<string, unknown>)[cat];
        if (typeof v === "number" && v >= 0) available[cat] = Math.floor(v);
      }
    }

    const session = await getServerSession(authOptions);
    const snap = upsertBedSnapshot({
      organizationId: orgId,
      capacity,
      available,
      staffShortage: Boolean(body.staffShortage),
      notice: body.notice ? String(body.notice).slice(0, 500) : undefined,
      updatedByUserId: session?.user?.id,
      updatedByEmail: session?.user?.email || undefined,
    });
    recordAudit({
      actorEmail: session?.user?.email || "system",
      action: "org.update",
      orgId,
      orgName: getOrganizationById(orgId)?.name,
      summary: "Updated bed availability snapshot",
      meta: { totalAvailable: Object.values(snap.available).reduce<number>((a, n) => a + (n || 0), 0) },
    });
    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ snapshot: snap });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

// Helper for the UI — current org's snapshot for prefilling the form.
export async function PATCH() {
  try {
    const { orgId } = await requireOrg();
    const snap = getBedSnapshot(orgId);
    return NextResponse.json({ snapshot: snap });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
