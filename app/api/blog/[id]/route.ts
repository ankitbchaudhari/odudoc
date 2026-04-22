import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getPostById,
  getPostBySlug,
  updatePost,
  deletePost,
  type BlogStatus,
} from "@/lib/blog-store";

export const runtime = "nodejs";

function canManage(role: string | undefined): boolean {
  return role === "admin";
}

// GET /api/blog/[id]
//   - `id` accepts either an id or a slug so the public [slug] page can
//     fetch a single post by slug without an extra round trip.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const post = (await getPostById(id)) || (await getPostBySlug(id));
  if (!post) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Don't leak drafts to the public.
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (post.status === "Draft" && !canManage(role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ post });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patch: Parameters<typeof updatePost>[1] = {};
  if (typeof body.title === "string") patch.title = body.title;
  if (typeof body.slug === "string") patch.slug = body.slug;
  if (typeof body.excerpt === "string") patch.excerpt = body.excerpt;
  if (typeof body.content === "string") patch.content = body.content;
  if (typeof body.author === "string") patch.author = body.author;
  if (typeof body.authorBio === "string") patch.authorBio = body.authorBio;
  if (typeof body.authorInitials === "string")
    patch.authorInitials = body.authorInitials;
  if (typeof body.category === "string") patch.category = body.category;
  if (typeof body.readTime === "string") patch.readTime = body.readTime;
  if (typeof body.featured === "boolean") patch.featured = body.featured;
  if (body.status === "Published" || body.status === "Draft")
    patch.status = body.status as BlogStatus;
  if (Array.isArray(body.tags)) patch.tags = body.tags.filter((t) => typeof t === "string");
  else if (typeof body.tags === "string")
    patch.tags = body.tags.split(",").map((t) => t.trim()).filter(Boolean);

  const post = await updatePost(id, patch);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const ok = await deletePost(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
