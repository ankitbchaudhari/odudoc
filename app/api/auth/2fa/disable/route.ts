// POST /api/auth/2fa/disable
//
// Body: { code }
//
// Disables 2FA after a final valid TOTP verification — we require the
// second factor even to remove it, so a stolen session cookie can't
// silently strip protection. Records a high-severity accountability
// event because losing 2FA is a meaningful security state change.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { findUserById, disableUserTotp } from "@/lib/users-store";
import { parseJson, z } from "@/lib/validate";
import { recordEvent } from "@/lib/accountability-store";

export const runtime = "nodejs";

const Schema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "6-digit numeric"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const user = findUserById(session.user.id);
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "not_enabled" }, { status: 400 });
  }
  if (!verifyTotp(user.totpSecret, parsed.code)) {
    return NextResponse.json({ error: "invalid_code" }, { status: 401 });
  }

  disableUserTotp(user.id);

  await recordEvent({
    category: "system",
    action: "auth.totp.disabled",
    severity: "high",
    actorEmail: user.email,
    actorRole: user.role,
    actorId: user.id,
    subjectKind: "user",
    subjectId: user.id,
    summary: "2FA TOTP disabled",
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
