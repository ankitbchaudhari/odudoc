// Surgery video API.
//
// Hospital admin / lead surgeon creates + lifecycles a session.
// Authorized viewers (patient, lead surgeon, listed observers) can
// fetch the playback URL.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  authorizeAndLogView, cancelSession, createSession, endSession, isConfigured,
  listForOrg, listForPatient, startSession, activeProvider,
} from "@/lib/surgery-video/store";
import { clientIpFromHeaders } from "@/lib/audit/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const userId = (session?.user as { id?: string } | undefined)?.id || "unknown";
    const s = authorizeAndLogView({
      id, viewerUserId: userId, viewerEmail: session?.user?.email || undefined,
      ip: clientIpFromHeaders(req.headers),
    });
    if (!s) return NextResponse.json({ error: "forbidden_or_not_found" }, { status: 403 });
    return NextResponse.json({ session: s, configured: isConfigured(), provider: activeProvider() });
  }
  const orgId = url.searchParams.get("orgId");
  const patientUserId = url.searchParams.get("patientUserId");
  if (orgId) {
    if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ sessions: listForOrg(orgId, { limit: 50 }), configured: isConfigured() });
  }
  if (patientUserId) {
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (userId !== patientUserId && role(session) !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    return NextResponse.json({ sessions: listForPatient(patientUserId) });
  }
  return NextResponse.json({ error: "missing_query" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff" && role(session) !== "doctor") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!isConfigured()) {
    return NextResponse.json({
      error: "video_provider_not_configured",
      hint: "Set VIDEO_PROVIDER + VIDEO_INGEST_URL + VIDEO_API_KEY in env to enable.",
    }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const action = body.action || "create";

  if (action === "create") {
    if (!body.organizationId || !body.consentRecordId || !body.patientUserId || !body.leadSurgeonEmail) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const s = createSession({
      organizationId: String(body.organizationId),
      surgeryId: body.surgeryId,
      consentRecordId: String(body.consentRecordId),
      patientUserId: String(body.patientUserId),
      leadSurgeonEmail: String(body.leadSurgeonEmail),
      observerEmails: Array.isArray(body.observerEmails) ? body.observerEmails : [],
      livePlaybackUrl: body.livePlaybackUrl,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ session: s });
  }

  if (action === "start") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const s = startSession(String(body.id), String(body.organizationId), body.livePlaybackUrl);
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ session: s });
  }
  if (action === "end") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const s = endSession(String(body.id), String(body.organizationId), {
      recordingUrl: body.recordingUrl,
      durationSeconds: body.durationSeconds !== undefined ? Number(body.durationSeconds) : undefined,
      bytes: body.bytes !== undefined ? Number(body.bytes) : undefined,
      notes: body.notes,
    });
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ session: s });
  }
  if (action === "cancel") {
    if (!body.id || !body.organizationId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    const s = cancelSession(String(body.id), String(body.organizationId));
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ session: s });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
