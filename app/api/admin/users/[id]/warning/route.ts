import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addWarning, reloadUsers } from "@/lib/users-store";
import { sendAccountWarningEmail } from "@/lib/email";

import { log } from "@/lib/log";
export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    );
  }

  await reloadUsers();
  const u = addWarning(id, message);
  if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await sendAccountWarningEmail({ to: u.email, name: u.name, message });
  } catch (err) {
    log.error("console.error", undefined, { args: ["[admin/users] warning email failed:", err] });
  }

  return NextResponse.json({ ok: true });
}
