import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listSubscribers,
  removeSubscriber,
  addSubscriber,
  setSubscriberActive,
  countSubscribersAll,
} from "@/lib/subscribers-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") === "1";
  const limit = Number(searchParams.get("limit") || "500");
  return NextResponse.json({
    subscribers: listSubscribers({ activeOnly, limit }),
    counts: countSubscribersAll(),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
  const sub = addSubscriber(email, typeof body.source === "string" ? body.source : "admin");
  return NextResponse.json({ subscriber: sub }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const active = typeof body.active === "boolean" ? body.active : true;
  const sub = setSubscriberActive(id, active);
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ subscriber: sub });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = removeSubscriber(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
