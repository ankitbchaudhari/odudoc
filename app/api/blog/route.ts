import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPosts, createPost, type BlogStatus } from "@/lib/blog-store";
import { notifySubscribersOfNewPost } from "@/lib/blog-notifications";
import { log } from "@/lib/log";

export const runtime = "nodejs";

function canManage(role: string | undefined): boolean {
  return role === "admin";
}

// GET /api/blog
//   - admins: everything (optionally filtered by ?status=Draft|Published, ?search=)
//   - everyone else: only published posts (public /blog page consumes this)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;

    const search = req.nextUrl.searchParams.get("search") || undefined;
    const statusParam = req.nextUrl.searchParams.get("status") as
      | BlogStatus
      | "All"
      | null;
    const view = req.nextUrl.searchParams.get("view"); // "all" forces admin view

    const onlyPublished = !(view === "all" && canManage(role));
    const posts = await listPosts({
      search,
      status: onlyPublished ? undefined : statusParam || undefined,
      onlyPublished,
    });
    return NextResponse.json({ posts });
  } catch (err) {
    // Always return valid JSON — a bare 500 with empty body breaks the
    // admin client which does `await res.json()` before checking res.ok.
    log.error("blog.list_failed", err);
    return NextResponse.json(
      { posts: [], error: err instanceof Error ? err.message : "Failed to load posts" },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!canManage(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    slug?: string;
    excerpt?: string;
    content?: string;
    author?: string;
    authorBio?: string;
    authorInitials?: string;
    category?: string;
    tags?: string[] | string;
    readTime?: string;
    featured?: boolean;
    status?: BlogStatus;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (!body.category?.trim()) {
    return NextResponse.json({ error: "Category is required" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags
    : typeof body.tags === "string"
      ? body.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const post = await createPost({
    title: body.title,
    slug: body.slug,
    excerpt: (body.excerpt || "").trim() || body.title.slice(0, 160),
    content: body.content,
    author: body.author || "OduDoc Admin",
    authorBio: body.authorBio,
    authorInitials: body.authorInitials,
    category: body.category,
    tags,
    readTime: body.readTime,
    featured: body.featured,
    status: body.status,
  });

  // Newsletter blast on publish. Drafts don't trigger — admin only sees
  // the email go out once the post actually flips to Published. Best-
  // effort: failures are logged but don't fail the publish call. The
  // notify helper has its own dedupe so a republish doesn't re-blast.
  if (post.status === "Published") {
    try {
      const sent = await notifySubscribersOfNewPost({
        id: post.id,
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        category: post.category,
        author: post.author,
        imageUrl: post.imageUrl,
      });
      if (sent > 0) log.info("blog.notify.sent", { postId: post.id, recipients: sent });
    } catch (err) {
      log.error("blog.notify.publish_hook_failed", err, { postId: post.id });
    }
  }

  return NextResponse.json({ post }, { status: 201 });
}
