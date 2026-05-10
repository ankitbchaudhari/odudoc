// Public read-only resolver for surgery share tokens.
//
// Anonymous — no session required. Validates token → returns the
// playable URL + minimal metadata. Audit-logs the view with IP
// against the patient as subject.

import { NextRequest, NextResponse } from "next/server";
import { redeem } from "@/lib/surgery-video/share-tokens";
import { getSession } from "@/lib/surgery-video/store";
import { clientIpFromHeaders, recordAuditEvent } from "@/lib/audit/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  const ip = clientIpFromHeaders(req.headers);
  const r = redeem(token, ip);
  if (!r.ok || !r.token) return NextResponse.json({ error: r.reason || "invalid" }, { status: 403 });

  const surg = getSession(r.token.sessionId, r.token.organizationId);
  if (!surg) return NextResponse.json({ error: "session_gone" }, { status: 404 });

  // Audit-log the public view against the patient as subject. The
  // actor is the share-token minter — patient sees on /dashboard/audit
  // who they granted access to and from what IPs the token was used.
  recordAuditEvent({
    actorUserId: r.token.mintedByUserId,
    actorEmail: r.token.mintedByEmail,
    actorRole: "patient",
    subjectUserId: surg.patientUserId,
    resource: "consultation",
    resourceId: surg.id,
    action: "view",
    ip,
    userAgent: req.headers.get("user-agent") || undefined,
    organizationId: surg.organizationId,
    reason: "share token redeem",
  });

  const playbackUrl = surg.status === "completed" ? surg.recordingUrl : surg.livePlaybackUrl;
  return NextResponse.json({
    session: {
      id: surg.id,
      status: surg.status,
      startedAt: surg.startedAt,
      endedAt: surg.endedAt,
      durationSeconds: surg.durationSeconds,
    },
    playbackUrl,
    watermark: { patientUserId: surg.patientUserId, ip, viewedAt: new Date().toISOString() },
  });
}
