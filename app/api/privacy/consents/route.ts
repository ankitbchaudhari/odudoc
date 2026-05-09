// Privacy / consent vault — list every consent the user has issued.
//
// GET → list, sorted newest-first.
// POST → not exposed publicly. Consents are recorded by feature
//        owners (passport, marketing opt-in, etc.) via internal
//        helpers; we don't let arbitrary client code mint a grant.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listConsentsForUser } from "@/lib/consent-vault-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const list = listConsentsForUser(userId);
  return NextResponse.json({ consents: list });
}
