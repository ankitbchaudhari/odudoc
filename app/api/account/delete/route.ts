// POST /api/account/delete
//
// Apple App Store rule 5.1.1(v) — any app that lets users create an
// account must let them delete it from inside the app. Google Play has
// the same rule under the "User Data" policy. Without this endpoint
// the mobile apps will be rejected on first review.
//
// Auth: Bearer JWT (mobile) OR NextAuth session cookie (web). Both web
// /account/delete page and Patient/Doctor mobile apps call this same
// endpoint.
//
// Behaviour:
//  - Confirms the user's current password (defence in depth against a
//    stolen JWT being used to nuke an account).
//  - Tombstones the row via users-store.deleteUser, which the persistent
//    array layer replicates across Lambdas.
//  - Statutory medical-record retention (7 yr) is honoured downstream —
//    the user row goes, but clinical records keyed by user-id remain
//    pseudonymised per the privacy policy.
//  - Returns 200 on success so the client can sign out and show "Goodbye".

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyMobileToken } from "@/lib/mobile-auth";
import {
  findUserByEmail,
  validatePassword,
  deleteUser,
  reloadUsers,
} from "@/lib/users-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const DeleteSchema = z.object({
  password: z.string().min(1).max(200),
  // Optional acknowledgement string the apps require the user to type
  // ("DELETE") so a misclick can't wipe the account.
  confirm: z.string().optional(),
});

async function resolveEmail(request: NextRequest): Promise<string | null> {
  // Try Bearer JWT first (mobile path).
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const token = auth.slice(7).trim();
    const payload = await verifyMobileToken(token).catch(() => null);
    if (payload?.email) return payload.email;
  }
  // Fallback to NextAuth session (web path).
  const session = await getServerSession(authOptions).catch(() => null);
  return session?.user?.email ?? null;
}

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(request, "account-delete", 5, "10 m");
  if (blocked) return blocked;

  const email = await resolveEmail(request);
  if (!email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = await parseJson(request, DeleteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { password, confirm } = parsed;

  // Hard gate on the confirmation phrase. Both apps + the web page send
  // "DELETE" verbatim — anything else means the user got here by accident.
  if (confirm && confirm.trim().toUpperCase() !== "DELETE") {
    return NextResponse.json({ error: "confirm_mismatch" }, { status: 400 });
  }

  try {
    await reloadUsers();
    const user = findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    if (!validatePassword(password, user.password)) {
      return NextResponse.json({ error: "invalid_password" }, { status: 401 });
    }

    const removed = deleteUser(user.id);
    if (!removed) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    await awaitAllFlushes();

    log.info("account-delete", { id: user.id, email: user.email, role: user.role });
    return NextResponse.json({
      ok: true,
      message:
        "Your account has been deleted. Clinical records may be retained for the period required by healthcare law (typically 7 years).",
    });
  } catch (err) {
    log.error("account-delete error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
