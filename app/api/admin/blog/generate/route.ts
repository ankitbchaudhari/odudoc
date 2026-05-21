// Admin manual trigger for AI article generation. Called from the "Generate
// with AI" button on /admin/blog. Saves the result as Draft so it shows up
// in the same review queue as the daily cron-generated articles.
//
// Accepts optional JSON body { topic?, category?, strategy? } to override
// the auto-picked topic — handy when you want an article on a specific theme.
//
// Auth (V14 audit fix): admin / support only. Without this gate the
// endpoint was anonymously callable — anyone could burn LLM tokens
// + spawn draft posts.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateBlogArticle, type GenerateOptions } from "@/lib/ai-blog-generator";
import { createPost } from "@/lib/blog-store";

import { log } from "@/lib/log";
function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }
  const role = (session.user as { role?: string }).role;
  if (!["admin", "support"].includes(role || "")) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: GenerateOptions = {};
  try {
    body = (await req.json()) as GenerateOptions;
  } catch {
    // empty body is fine
  }

  try {
    const article = await generateBlogArticle(body);
    const post = await createPost({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      author: article.author,
      authorBio: `${article.author} contributes health articles for OduDoc.`,
      authorInitials: initials(article.author),
      category: article.category,
      tags: article.tags,
      featured: true,
      status: "Draft",
    });
    return NextResponse.json({
      ok: true,
      post,
      meta: {
        strategy: article.topicStrategy,
        linkedSpecialty: article.linkedSpecialty ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    log.error("admin.blog.generate_failed", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
