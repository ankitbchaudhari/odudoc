// DELETE /api/share-tokens/[token] — revoke a share before expiry.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revokeShareToken } from "@/lib/share-token-store";

export const runtime = "nodejs";

export async function DELETE(_request: NextRequest, { params }: { params: { token: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = revokeShareToken(params.token, session.user.email);
  if (!t) return NextResponse.json({ error: "Token not found or already revoked" }, { status: 404 });
  return NextResponse.json({ token: t });
}
