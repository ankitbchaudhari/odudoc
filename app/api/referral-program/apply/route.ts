// Apply a referral code. Typically called right after signup with
// a code persisted in the `odudoc_ref` cookie / localStorage value,
// but can also be invoked from the dashboard "Got a code?" form.
//
// 401 if not signed in. 200 with { ok, reason? } body otherwise —
// reasons cover invalid_code / self_referral / already_referred.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { applyReferralCode } from "@/lib/referral-program-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { code?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const code = (body.code || "").trim();
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const result = await applyReferralCode({
    refereeEmail: user.email,
    code,
    source: body.source,
  });

  // Persist before responding so a subsequent /me fetch reflects
  // the new pending row.
  if (result.ok) {
    try {
      await awaitAllFlushesStrict();
    } catch (err) {
      log.error("referral_program.apply.persist_failed", err);
      return NextResponse.json(
        { error: "Referral service is temporarily unavailable. Please retry." },
        { status: 503 }
      );
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 200 });
}
