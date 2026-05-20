// Newsletter blast triggered when a blog post becomes Published.
//
// Called from POST /api/blog (when status === "Published") and from
// PATCH /api/blog/[id] (when status flips Draft → Published). Best-effort —
// failures are logged but never block the publish itself, so the admin's
// "Publish" click never reports an error because Resend hiccupped.
//
// Dedupe: each post has at most one broadcast. We store sent post IDs in
// the persistent `blog_notify_log` row so a republish or a Lambda restart
// doesn't re-blast subscribers. Idempotent per postId.

import { listSubscribers } from "./subscribers-store";
import { sendEmail } from "./email";
import { sql, ensureSchema } from "./db";
import { log } from "./log";
import {
  BRAND_COLORS,
  emailHeaderHtml,
  emailFooterHtml,
  emailCtaButton,
} from "./email-brand";

const SITE_URL = process.env.NEXTAUTH_URL?.trim().replace(/\/$/, "") || "https://www.odudoc.com";

interface NotifiablePost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  imageUrl?: string;
}

async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS blog_notify_log (
      post_id TEXT PRIMARY KEY,
      notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      recipients INT NOT NULL DEFAULT 0
    )
  `;
}

async function ready(): Promise<void> {
  await ensureSchema(initSchema);
}

async function alreadyNotified(postId: string): Promise<boolean> {
  await ready();
  const rows = (await sql`SELECT 1 FROM blog_notify_log WHERE post_id = ${postId} LIMIT 1`) as unknown as unknown[];
  return rows.length > 0;
}

async function recordNotified(postId: string, recipients: number): Promise<void> {
  await ready();
  await sql`
    INSERT INTO blog_notify_log (post_id, recipients)
    VALUES (${postId}, ${recipients})
    ON CONFLICT (post_id) DO NOTHING
  `;
}

function escape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function postEmailHtml(post: NotifiablePost): string {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const unsubUrl = `${SITE_URL}/unsubscribe`;
  const cover = post.imageUrl
    ? `<img src="${escape(post.imageUrl)}" alt="" style="width:100%;height:auto;display:block;border-radius:10px;margin:0 0 16px 0;" />`
    : "";
  // Header + footer come from lib/email-brand so the blog newsletter
  // looks identical to consultation / verification / referral emails —
  // emerald-to-teal gradient + white cross icon + OduDoc wordmark.
  // Migrated off the bespoke blue-600 (#2563eb) header so the brand
  // doesn't shift between message types.
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:${BRAND_COLORS.page};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${BRAND_COLORS.ink};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${BRAND_COLORS.card};border-radius:12px;overflow:hidden;">
        ${emailHeaderHtml()}
        <tr><td style="padding:28px 28px 8px 28px;">
          <p style="margin:0 0 6px 0;font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND_COLORS.footerInk};">New on the OduDoc blog &middot; ${escape(post.category)}</p>
          <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;">${escape(post.title)}</h1>
          ${cover}
          <p style="margin:0 0 18px 0;color:${BRAND_COLORS.inkMuted};font-size:15px;line-height:1.6;">${escape(post.excerpt)}</p>
          <p style="margin:0 0 18px 0;">${emailCtaButton("Read the full post", url)}</p>
          <p style="margin:18px 0 0 0;font-size:13px;color:${BRAND_COLORS.footerInk};">By ${escape(post.author)} &middot; <a href="${escape(url)}" style="color:${BRAND_COLORS.teal};text-decoration:none;">${escape(url)}</a></p>
        </td></tr>
        <tr><td style="padding:18px 28px 24px 28px;border-top:1px solid ${BRAND_COLORS.border};">
          <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
            You're receiving this because you signed up for OduDoc.
            <a href="${escape(unsubUrl)}" style="color:#9ca3af;">Unsubscribe</a>
          </p>
        </td></tr>
        ${emailFooterHtml()}
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Email every active subscriber about a freshly published post. Returns
 *  the number of recipients we attempted, or 0 if the broadcast was
 *  skipped (already notified, no subscribers, etc.). */
export async function notifySubscribersOfNewPost(post: NotifiablePost): Promise<number> {
  try {
    if (await alreadyNotified(post.id)) return 0;

    const subs = listSubscribers({ activeOnly: true });
    const recipients = subs.map((s) => s.email);
    if (recipients.length === 0) {
      // Record the (empty) notification anyway so a future subscriber-add
      // followed by a republish doesn't fan out an old post.
      await recordNotified(post.id, 0);
      return 0;
    }

    const subject = `New on OduDoc: ${post.title}`;
    const html = postEmailHtml(post);

    // Resend handles up to 50 recipients per call. We BCC-style fan out
    // by passing an array — same pattern the manual broadcast uses.
    const BATCH = 50;
    let attempted = 0;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const chunk = recipients.slice(i, i + BATCH);
      const r = await sendEmail({ from: "promotion", to: chunk, subject, html });
      if (r.ok || r.skipped) attempted += chunk.length;
      else log.error("blog.notify.batch_failed", undefined, { error: r.error, postId: post.id });
    }
    await recordNotified(post.id, attempted);
    return attempted;
  } catch (err) {
    log.error("blog.notify.failed", err, { postId: post.id });
    return 0;
  }
}
