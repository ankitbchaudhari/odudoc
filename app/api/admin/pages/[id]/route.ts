import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPageById,
  updatePage,
  deletePage,
  type PageStatus,
} from "@/lib/pages-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const page = getPageById(id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Parameters<typeof updatePage>[1] = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.slug === "string") patch.slug = body.slug;
  if (body.status === "Published" || body.status === "Draft")
    patch.status = body.status as PageStatus;
  if (typeof body.author === "string") patch.author = body.author;
  if (typeof body.content === "string") patch.content = body.content;
  if (typeof body.seoDescription === "string")
    patch.seoDescription = body.seoDescription;
  if (typeof body.isCustom === "boolean") patch.isCustom = body.isCustom;

  try {
    const page = updatePage(id, patch);
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ok = deletePage(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
