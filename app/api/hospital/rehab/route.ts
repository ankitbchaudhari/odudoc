import { NextRequest, NextResponse } from "next/server";
import { requireOrg, TenantError, requireActiveBilling } from "@/lib/tenant";
import { audit } from "@/lib/audit";
import {
  listEpisodes, createEpisode, updateEpisode, deleteEpisode,
  listSessions, createSession, updateSession, deleteSession,
  computeStats,
  type EpisodeStatus, type RehabDiscipline, type EpisodeCategory, type SessionStatus,
} from "@/lib/hospital/rehab-store";

import { parseJson, z } from "@/lib/validate";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function handleError(e: unknown) {
  if (e instanceof TenantError) return NextResponse.json({ error: e.message }, { status: e.status });
  return NextResponse.json({ error: "internal" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const { orgId } = await requireOrg();
    const { searchParams } = new URL(req.url);
    return NextResponse.json({
      episodes: listEpisodes({
        organizationId: orgId,
        status: (searchParams.get("episodeStatus") as EpisodeStatus) || undefined,
        discipline: (searchParams.get("discipline") as RehabDiscipline) || undefined,
        category: (searchParams.get("category") as EpisodeCategory) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      sessions: listSessions({
        organizationId: orgId,
        episodeId: searchParams.get("episodeId") || undefined,
        status: (searchParams.get("sessionStatus") as SessionStatus) || undefined,
        patientId: searchParams.get("patientId") || undefined,
      }),
      stats: computeStats(orgId),
    });
  } catch (e) { return handleError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "create", entityType: "rehab", module: "rehab" });
    const __parsed_1 = await parseJson(req, z.any());
    if (__parsed_1 instanceof NextResponse) return __parsed_1;
    const body: any = __parsed_1;
    if (body.kind === "session") {
      const r = createSession(orgId, body);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      return NextResponse.json({ session: r.record });
    }
    const r = createEpisode(orgId, body);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ episode: r.record });
  } catch (e) { return handleError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "update", entityType: "rehab", module: "rehab" });
    const __parsed_2 = await parseJson(req, z.any());
    if (__parsed_2 instanceof NextResponse) return __parsed_2;
    const body: any = __parsed_2;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    if (body.kind === "session") {
      const s = updateSession(String(body.id), orgId, body);
      if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
      return NextResponse.json({ session: s });
    }
    const e = updateEpisode(String(body.id), orgId, body);
    if (!e) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ episode: e });
  } catch (e) { return handleError(e); }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx, orgId } = await requireActiveBilling(req);
    audit(ctx, { action: "delete", entityType: "rehab", module: "rehab" });
    const __parsed_3 = await parseJson(req, z.any());
    if (__parsed_3 instanceof NextResponse) return __parsed_3;
    const body: any = __parsed_3;
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const ok = body.kind === "session"
      ? deleteSession(String(body.id), orgId)
      : deleteEpisode(String(body.id), orgId);
    return NextResponse.json({ ok });
  } catch (e) { return handleError(e); }
}
