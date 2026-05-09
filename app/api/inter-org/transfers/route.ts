// Inter-org patient & records transfers.
//
// GET  → list inbound + outbound transfers for the active org. Query
//        params: ?direction=inbound|outbound|any  ?status=open|...
// POST → create a new transfer to a connected partner org.

import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError } from "@/lib/tenant";
import {
  listTransfers,
  createTransfer,
  reloadTransfers,
  type TransferType,
  type TransferUrgency,
  type TransferItem,
  type TransferStatus,
} from "@/lib/inter-org-transfers-store";
import {
  areConnected,
  findConnection,
  reloadConnections,
} from "@/lib/inter-org-network-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { recordAudit } from "@/lib/audit-log-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES: TransferType[] = ["patient_transfer", "records_share", "referral"];
const ALLOWED_URGENCY: TransferUrgency[] = ["routine", "urgent", "emergency"];

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    await reloadTransfers();
    const url = new URL(req.url);
    const direction = (url.searchParams.get("direction") || "any") as
      | "inbound" | "outbound" | "any";
    const status = url.searchParams.get("status") as TransferStatus | "open" | null;
    const xs = listTransfers({
      orgId,
      direction,
      status: status || undefined,
    });
    // Expand the partner side so the UI can show the org name without
    // a second roundtrip.
    const expanded = xs.map((t) => {
      const isOutbound = t.fromOrgId === orgId;
      const partnerId = isOutbound ? t.toOrgId : t.fromOrgId;
      const partner = getOrganizationById(partnerId);
      return {
        ...t,
        direction: isOutbound ? "outbound" as const : "inbound" as const,
        partner: partner
          ? { id: partner.id, name: partner.name, slug: partner.slug }
          : { id: partnerId, name: "(unknown)", slug: "" },
      };
    });
    return NextResponse.json({ transfers: expanded });
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
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const userEmail = session?.user?.email;
    if (!userId || !userEmail) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    // Anyone with a clinical or admin role can initiate a transfer.
    // Patients obviously cannot. Super-admins always can.
    if (
      !ctx.isSuperAdmin &&
      ctx.membership &&
      !["owner", "admin", "doctor", "nurse", "receptionist"].includes(ctx.membership.role)
    ) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const toOrgId = String(body.toOrgId || "").trim();
    const patientId = String(body.patientId || "").trim();
    const patientName = String(body.patientName || "").trim();
    const type = String(body.type || "") as TransferType;
    const reason = String(body.reason || "").trim();
    const urgency = (String(body.urgency || "routine") as TransferUrgency);
    const items = Array.isArray(body.items) ? (body.items as TransferItem[]) : [];
    const consent = body.patientConsent || {};

    if (!toOrgId || !patientId || !patientName || !reason) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
    if (!ALLOWED_URGENCY.includes(urgency)) {
      return NextResponse.json({ error: "invalid_urgency" }, { status: 400 });
    }
    if (toOrgId === orgId) {
      return NextResponse.json({ error: "cannot_transfer_to_self" }, { status: 400 });
    }

    // Trust check — orgs must be connected before transferring patient
    // data. Super-admins bypass for break-glass / cross-org migrations.
    await reloadConnections();
    if (!ctx.isSuperAdmin && !areConnected(orgId, toOrgId)) {
      return NextResponse.json({ error: "orgs_not_connected" }, { status: 403 });
    }

    // Consent gate: routine + urgent transfers require captured consent;
    // emergencies allow break-glass with a reason. The audit log will
    // make break-glass events very visible.
    const granted = Boolean(consent.granted);
    const method = String(consent.method || "");
    if (urgency !== "emergency" && !granted) {
      return NextResponse.json({ error: "consent_required" }, { status: 400 });
    }
    if (method === "break_glass" && !consent.breakGlassReason) {
      return NextResponse.json({ error: "break_glass_reason_required" }, { status: 400 });
    }

    // Snapshot the configured revenue split from the connection. We
    // only attach the kickback to *referral* transfers — patient
    // transfers and pure records-shares don't have a billable encounter
    // at the receiver to split. The receiver can override later by
    // recording a 0 gross.
    const conn = findConnection(orgId, toOrgId);
    const referralSplitPct =
      type === "referral" && conn?.revenueSplitPct ? conn.revenueSplitPct : 0;

    const transfer = createTransfer({
      fromOrgId: orgId,
      toOrgId,
      patientId,
      patientName,
      type,
      urgency,
      reason,
      items,
      referralSplitPct,
      patientConsent: {
        granted,
        method: method ? (method as NonNullable<typeof transfer.patientConsent.method>) : undefined,
        capturedAt: consent.capturedAt || new Date().toISOString(),
        capturedBy: userId,
        breakGlassReason: consent.breakGlassReason,
      },
      requestedByUserId: userId,
      requestedByEmail: userEmail,
    });

    const fromOrg = getOrganizationById(orgId);
    const toOrg = getOrganizationById(toOrgId);
    recordAudit({
      actorEmail: userEmail,
      action: "transfer.create",
      orgId,
      orgName: fromOrg?.name,
      summary: `${type} → "${toOrg?.name || toOrgId}" for ${patientName} (${urgency})`,
      meta: {
        transferId: transfer.id,
        partnerId: toOrgId,
        type,
        urgency,
        itemCount: items.length,
        consentMethod: method,
        breakGlass: method === "break_glass",
      },
    });

    try {
      await awaitAllFlushesStrict();
    } catch {
      return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
    }
    return NextResponse.json({ transfer });
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
