// GET /api/admin/verifications
//
// Admin-only: list all users with a pending identity-verification
// submission. Returns the admin-visible document URL so the reviewer
// can open it in a new tab and eyeball name/photo/DOB.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPendingVerifications } from "@/lib/users-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const pending = listPendingVerifications();
  return NextResponse.json({ pending });
}
