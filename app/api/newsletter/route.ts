import { NextRequest, NextResponse } from "next/server";
import { addSubscriber } from "@/lib/subscribers-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const source = typeof body.source === "string" ? body.source : "footer";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  const sub = addSubscriber(email, source);
  return NextResponse.json({ ok: true, subscriber: sub }, { status: 201 });
}
