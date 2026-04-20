import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  GALLERY_CATEGORIES,
} from "@/lib/gallery-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") || undefined;
  return NextResponse.json({
    items: listGallery({ category }),
    categories: GALLERY_CATEGORIES,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { title, description, category, color, imageUrl } = body as Record<string, unknown>;
  if (typeof title !== "string" || !title.trim())
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  if (typeof category !== "string" || !category.trim())
    return NextResponse.json({ error: "Category required" }, { status: 400 });

  const item = createGalleryItem({
    title,
    description: typeof description === "string" ? description : "",
    category,
    color: typeof color === "string" ? color : undefined,
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object")
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  const { id, ...patch } = body as Record<string, unknown>;
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
  const item = updateGalleryItem(id, {
    title: typeof patch.title === "string" ? patch.title : undefined,
    description: typeof patch.description === "string" ? patch.description : undefined,
    category: typeof patch.category === "string" ? patch.category : undefined,
    color: typeof patch.color === "string" ? patch.color : undefined,
    imageUrl: typeof patch.imageUrl === "string" ? patch.imageUrl : undefined,
  });
  return item
    ? NextResponse.json({ item })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteGalleryItem(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
