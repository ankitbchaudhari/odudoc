// POST /api/profile/password
//
// Self-service password change for the signed-in user. Used by the
// "Change Password" card on /profile. Validates the current password
// against the stored bcrypt hash, then writes a fresh hash for the
// new one. Rejects mismatched confirmations and weak passwords
// before hitting the store.
//
// Works for any role (patient, doctor, admin) — the gate is the
// session, not the role.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changeUserPassword } from "@/lib/users-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIN_LENGTH = 8;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json(
      { error: "You must be signed in to change your password." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const current = typeof body.current === "string" ? body.current : "";
  const newPass = typeof body.newPass === "string" ? body.newPass : "";
  const confirm = typeof body.confirm === "string" ? body.confirm : "";

  if (!current || !newPass || !confirm) {
    return NextResponse.json(
      { error: "All three fields are required." },
      { status: 400 },
    );
  }
  if (newPass !== confirm) {
    return NextResponse.json(
      { error: "New password and confirmation do not match." },
      { status: 400 },
    );
  }
  if (newPass.length < MIN_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (newPass === current) {
    return NextResponse.json(
      { error: "New password must be different from the current one." },
      { status: 400 },
    );
  }

  const result = changeUserPassword(email, current, newPass);
  if (result === null) {
    log.error("profile.password.user_not_found", null, { email });
    return NextResponse.json(
      { error: "Account not found — please sign out and back in." },
      { status: 404 },
    );
  }
  if (result === "wrong_current") {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("profile.password.persist_failed", err, { email });
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
