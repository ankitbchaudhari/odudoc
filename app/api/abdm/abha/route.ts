// ABHA linking — list + start + verify + revoke.
//
// Two-step ceremony:
//   POST { action: "start", mobile, abhaAddress? } → { txnId, mockOtp? }
//   POST { action: "verify", txnId, otp }          → completed link
//   GET                                              → list
//   DELETE ?id=...                                   → revoke

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listLinksForUser,
  startLink,
  completeLink,
  revokeLink,
} from "@/lib/abdm/abha-store";
import { createAbhaByMobile, verifyAbhaOtp } from "@/lib/abdm/mock-nha";
import { recordConsent } from "@/lib/consent-vault-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ links: listLinksForUser(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const action = String(body.action || "");

  if (action === "start") {
    const mobile = String(body.mobile || "").trim();
    const abhaAddress = body.abhaAddress ? String(body.abhaAddress).trim() : undefined;
    if (!mobile) return NextResponse.json({ error: "missing_mobile" }, { status: 400 });
    const r = await createAbhaByMobile(mobile, abhaAddress);
    // Pre-create an unverified link so the patient sees it in the
    // pending state; verify will swap status.
    const link = startLink({
      userId,
      dependentId: body.dependentId,
      abhaNumber: "pending",
      abhaAddress: abhaAddress || `pending-${r.txnId.slice(-6)}@abdm`,
      kycSource: "mobile",
      status: "unverified",
      note: `txnId:${r.txnId}`,
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ link, txnId: r.txnId, mockOtp: r.mockOtp });
  }

  if (action === "verify") {
    const txnId = String(body.txnId || "").trim();
    const otp = String(body.otp || "").trim();
    const linkId = String(body.linkId || "").trim();
    if (!txnId || !otp || !linkId) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }
    const v = await verifyAbhaOtp(txnId, otp);
    if (!v.ok || !v.abhaNumber || !v.abhaAddress || !v.healthIdToken) {
      return NextResponse.json({ error: v.error || "verify_failed" }, { status: 400 });
    }
    const completed = completeLink(linkId, v.healthIdToken, "mobile");
    if (!completed) return NextResponse.json({ error: "link_not_found" }, { status: 404 });
    completed.abhaNumber = v.abhaNumber;
    completed.abhaAddress = v.abhaAddress;
    // Mirror into the unified consent vault — every ABHA link is
    // also a long-running consent grant for ABDM PHR push.
    recordConsent({
      userId,
      purpose: "abdm_phr_push",
      purposeStatement: `Allow OduDoc to register your encounters as discoverable care contexts in your ABDM Personal Health Record (${completed.abhaAddress}).`,
      recipientKind: "platform",
      recipientId: "abdm",
      recipientName: "Ayushman Bharat Digital Mission",
      dataCategories: ["encounter_records", "prescriptions", "lab_reports", "discharge_summaries"],
      lawfulBasis: "consent",
    });
    try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
    return NextResponse.json({ link: completed });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const r = revokeLink(id, userId);
  if (!r) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
  return NextResponse.json({ link: r });
}
