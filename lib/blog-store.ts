// Postgres-backed blog store.
//
// Schema is lazy-initialised on first call and seeded from the static
// `blogPosts` in lib/data.ts so the public /blog page never goes empty.
// All functions are async — callers must `await`.
//
// Table: blog_posts
//   id                TEXT PRIMARY KEY
//   slug              TEXT UNIQUE NOT NULL
//   title             TEXT NOT NULL
//   excerpt           TEXT NOT NULL
//   content           TEXT NOT NULL
//   author            TEXT NOT NULL
//   author_bio        TEXT NOT NULL
//   author_initials   TEXT NOT NULL
//   category          TEXT NOT NULL
//   tags              TEXT[] NOT NULL DEFAULT '{}'
//   date              TEXT NOT NULL       -- display-formatted, e.g. "Apr 19, 2026"
//   read_time         TEXT NOT NULL
//   featured          BOOLEAN NOT NULL DEFAULT false
//   status            TEXT NOT NULL DEFAULT 'Published'
//   created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
//   updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()

import { sql, ensureSchema } from "./db";
import { blogPosts as seedPosts, type BlogPost } from "./data";
import { pickBlogImage } from "./blog-images";

export type BlogStatus = "Published" | "Draft";

export interface AdminBlogPost extends BlogPost {
  status: BlogStatus;
  updatedAt: string;
  createdAt: string;
}

interface Row {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  author_bio: string;
  author_initials: string;
  category: string;
  tags: string[] | null;
  date: string;
  read_time: string;
  featured: boolean;
  status: string;
  image_url: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

function rowToPost(r: Row): AdminBlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt,
    content: r.content,
    author: r.author,
    authorBio: r.author_bio,
    authorInitials: r.author_initials,
    category: r.category,
    tags: Array.isArray(r.tags) ? r.tags : [],
    date: r.date,
    readTime: r.read_time,
    featured: !!r.featured,
    imageUrl: r.image_url || undefined,
    status: (r.status === "Draft" ? "Draft" : "Published") as BlogStatus,
    createdAt: typeof r.created_at === "string" ? r.created_at : r.created_at.toISOString(),
    updatedAt: typeof r.updated_at === "string" ? r.updated_at : r.updated_at.toISOString(),
  };
}

async function initSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_bio TEXT NOT NULL,
      author_initials TEXT NOT NULL,
      category TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      date TEXT NOT NULL,
      read_time TEXT NOT NULL,
      featured BOOLEAN NOT NULL DEFAULT false,
      status TEXT NOT NULL DEFAULT 'Published',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts (status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts (created_at DESC)`;
  // Added later — cover image URL. ALTER is idempotent thanks to IF NOT EXISTS.
  await sql`ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS image_url TEXT`;
  // Backfill any existing posts without an image using the curated pool.
  const missing = (await sql`SELECT id, slug, category FROM blog_posts WHERE image_url IS NULL OR image_url = ''`) as Array<{
    id: string;
    slug: string;
    category: string;
  }>;
  for (const p of missing) {
    const url = pickBlogImage(p.category, p.slug);
    await sql`UPDATE blog_posts SET image_url = ${url} WHERE id = ${p.id}`;
  }

  // One-time cleanup: drop the demo posts (ids "1".."6") that shipped with
  // the initial seed. Safe to re-run — only removes known legacy IDs.
  await sql`DELETE FROM blog_posts WHERE id IN ('1','2','3','4','5','6')`;

  // Seed from static data if empty. We only seed once — after the admin
  // deletes a seed post, it stays deleted.
  const existing = (await sql`SELECT COUNT(*)::int AS n FROM blog_posts`) as Array<{ n: number }>;
  if (existing[0]?.n === 0) {
    for (const p of seedPosts) {
      await sql`
        INSERT INTO blog_posts
          (id, slug, title, excerpt, content, author, author_bio, author_initials,
           category, tags, date, read_time, featured, status)
        VALUES
          (${p.id}, ${p.slug}, ${p.title}, ${p.excerpt}, ${p.content}, ${p.author},
           ${(p as BlogPost & { authorBio?: string }).authorBio ?? "OduDoc contributor."},
           ${p.authorInitials}, ${p.category}, ${p.tags},
           ${p.date}, ${p.readTime}, ${p.featured}, 'Published')
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
}

async function ready(): Promise<void> {
  await ensureSchema(initSchema);
}

// Cheap count — used by dashboard to avoid SELECTing every row just to
// call posts.length. Stays under the Neon free-tier data transfer cap.
export async function countPosts(onlyPublished = false): Promise<number> {
  await ready();
  const rows = onlyPublished
    ? ((await sql`SELECT COUNT(*)::int AS n FROM blog_posts WHERE status = 'Published'`) as Array<{ n: number }>)
    : ((await sql`SELECT COUNT(*)::int AS n FROM blog_posts`) as Array<{ n: number }>);
  return rows[0]?.n ?? 0;
}

export async function listPosts(opts: {
  status?: BlogStatus | "All";
  search?: string;
  onlyPublished?: boolean;
} = {}): Promise<AdminBlogPost[]> {
  await ready();
  const rows = (await sql`
    SELECT * FROM blog_posts
    ORDER BY created_at DESC
  `) as Row[];
  let list = rows.map(rowToPost);
  if (opts.onlyPublished) list = list.filter((p) => p.status === "Published");
  if (opts.status && opts.status !== "All") {
    list = list.filter((p) => p.status === opts.status);
  }
  if (opts.search) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return list;
}

