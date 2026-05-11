// Self-service password change.
//
// Used by /auth/change-password — typically after a user logs in
// with a temporary password issued by an admin (org-admin bootstrap,
// staff bootstrap, doctor invite, etc.) and needs to set their own
// password before the 3-day TTL elapses. changeUserPassword() clears
// the mustChangePassword + tempPasswordExpiresAt flags on success,
// so the user can log in normally going forward.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changeUserPassword } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const current = (body.currentPassword || "").trim();
  const next = (body.newPassword || "").trim();
  if (!current || !next) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (next.length < 8) {
    return NextResponse.json(
      { error: "weak_password", message: "Use at least 8 characters." },
      { status: 400 },
    );
  }
  if (current === next) {
    return NextResponse.json(
      { error: "same_password", message: "New password must differ from the temporary one." },
      { status: 400 },
    );
  }
  const result = changeUserPassword(session.user.email, current, next);
  if (result === null) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (result === "wrong_current") {
    return NextResponse.json(
      { error: "wrong_current", message: "Your current (temporary) password is incorrect." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
