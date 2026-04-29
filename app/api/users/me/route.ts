// Self-read for the signed-in patient/user. Returns the public-safe
// shape — no password hash, no temp-password fields, no full
// identity-doc URL. Surfaces are the ones the patient/profile UI
// actually needs: name, email, phone, country, ABHA link state,
// medical id, identity verification status, referral wallet.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserByEmail } from "@/lib/users-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { email?: string } | undefined;
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = findUserByEmail(sessionUser.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      country: user.country,
      emailVerified: user.emailVerified,
      medicalId: user.medicalId,
      identityStatus: user.identity?.status,
      abhaId: user.abhaId,
      abhaAddress: user.abhaAddress,
      abhaLinkedAt: user.abhaLinkedAt,
      referralCode: user.referralCode,
      referralCreditCents: user.referralCreditCents || 0,
    },
  });
}
