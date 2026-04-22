import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listMedia, addMedia, deleteMany, type MediaType } from "@/lib/media-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// Strip the heavy dataUrl from list responses — the UI only needs it when a
// single file is opened (GET /api/admin/media/[id]).
function stripBytes<T extends { dataUrl: string }>(m: T): Omit<T, "dataUrl"> & { hasData: boolean } {
  const { dataUrl, ...rest } = m;
  return { ...rest, hasData: dataUrl.length > 0 };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") as MediaType | "all" | null;
  return NextResponse.json({
    items: listMedia({ type: type || "all" }).map(stripBytes),
  });
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";
  const mime = typeof body.mime === "string" ? body.mime : "";
  const size = typeof body.size === "number" ? body.size : 0;
  const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";
  if (!name || !dataUrl) return NextResponse.json({ error: "name and dataUrl required" }, { status: 400 });
  if (size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 10MB" }, { status: 413 });
  const item = addMedia({ name, mime, size, dataUrl });
  return NextResponse.json({ item: stripBytes(item) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
  if (!ids.length) return NextResponse.json({ error: "ids required" }, { status: 400 });
  const removed = deleteMany(ids);
  return NextResponse.json({ ok: true, removed });
}
