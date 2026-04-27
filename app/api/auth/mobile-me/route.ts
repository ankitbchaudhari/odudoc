// /api/auth/mobile-me
//
// GET   — validate Bearer JWT and return the current user record. Apps call
//         this on launch to decide whether to show login or go straight to
//         home. Also a cheap liveness check for the token.
// PATCH — update the caller's own user record. Whitelisted to name + phone;
//         email/role/password have dedicated flows.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import {
  findUserByEmail,
  reloadUsers,
  updateUserSelf,
} from "@/lib/users-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";
import { awaitAllFlushes } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function publicShape(user: ReturnType<typeof findUserByEmail>) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    emailVerified: user.emailVerified,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  await reloadUsers();
  const user = findUserByEmail(auth.email);
  if (!user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  if (user.status === "banned") {
    return NextResponse.json({ error: "account_banned" }, { status: 403 });
  }

  return NextResponse.json({ user: publicShape(user) });
}

const PatchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(32).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  const blocked = await enforceRateLimit(request, "mobile-me-patch", 30, "1 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;
  const patch = parsed;

  try {
    await reloadUsers();
    const before = findUserByEmail(auth.email);
    if (!before) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    if (before.status === "banned") {
      return NextResponse.json({ error: "account_banned" }, { status: 403 });
    }

    const updated = updateUserSelf(auth.email, patch);
    if (!updated) {
      return NextResponse.json({ error: "user_not_found" }, { status: 404 });
    }
    await awaitAllFlushes();
    return NextResponse.json({ user: publicShape(updated) });
  } catch (err) {
    log.error("mobile-me PATCH error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
