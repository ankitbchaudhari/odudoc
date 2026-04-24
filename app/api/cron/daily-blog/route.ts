// Daily cron: generate one AI-written health article and save it as a Draft
// for admin review. Runs at 05:30 UTC (11:00 IST) so by the time the admin
// opens their laptop, a fresh article is waiting in /admin/blog.
//
// Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET
// is set in project env vars. We also allow access if CRON_SECRET is not
// configured (dev convenience).

import { NextResponse } from "next/server";
import { generateBlogArticle } from "@/lib/ai-blog-generator";
import { createPost, pruneOldPosts } from "@/lib/blog-store";
import { sendEmail } from "@/lib/email";
import { addAdminNotification } from "@/lib/admin-notifications-store";

import { log } from "@/lib/log";
const SITE_URL = "https://www.odudoc.com";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  return header === `Bearer ${secret}`;
}

function initials(name: string): string {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1) Prune posts older than 15 days so the blog stays fresh.
    let prunedCount = 0;
    try {
      const pruned = await pruneOldPosts(15);
      prunedCount = pruned.length;
    } catch (pruneErr) {
      log.error("cron.daily_blog.prune_failed", pruneErr);
    }

    // 2) Generate a new article and auto-publish it.
    const article = await generateBlogArticle();

    const post = await createPost({
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      author: article.author,
      authorBio: `${article.author} contributes health articles for OduDoc.`,
      authorInitials: initials(article.author),
      category: article.category,
      tags: article.tags,
      // Don't auto-feature. If every cron post is featured, the /blog grid
      // filters them all out and shows "No articles found". The admin can
      // promote a specific post via /admin/blog when they want to feature it.
      featured: false,
      status: "Published", // auto-approved — runs every 6 hours
    });

    // In-app notification for the admin bell.
    try {
      addAdminNotification({
        type: "blog_published",
        title: "New blog post published",
        body: post.title,
        link: "/admin/blog",
      });
    } catch (err) {
      log.error("cron.daily_blog.admin_notification_failed", err);
    }

    // Notify admin so they know something's waiting for review.
    const adminEmail = process.env.ADMIN_EMAIL || "admin@odudoc.com";
    try {
      await sendEmail({
        from: "notifications",
        to: adminEmail,
        subject: `New AI blog post published: ${post.title}`,
        html: `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111827;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <table width="100%" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden;" cellpadding="0" cellspacing="0">
              <tr><td style="background:#0E7490;padding:18px 24px;color:#fff;font-weight:700;font-size:18px;">OduDoc Admin</td></tr>
              <tr><td style="padding:28px;">
                <h1 style="margin:0 0 12px 0;font-size:20px;">A new blog draft is ready</h1>
                <p style="margin:0 0 8px 0;font-size:15px;"><strong>${post.title}</strong></p>
                <p style="margin:0 0 12px 0;color:#6b7280;font-size:13px;">${post.excerpt}</p>
                <p style="margin:0 0 12px 0;color:#6b7280;font-size:13px;">Category: ${post.category} · Strategy: ${article.topicStrategy}${article.linkedSpecialty ? ` · Linked to: ${article.linkedSpecialty}` : ""}</p>
                <p style="margin:24px 0 0 0;">
                  <a href="${SITE_URL}/admin/blog" style="display:inline-block;background:#0E7490;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">Review &amp; publish</a>
                </p>
                <p style="margin:16px 0 0 0;color:#9ca3af;font-size:12px;">Article saved as Draft — it will not appear on the public blog until you publish it.</p>
              </td></tr>
            </table>
          </td></tr></table></body></html>`,
      });
    } catch (mailErr) {
      // Don't fail the cron if email fails — the draft is safely saved.
      log.error("cron.daily_blog.admin_email_failed", mailErr);
    }

    return NextResponse.json({
      ok: true,
      prunedCount,
      post: {
        id: post.id,
        slug: post.slug,
        title: post.title,
        status: post.status,
        category: post.category,
        strategy: article.topicStrategy,
        linkedSpecialty: article.linkedSpecialty ?? null,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    log.error("cron.daily_blog.failed", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
