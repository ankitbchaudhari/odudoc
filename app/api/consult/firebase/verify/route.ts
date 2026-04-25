// Exchange a Firebase Phone-Auth ID token for our in-house consultToken.
//
// The client runs signInWithPhoneNumber() → confirmation.confirm(code),
// getting a Firebase ID token whose `phone_number` claim has been
// verified by Google's SMS infra. We re-verify the token on the server
// with the Admin SDK (to block spoofed tokens), then mint the same
// short-lived consultToken the existing rooms/bookings endpoints already
// know how to consume.

import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, isAdminConfigured } from "@/lib/firebase-admin";
import { mintConsultToken, toE164 } from "@/lib/consult-otp";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Token-exchange endpoint — cheap to abuse, expensive to leave open.
  const blocked = await enforceRateLimit(req, "consult-firebase-verify", 15, "1 m");
  if (blocked) return blocked;

  let body: { idToken?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken = (body.idToken || "").trim();
  const firstName = (body.firstName || "").trim();
  const lastName = (body.lastName || "").trim();

  if (!idToken) {
    return NextResponse.json({ error: "idToken is required" }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required" },
      { status: 400 },
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "Phone verification is not configured on the server." },
      { status: 503 },
    );
  }

  let phone = "";
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    // Firebase sets the phone on the `phone_number` claim for Phone Auth
    // sign-ins; older tokens use `phoneNumber` — accept either.
    const claims = decoded as unknown as {
      phone_number?: string;
      phoneNumber?: string;
      firebase?: { sign_in_provider?: string };
    };
    phone = claims.phone_number || claims.phoneNumber || "";
    if (!phone) {
      return NextResponse.json(
        { error: "The Firebase token does not carry a verified phone number." },
        { status: 400 },
      );
    }
    if (claims.firebase?.sign_in_provider !== "phone") {
      return NextResponse.json(
        { error: "Only phone-auth tokens are accepted here." },
        { status: 400 },
      );
    }
  } catch (err) {
    log.warn("consult.firebase.verify_failed", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Invalid or expired verification token." },
      { status: 401 },
    );
  }

  const e164 = toE164(phone);
  const { token } = mintConsultToken({ firstName, lastName, phone: e164 });

  return NextResponse.json({
    ok: true,
    consultToken: token,
    firstName,
    lastName,
    phone: e164,
  });
}