export async function getPostById(id: string): Promise<AdminBlogPost | null> {
  await ready();
  const rows = (await sql`SELECT * FROM blog_posts WHERE id = ${id} LIMIT 1`) as Row[];
  return rows[0] ? rowToPost(rows[0]) : null;
}

export async function getPostBySlug(slug: string): Promise<AdminBlogPost | null> {
  await ready();
  const rows = (await sql`SELECT * FROM blog_posts WHERE slug = ${slug} LIMIT 1`) as Row[];
  return rows[0] ? rowToPost(rows[0]) : null;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base || `post-${Date.now()}`;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const rows = (await sql`
      SELECT 1 FROM blog_posts WHERE slug = ${slug} AND id <> ${ignoreId ?? ""} LIMIT 1
    `) as unknown[];
    if (rows.length === 0) return slug;
    slug = `${base}-${n++}`;
  }
}

export interface BlogPostInput {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  author: string;
  authorBio?: string;
  authorInitials?: string;
  category: string;
  tags?: string[];
  readTime?: string;
  featured?: boolean;
  status?: BlogStatus;
}

function initialsFromName(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function createPost(input: BlogPostInput): Promise<AdminBlogPost> {
  await ready();
  const baseSlug = input.slug?.trim() ? slugify(input.slug) : slugify(input.title);
  const slug = await uniqueSlug(baseSlug);
  const id = `post-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const tags = (input.tags || []).map((t) => t.trim()).filter(Boolean);
  const author = input.author.trim() || "OduDoc Team";
  const authorInitials =
    input.authorInitials?.trim().slice(0, 2).toUpperCase() ||
    initialsFromName(author);
  const authorBio = input.authorBio?.trim() || "OduDoc contributor.";
  const readTime = input.readTime?.trim() || estimateReadTime(input.content);
  const date = formatDate(new Date());
  const status: BlogStatus = input.status || "Published";
  const imageUrl = pickBlogImage(input.category, slug);

  await sql`
    INSERT INTO blog_posts
      (id, slug, title, excerpt, content, author, author_bio, author_initials,
       category, tags, date, read_time, featured, status, image_url)
    VALUES
      (${id}, ${slug}, ${input.title.trim()}, ${input.excerpt.trim()},
       ${input.content}, ${author}, ${authorBio}, ${authorInitials},
       ${input.category}, ${tags}, ${date}, ${readTime},
       ${Boolean(input.featured)}, ${status}, ${imageUrl})
  `;
  const created = await getPostById(id);
  if (!created) throw new Error("Failed to load created post");
  return created;
}

export async function updatePost(
  id: string,
  patch: Partial<BlogPostInput>
): Promise<AdminBlogPost | null> {
  await ready();
  const existing = await getPostById(id);
  if (!existing) return null;

  const nextTitle = patch.title !== undefined ? patch.title.trim() : existing.title;
  let nextSlug = existing.slug;
  if (patch.slug !== undefined) {
    const base = slugify(patch.slug || nextTitle);
    nextSlug = await uniqueSlug(base, id);
  }
  const nextExcerpt = patch.excerpt !== undefined ? patch.excerpt.trim() : existing.excerpt;
  const nextContent = patch.content !== undefined ? patch.content : existing.content;
  const nextAuthor = patch.author !== undefined ? patch.author.trim() : existing.author;
  const nextAuthorBio = patch.authorBio !== undefined ? patch.authorBio.trim() : existing.authorBio;
  const nextAuthorInitials =
    patch.authorInitials !== undefined
      ? patch.authorInitials.trim().slice(0, 2).toUpperCase()
      : patch.author !== undefined
        ? initialsFromName(nextAuthor)
        : existing.authorInitials;
  const nextCategory = patch.category !== undefined ? patch.category : existing.category;
  const nextTags =
    patch.tags !== undefined ? patch.tags.map((t) => t.trim()).filter(Boolean) : existing.tags;
  const nextReadTime =
    patch.readTime !== undefined
      ? patch.readTime.trim()
      : patch.content !== undefined
        ? estimateReadTime(nextContent)
        : existing.readTime;
  const nextFeatured =
    patch.featured !== undefined ? Boolean(patch.featured) : existing.featured;
  const nextStatus = patch.status !== undefined ? patch.status : existing.status;

  await sql`
    UPDATE blog_posts SET
      slug = ${nextSlug},
      title = ${nextTitle},
      excerpt = ${nextExcerpt},
      content = ${nextContent},
      author = ${nextAuthor},
      author_bio = ${nextAuthorBio},
      author_initials = ${nextAuthorInitials},
      category = ${nextCategory},
      tags = ${nextTags},
      read_time = ${nextReadTime},
      featured = ${nextFeatured},
      status = ${nextStatus},
      updated_at = now()
    WHERE id = ${id}
  `;
  return getPostById(id);
}

/** Delete all blog posts older than `days` days (by created_at). Used by the
 *  cron to keep the blog fresh — AI-generated posts have a short shelf life
 *  and we don't want stale health advice accumulating. Returns the slugs that
 *  were removed. */
export async function pruneOldPosts(days: number): Promise<string[]> {
  await ready();
  const rows = (await sql`
    DELETE FROM blog_posts
    WHERE created_at < now() - (${days} || ' days')::interval
    RETURNING slug
  `) as Array<{ slug: string }>;
  return rows.map((r) => r.slug);
}

export async function deletePost(id: string): Promise<boolean> {
  await ready();
  const rows = (await sql`DELETE FROM blog_posts WHERE id = ${id} RETURNING id`) as Array<{
    id: string;
  }>;
  return rows.length > 0;
}
