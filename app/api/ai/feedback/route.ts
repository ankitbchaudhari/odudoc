// AI feedback ingestion — every accept/reject/edit on an AI surface
// posts here. Foundation for a future re-ranker.
//
// POST /api/ai/feedback  body: { surface, suggestion, verdict, ... }
// GET  /api/ai/feedback?since=2026-04-01  → aggregated stats (admin only)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  recordAiFeedback,
  getFeedbackStats,
  type AiFeedbackSurface,
  type AiFeedbackVerdict,
} from "@/lib/ai-feedback-store";
import { invalidateRerankerCache } from "@/lib/ai-reranker";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const SURFACES: AiFeedbackSurface[] = [
  "ai-prescription.diagnosis",
  "ai-prescription.treatment",
  "ai-emr.summary",
  "ai-drug-check",
  "ai-scribe",
  "ai-blog-generator",
  "other",
];
const VERDICTS: AiFeedbackVerdict[] = ["accepted", "edited", "rejected", "ignored"];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    surface?: string;
    suggestion?: string;
    verdict?: string;
    note?: string;
    patientRef?: string;
    contextHash?: string;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const surface = (body.surface || "other") as AiFeedbackSurface;
  if (!SURFACES.includes(surface)) {
    return NextResponse.json({ error: "invalid surface" }, { status: 400 });
  }
  const verdict = body.verdict as AiFeedbackVerdict | undefined;
  if (!verdict || !VERDICTS.includes(verdict)) {
    return NextResponse.json(
      { error: `verdict must be one of ${VERDICTS.join(", ")}` },
      { status: 400 },
    );
  }
  if (!body.suggestion || typeof body.suggestion !== "string") {
    return NextResponse.json({ error: "suggestion is required" }, { status: 400 });
  }

  const row = await recordAiFeedback({
    surface,
    callerEmail: user.email,
    patientRef: body.patientRef,
    contextHash: body.contextHash,
    suggestion: body.suggestion,
    verdict,
    note: body.note,
    model: body.model,
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("ai.feedback.persist_failed", err);
    // Non-critical — feedback is advisory data.
  }
  // New row → next rerank should reflect it. Pure in-memory bump,
  // safe even if the persist fails.
  invalidateRerankerCache();

  return NextResponse.json({ ok: true, id: row.id });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  const since = req.nextUrl.searchParams.get("since") || undefined;
  const stats = await getFeedbackStats({ since });
  return NextResponse.json(stats);
}
