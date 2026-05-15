// AI credit account + usage API.
//
// GET → my account + 30-day summary + recent usage
// POST { action: "topup" | "set_auto_topup" | "consume" }
//   - "consume" is the gating call AI features make BEFORE doing
//     the work. Returns 402 with quotedRupees on insufficient.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  AI_PRICING, AiFeature, debitAiCredit, getAccount, listUsage,
  quoteCost, refundEntry, setAutoTopup, summarizeUsage, topupAccount,
  reloadAiMetering,
} from "@/lib/ai-metering/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURES: AiFeature[] = ["ddx", "scribe", "ocr", "triage", "translation", "image_analysis", "voice_transcript", "rx_safety", "summarize"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const ownerKind = (url.searchParams.get("ownerKind") || "user") as "user" | "org";
  const ownerId = ownerKind === "user" ? userId : url.searchParams.get("ownerId") || "";
  if (ownerKind === "org" && role(session) !== "admin" && role(session) !== "staff") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await reloadAiMetering();
  return NextResponse.json({
    pricing: AI_PRICING,
    account: getAccount(ownerKind, ownerId),
    summary: summarizeUsage(ownerKind, ownerId, 30),
    recent: listUsage({ ownerKind, ownerId, limit: 50 }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const action = body.action || "consume";
  const ownerKind = (body.ownerKind || "user") as "user" | "org";
  const ownerId = ownerKind === "user" ? userId : String(body.ownerId || "");
  if (!ownerId) return NextResponse.json({ error: "missing_owner" }, { status: 400 });

  if (action === "consume") {
    if (!FEATURES.includes(body.feature)) return NextResponse.json({ error: "invalid_feature" }, { status: 400 });
    // Reload first — a top-up applied on a sibling Lambda must be in
    // memory before debit checks the balance, or the call falsely
    // returns 402 insufficient_credit despite credits available.
    await reloadAiMetering();
    const r = debitAiCredit({
      ownerKind, ownerId,
      feature: body.feature,
      unitCount: Math.max(1, Number(body.unitCount) || 1),
      reference: body.reference,
      context: body.context,
    });
    if (!r.ok) {
      return NextResponse.json({
        error: r.error,
        balanceRupees: r.balanceRupees,
        quotedRupees: r.quotedRupees,
      }, { status: 402 });
    }
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ entry: r.entry, account: r.account });
  }

  if (action === "quote") {
    if (!FEATURES.includes(body.feature)) return NextResponse.json({ error: "invalid_feature" }, { status: 400 });
    return NextResponse.json({
      quotedRupees: quoteCost(body.feature, Math.max(1, Number(body.unitCount) || 1), ownerKind, ownerId),
    });
  }

  if (action === "topup") {
    const amount = Math.max(1, Number(body.amountRupees) || 0);
    if (!amount) return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
    if (ownerKind === "org" && role(session) !== "admin" && role(session) !== "staff") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await reloadAiMetering();
    const a = topupAccount({
      ownerKind, ownerId, amountRupees: amount,
      source: body.source || "ops",
      reference: body.reference,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ account: a });
  }

  if (action === "set_auto_topup") {
    if (ownerKind === "org" && role(session) !== "admin" && role(session) !== "staff") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await reloadAiMetering();
    const a = setAutoTopup({
      ownerKind, ownerId,
      enabled: !!body.enabled,
      thresholdRupees: body.thresholdRupees !== undefined ? Number(body.thresholdRupees) : undefined,
      topupAmountRupees: body.topupAmountRupees !== undefined ? Number(body.topupAmountRupees) : undefined,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ account: a });
  }

  if (action === "refund") {
    if (!body.entryId) return NextResponse.json({ error: "missing_entry" }, { status: 400 });
    if (role(session) !== "admin") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await reloadAiMetering();
    const ok = refundEntry(String(body.entryId), body.reason);
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
