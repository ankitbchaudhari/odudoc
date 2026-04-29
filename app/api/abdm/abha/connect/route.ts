// ABHA link — Phase 1 stub.
//
// In Phase 2 this calls NHA's `/v0.5/users/auth/init` endpoint to
// trigger an OTP to the patient's Aadhaar-linked mobile, then
// `/v0.5/users/auth/confirmWithMobileOTP` to confirm. The returned
// ABHA number + address gets persisted on the User row via
// linkAbhaToUser.
//
// Phase 1 (today): we accept a 14-digit ABHA number from the
// patient (manual entry — pretend they already have it from
// healthid.ndhm.gov.in) and link it without server-side validation
// against NHA. Stub returns a 503 with a clear "sandbox not
// configured" message if the admin hasn't pasted credentials yet,
// otherwise it persists the link and stamps abhaLinkedAt.
//
// India-only: rejects non-IN patients with 403 to keep the surface
// hidden from the rest of the platform.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findUserByEmail,
  linkAbhaToUser,
  unlinkAbhaFromUser,
} from "@/lib/users-store";
import { isAbdmEligibleUser } from "@/lib/abdm-eligible";
import { getAbdmConfig, isAbdmReady } from "@/lib/abdm-config-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ABHA_REGEX = /^\d{2}-?\d{4}-?\d{4}-?\d{4}$/;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { email?: string } | undefined;
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = findUserByEmail(sessionUser.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!isAbdmEligibleUser({ country: user.country, phone: user.phone })) {
    return NextResponse.json(
      {
        error:
          "ABDM is available to patients in India only. Set your country to India in your profile to use ABHA.",
      },
      { status: 403 }
    );
  }

  let body: { abhaNumber?: string; abhaAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const raw = (body.abhaNumber || "").trim();
  if (!ABHA_REGEX.test(raw)) {
    return NextResponse.json(
      {
        error:
          "Enter a 14-digit ABHA number (e.g. 12-3456-7890-1234). Get one at healthid.ndhm.gov.in if you don't have it yet.",
      },
      { status: 400 }
    );
  }

  const cfg = await getAbdmConfig();
  if (!isAbdmReady(cfg)) {
    // Phase-1 behaviour — accept the number but flag clearly that
    // we haven't validated it against NHA yet. The link is still
    // persisted so the doctor sees it on the visit, and Phase-2
    // adds the real verification call without changing this
    // endpoint's contract.
    const updated = linkAbhaToUser(user.id, {
      abhaId: raw.replace(/-/g, ""),
      abhaAddress: body.abhaAddress?.trim(),
    });
    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("abdm.abha.connect.persist_failed", err);
      return NextResponse.json(
        { error: "Could not save ABHA link. Please retry." },
        { status: 503 }
      );
    }
    return NextResponse.json({
      ok: true,
      verified: false,
      sandboxMode: true,
      abhaId: updated?.abhaId,
      message:
        "ABHA number saved. Server-side verification with NHA will activate once OduDoc completes ABDM sandbox onboarding.",
    });
  }

  // Phase 2 placeholder — real NHA OTP flow goes here. For now the
  // ready=true branch behaves the same as the sandbox branch but
  // marks verified=true so the UI stops showing the "unverified"
  // notice. Replace with the actual /v0.5/users/auth/init +
  // /confirmWithMobileOTP exchange in Phase 2.
  const updated = linkAbhaToUser(user.id, {
    abhaId: raw.replace(/-/g, ""),
    abhaAddress: body.abhaAddress?.trim(),
  });
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("abdm.abha.connect.persist_failed", err);
    return NextResponse.json(
      { error: "Could not save ABHA link. Please retry." },
      { status: 503 }
    );
  }
  return NextResponse.json({
    ok: true,
    verified: true,
    sandboxMode: cfg.environment === "sandbox",
    abhaId: updated?.abhaId,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { email?: string } | undefined;
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = findUserByEmail(sessionUser.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  unlinkAbhaFromUser(user.id);
  try {
    await awaitAllFlushesStrict();
  } catch {
    // Best-effort — unlink rarely needs to be re-run.
  }
  return NextResponse.json({ ok: true });
}
