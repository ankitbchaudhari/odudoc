// POST /api/admin/verifications/[userId]
//
// Admin approves or rejects a user's pending identity submission.
// Body: { action: "approve" } or { action: "reject", note: string }
//
// On approve: user.identity.status → "verified" and the user sees a
// green badge everywhere their ID is shown.
// On reject: status → "rejected" with the admin's note attached so the
// user knows what to fix before re-uploading.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { approveIdentity, rejectIdentity, findUserById } from "@/lib/users-store";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await getServerSession(authOptions);
  const admin = session?.user as { id?: string; role?: string } | undefined;
  if (admin?.role !== "admin" || !admin.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  const target = findUserById(userId);
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  if (target.identity?.status !== "pending") {
    return NextResponse.json(
      { error: "not_pending", message: "This submission is not in the pending queue." },
      { status: 409 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = body?.action;
  if (action === "approve") {
    const updated = approveIdentity(userId, admin.id);
    return NextResponse.json({ ok: true, status: updated?.identity?.status });
  }
  if (action === "reject") {
    const note =
      typeof body?.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : "Document could not be verified. Please re-upload a clearer photo.";
    const updated = rejectIdentity(userId, admin.id, note);
    return NextResponse.json({ ok: true, status: updated?.identity?.status });
  }
  return NextResponse.json(
    { error: "bad_action", message: "action must be 'approve' or 'reject'" },
    { status: 400 },
  );
}
