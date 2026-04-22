import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listComments, setApproval, removeComment } from "@/lib/comments-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ comments: listComments() });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "id and approved required" }, { status: 400 });
  }
  const c = setApproval(body.id, body.approved);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ comment: c });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = removeComment(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
