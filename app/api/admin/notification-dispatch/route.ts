// /api/admin/notification-dispatch
//   GET  — list pending dispatch rows.
//   POST — { action: "tick" } runs the dispatcher one tick.
//
// Different from /api/admin/notifications which surfaces user-facing
// admin alerts. This one is the policy-layer escalation queue from
// lib/notifications/dispatch-queue.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPending, tick } from "@/lib/notifications/dispatch-queue";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ pending: listPending() });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  if (body.action === "tick") {
    const result = tick();
    return NextResponse.json({ ok: true, ...result });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
