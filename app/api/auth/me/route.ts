// Lightweight "who am I" endpoint used by client components that
// need fields beyond the next-auth session token (which is
// intentionally tiny). Right now this exists so TempPasswordBanner
// can read `mustChangePassword` and `tempPasswordExpiresAt` without
// expanding the JWT.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const u = findUserByEmail(session.user.email);
  if (!u) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    mustChangePassword: !!u.mustChangePassword,
    tempPasswordExpiresAt: u.tempPasswordExpiresAt ?? null,
  });
}
