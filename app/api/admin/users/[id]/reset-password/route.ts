import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resetUserPassword, reloadUsers } from "@/lib/users-store";
import { sendPasswordResetByAdminEmail } from "@/lib/email";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  await reloadUsers();
  const result = resetUserPassword(id);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await sendPasswordResetByAdminEmail({
      to: result.user.email,
      name: result.user.name,
      tempPassword: result.tempPassword,
    });
  } catch (err) {
    log.error("console.error", undefined, { args: ["[admin/users] reset-password email failed:", err] });
  }

  // Never leak the temp password in the HTTP response.
  return NextResponse.json({ ok: true });
}
