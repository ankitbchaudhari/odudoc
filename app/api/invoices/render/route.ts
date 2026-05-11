// Render-ready invoice payload.
//
// GET ?id=&orgId=&intraState=1 → resolved invoice with branding +
// tax breakdown for the print page. Audit-logs the view against the
// patient as subject so they see who looked.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildInvoiceRender } from "@/lib/invoice-render/build";
import { clientIpFromHeaders, recordAuditEvent } from "@/lib/audit/store";
import { buildReportWatermark } from "@/lib/report-watermark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const orgId = url.searchParams.get("orgId");
  if (!id || !orgId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  const render = buildInvoiceRender({
    invoiceId: id,
    organizationId: orgId,
    intraStateInIndia: url.searchParams.get("intraState") === "1",
  });
  if (!render) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Audit: every view is recorded against the patient as subject.
  const userId = (session?.user as { id?: string } | undefined)?.id;
  recordAuditEvent({
    actorUserId: userId || "unknown",
    actorEmail: session?.user?.email || undefined,
    actorRole: ((session?.user as { role?: string } | undefined)?.role as "patient" | "doctor" | "admin" | "staff" | undefined),
    subjectUserId: render.invoice.patientId,
    resource: "consultation",
    resourceId: render.invoice.id,
    action: "view",
    ip: clientIpFromHeaders(req.headers),
    userAgent: req.headers.get("user-agent") || undefined,
    organizationId: orgId,
  });

  // Watermark hint mirrors what /api/documents returns — print page
  // renders identical diagonal text encoding userId · ip · time.
  // denyDownload is true when a corporate role views the report; UI
  // must hide download buttons. Per Spec §13: only patients can
  // download their own reports.
  const actorRole = (session?.user as { role?: string } | undefined)?.role;
  const wm = buildReportWatermark({
    patientUserId: render.invoice.patientId,
    req,
    actorRole,
  });
  return NextResponse.json({
    render,
    watermark: wm.data,
    denyDownload: wm.denyDownload,
  });
}
