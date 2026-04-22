// Server component wrapper for the blog index. We fetch the published posts
// on the server so crawlers receive the full post list in the initial HTML —
// a huge step up from the previous all-client version that painted an empty
// shell until the /api/blog fetch resolved.
//
// The interactive filter/search UI lives in BlogClient. If the Postgres blog
// store can't be reached (cold start, missing env), we fall through to the
// static seed posts so the page is never empty for users or bots.

import { listPosts } from "@/lib/blog-store";
import { blogPosts as seedBlogPosts, type BlogPost } from "@/lib/data";
import BlogClient from "./BlogClient";
import { ItemListLd } from "@/components/StructuredData";

// ISR: rebuild at most once every 5 minutes. Blog index is 100% public
// content so there's no per-request data — caching it saves a full blog
// store read on every page view. Admins publishing a post will see it
// after the next revalidate tick (or can hit /api/admin/blog/revalidate
// if we wire that up later).
export const revalidate = 300;

export default async function BlogIndexPage() {
  let posts: BlogPost[] = seedBlogPosts;
  try {
    const live = await listPosts({ onlyPublished: true });
    if (live && live.length) posts = live as BlogPost[];
  } catch {
    // DB unavailable — stick with the seed so the page stays alive.
  }

  // Give crawlers an ItemList of the first 12 posts to help discover them
  // from the index page even if they don't follow every link on the page.
  const listItems = posts.slice(0, 12).map((p) => ({
    name: p.title,
    url: `/blog/${p.slug}`,
  }));

  return (
    <>
      <ItemListLd name="OduDoc Blog — Latest Articles" items={listItems} />
      <BlogClient initialPosts={posts} />
    </>
  );
}
