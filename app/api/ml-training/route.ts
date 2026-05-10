// ML training data accumulator.
//
// POST → record a (input, output, ground truth) sample with consent.
//        Doctor / admin tooling calls this AFTER the AI call returns,
//        once the doctor has accepted or edited the output.
// GET ?status=&feature= → admin reviews queue
// PATCH → mark sample status (approved / rejected / exported)
// DELETE ?subjectUserId= → patient revocation (right-to-erasure)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  deleteTrainingDataForUser, listSamples, recordSample, setSampleStatus, summarize,
  TrainingFeature,
} from "@/lib/ml-training/store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FEATURES: TrainingFeature[] = ["ddx", "scribe", "ocr", "triage", "translation", "image_analysis", "rx_safety", "summarize"];

function role(session: Awaited<ReturnType<typeof getServerSession>> | null): string | undefined {
  const u = (session as { user?: { role?: string } } | null)?.user;
  return u?.role;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  return NextResponse.json({
    summary: summarize(),
    samples: listSamples({
      feature: (url.searchParams.get("feature") as TrainingFeature | null) || undefined,
      status: (url.searchParams.get("status") as "pending_review" | "approved" | "rejected" | "exported" | null) || undefined,
      limit: 200,
    }),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!FEATURES.includes(body.feature)) return NextResponse.json({ error: "invalid_feature" }, { status: 400 });
  if (body.input === undefined || body.output === undefined) {
    return NextResponse.json({ error: "missing_payload" }, { status: 400 });
  }
  // Consent gate — caller MUST pass consentGiven=true. Otherwise we
  // don't accept the sample. UI is responsible for capturing the
  // checkbox + explanatory text.
  if (!body.consentGiven) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const s = recordSample({
    contributorUserId: userId,
    contributorOrgId: body.organizationId,
    feature: body.feature,
    input: body.input,
    output: body.output,
    groundTruth: body.groundTruth,
    correctionNotes: body.correctionNotes,
  });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ sample: s });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (role(session) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  if (!body.id || !["approved", "rejected", "exported", "pending_review"].includes(body.status)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const s = setSampleStatus(String(body.id), body.status);
  if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ sample: s });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Patients delete only their own contributions; admins can purge
  // any user via ?subjectUserId=.
  const url = new URL(req.url);
  const subjectUserId = url.searchParams.get("subjectUserId") || userId;
  if (subjectUserId !== userId && role(session) !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const n = deleteTrainingDataForUser(subjectUserId);
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ deleted: n });
}
