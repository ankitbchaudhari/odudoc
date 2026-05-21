// GET /api/cross-connections — V6 introspection.
//
// Returns the registered cross-connection map so the admin panel
// can render the 28-trigger diagram + handler counts. Useful for
// the V13 §1 compliance audit ("show me every action that fires
// downstream effects").

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listConnections } from "@/lib/cross-connections";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "support", "hr"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ connections: listConnections() });
}
