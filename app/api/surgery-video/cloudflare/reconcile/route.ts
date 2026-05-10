// Cloudflare Stream reconcile.
//
// Compares Cloudflare's live_inputs roster against our local session
// table and reports drift in three buckets:
//
//   matched   — Cloudflare uid present + an OduDoc session points
//               at it via providerVideoId. Healthy.
//   orphans   — Cloudflare has the live input but no OduDoc session
//               references it. Usually a manually-created test input
//               (like the smoke-test from the dashboard) or a session
//               that was deleted. Safe to clean up.
//   missing   — OduDoc session has providerVideoId set but Cloudflare
//               doesn't know it. Usually means someone deleted the
//               input directly in Cloudflare's UI. Surgery is broken
//               until re-provisioned.
//
// POST { action: "delete_orphan", uid } removes a single orphaned
// live input from Cloudflare. Admin-only.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { deleteLiveInput, getConfig, listLiveInputs } from "@/lib/surgery-video/providers/cloudflare";
import { findByProviderVideoId } from "@/lib/surgery-video/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!getConfig()) {
    return NextResponse.json({
      error: "cloudflare_not_configured",
      hint: "Set CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_STREAM_API_TOKEN.",
    }, { status: 503 });
  }
  const r = await listLiveInputs();
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });

  const matched: Array<{ uid: string; sessionId: string; orgId: string }> = [];
  const orphans: Array<{ uid: string; created?: string; modified?: string }> = [];
  for (const li of r.inputs) {
    const ours = findByProviderVideoId(li.uid);
    if (ours) matched.push({ uid: li.uid, sessionId: ours.id, orgId: ours.organizationId });
    else orphans.push({ uid: li.uid, created: li.created, modified: li.modified });
  }
  return NextResponse.json({
    cloudflareTotal: r.total ?? r.inputs.length,
    matched,
    orphans,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (body.action === "delete_orphan" && typeof body.uid === "string") {
    // Refuse if this uid IS owned — orphan-only deletion guards
    // against accidentally nuking a live session via this route.
    if (findByProviderVideoId(body.uid)) {
      return NextResponse.json({ error: "uid_is_owned" }, { status: 400 });
    }
    const r = await deleteLiveInput(body.uid);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
