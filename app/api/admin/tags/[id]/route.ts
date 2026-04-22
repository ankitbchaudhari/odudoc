import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateTag, deleteTag } from "@/lib/tags-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const tag = updateTag(id, {
      name: typeof body.name === "string" ? body.name : undefined,
      slug: typeof body.slug === "string" ? body.slug : undefined,
      color: typeof body.color === "string" ? body.color : undefined,
      productCount: typeof body.productCount === "number" ? body.productCount : undefined,
    });
    if (!tag) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ tag });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const ok = deleteTag(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
