import { listPosts } from "@/lib/blog-store";

// RSS 2.0 feed for the OduDoc blog. Consumed by Feedly, readers, social
// syndicators, and — surprisingly often — LLMs scraping for fresh content.
// Cached for 10 minutes to stay cheap under scraping load.

export const runtime = "nodejs";
export const revalidate = 600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  let posts: Awaited<ReturnType<typeof listPosts>> = [];
  try {
    posts = await listPosts({ onlyPublished: true });
  } catch {
    // Blog table may not exist yet on a fresh deploy; serve an empty but
    // valid feed rather than 500'ing.
    posts = [];
  }

  const items = posts
    .slice(0, 50)
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const pubDate = p.updatedAt ? new Date(p.updatedAt).toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>noreply@odudoc.com (${esc(p.author)})</author>
      <category>${esc(p.category)}</category>
      <description>${cdata(p.excerpt)}</description>
      <content:encoded>${cdata(p.content)}</content:encoded>
    </item>`;
    })
    .join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OduDoc Health &amp; Clinical Guides</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>Evidence-based health articles, telemedicine insights, and clinic-software how-tos from the OduDoc editorial team.</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
