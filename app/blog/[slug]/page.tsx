"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import BlogCard from "@/components/BlogCard";
import RelativeTime from "@/components/RelativeTime";
import {
  blogPosts as seedBlogPosts,
  blogComments,
  categoryGradients,
  type BlogPost,
} from "@/lib/data";
import { autolinkBlogHtml } from "@/lib/seo/auto-link";

const categoryIcons: Record<string, string> = {
  Wellness: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  Nutrition: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z",
  "Mental Health": "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
  Fitness: "M13 10V3L4 14h7v7l9-11h-7z",
  "Medical Tips": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  News: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z",
};

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const searchParams = useSearchParams();
  const isPreview = searchParams?.get("preview") === "1";

  // Hydrate with seed immediately (so static posts still work when the API is
  // unreachable), then fetch the live list to pick up admin edits + new posts.
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(seedBlogPosts);
  const [loadedFromApi, setLoadedFromApi] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(isPreview ? "/api/blog?view=all" : "/api/blog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (alive && Array.isArray(data.posts)) setBlogPosts(data.posts);
      })
      .catch(() => {
        /* stay on seed */
      })
      .finally(() => {
        if (alive) setLoadedFromApi(true);
      });
    return () => {
      alive = false;
    };
  }, [isPreview]);

  const post = blogPosts.find((p) => p.slug === slug);

  // Track whether the hero cover image loaded successfully. When the
  // URL is dead (or the upload was wiped) we want to fall back cleanly
  // to the gradient instead of rendering the browser's "broken image
  // alt text" overlay across the hero — see the conjunctivitis post
  // bug report.
  const [coverImgOk, setCoverImgOk] = useState(true);
  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState(blogComments);
  const [copied, setCopied] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  // Wait until we've tried the API before showing the not-found state — the
  // post may only exist in the live store (admin-created).
  if (!post && !loadedFromApi) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Article Not Found</h1>
        <p className="text-gray-500 dark:text-slate-400">This article doesn't exist or may have been removed.</p>
        <Link href="/blog" className="btn-primary mt-2">
          ← Back to Blog
        </Link>
      </div>
    );
  }

  const postComments = localComments.filter((c) => c.postId === post.id);
  const relatedPosts = blogPosts
    .filter(
      (p) =>
        p.id !== post.id &&
        (p.category === post.category || p.tags.some((t) => post.tags.includes(t)))
    )
    .slice(0, 3);

  const gradient = categoryGradients[post.category] || "from-primary-500 to-teal-600";
  const icon = categoryIcons[post.category] || categoryIcons["Medical Tips"];

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentName && commentText) {
      const newComment = {
        id: `local-${Date.now()}`,
        postId: post.id,
        name: commentName,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
        text: commentText,
      };
      setLocalComments([newComment, ...localComments]);
      setCommentName("");
      setCommentEmail("");
      setCommentText("");
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 3000);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {isPreview && (post as BlogPost & { status?: string }).status === "Draft" && (
        <div className="bg-yellow-400 py-2 text-center text-sm font-semibold text-yellow-900">
          👁️ Draft preview — this article is not published yet and is not visible to the public.
        </div>
      )}
      {/* ── Hero / Cover ── */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} py-16 text-white`}>
        {post.imageUrl && coverImgOk && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.imageUrl}
              // Decorative — the article title already lives in the H1
              // below. Empty alt prevents the browser's broken-image
              // alt-text overlay from appearing on top of the hero
              // when the URL 404s.
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full object-cover"
              onError={() => setCoverImgOk(false)}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
          </>
        )}
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/70">
            <Link href="/" className="hover:text-white">Home</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white">Blog</Link>
            <span>/</span>
            <span className="truncate text-white/90">{post.title}</span>
          </nav>

          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* Icon */}
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <svg className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
              </svg>
            </div>
            <div>
              <span className="mb-3 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                {post.category}
              </span>
              <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl lg:text-4xl">
                {post.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/80">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {post.authorInitials}
                  </div>
                  <span>{post.author}</span>
                </div>
                <span>·</span>
                <span>
                  <RelativeTime date={post.createdAt || post.date} fallback={post.date} />
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {post.readTime}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Article Body ── */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main article */}
          <article className="flex-1 min-w-0">
            <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8 md:p-10">
              <div
                className="blog-content max-w-none"
                dangerouslySetInnerHTML={{ __html: autolinkBlogHtml(post.content) }}
              />

              {/* Tags */}
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-6">
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">Tags:</span>
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/blog?q=${encodeURIComponent(tag)}`}
                    className="rounded-full border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-3 py-1 text-xs text-gray-600 dark:text-slate-300 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>

              {/* Share */}
              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
                <span className="text-sm font-semibold text-gray-500 dark:text-slate-400">Share:</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DA1F2] text-xs font-bold text-white transition-transform hover:scale-110"
                  title="Share on X (Twitter)"
                >X</a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white transition-transform hover:scale-110"
                  title="Share on Facebook"
                >f</a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-xs font-bold text-white transition-transform hover:scale-110"
                  title="Share on LinkedIn"
                >in</a>
                <button
                  onClick={handleCopyLink}
                  className="flex h-9 items-center gap-1.5 rounded-full border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 px-3 text-xs font-medium text-gray-600 dark:text-slate-300 transition-colors hover:bg-gray-100 dark:bg-slate-800"
                >
                  {copied ? (
                    <><svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Copied!</>
                  ) : (
                    <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>Copy Link</>
                  )}
                </button>
              </div>

              {/* Author Bio */}
              <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 dark:bg-slate-900 p-6 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-xl font-bold text-primary-700">
                  {post.authorInitials}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Written by</p>
                  <p className="mt-0.5 font-bold text-gray-900 dark:text-slate-100">{post.author}</p>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{post.authorBio}</p>
                </div>
              </div>
            </div>

            {/* Comments */}
            <div className="mt-8 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-sm sm:p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-slate-100">
                <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Comments ({postComments.length})
              </h2>

              {/* Comment form */}
              <form onSubmit={handleCommentSubmit} className="mb-8 rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-900 p-5">
                <h3 className="mb-4 font-semibold text-gray-800 dark:text-slate-200">Leave a Comment</h3>
                {commentSuccess && (
                  <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                    ✓ Comment posted successfully!
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Your Name *"
                    required
                    className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <input
                    type="email"
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="Your Email (optional)"
                    className="rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your thoughts..."
                  required
                  rows={4}
                  className="mt-3 w-full resize-none rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                <button type="submit" className="btn-primary mt-3">
                  Post Comment
                </button>
              </form>

              {/* Comments list */}
              <div className="space-y-5">
                {postComments.length === 0 ? (
                  <p className="rounded-xl bg-gray-50 dark:bg-slate-900 py-10 text-center text-sm text-gray-400 dark:text-slate-500">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  postComments.map((comment) => (
                    <div key={comment.id} className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                        {comment.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 rounded-xl border border-gray-100 bg-gray-50 dark:bg-slate-900 p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{comment.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">
                            <RelativeTime date={comment.date} fallback={comment.date} />
                          </p>
                        </div>
                        <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          {/* Sticky sidebar (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24 space-y-5">
              {/* Back to blog */}
              <Link
                href="/blog"
                className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-gray-600 dark:text-slate-300 shadow-sm hover:bg-primary-50 hover:text-primary-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                All Articles
              </Link>

              {/* Related posts */}
              {relatedPosts.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Related Articles
                  </h3>
                  <div className="space-y-4">
                    {relatedPosts.map((rp) => (
                      <Link key={rp.id} href={`/blog/${rp.slug}`} className="group block">
                        <div className={`mb-2 h-2 w-8 rounded-full bg-gradient-to-r ${categoryGradients[rp.category] || "from-gray-300 to-gray-400"}`} />
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-300 line-clamp-2 transition-colors group-hover:text-primary-600">
                          {rp.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">{rp.readTime}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Book a doctor CTA */}
              <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-teal-600 p-5 text-white">
                <p className="font-bold">Need a Doctor?</p>
                <p className="mt-1 text-sm text-primary-100">
                  Consult a specialist online in minutes.
                </p>
                <Link
                  href="/doctors"
                  className="mt-4 block rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-center text-sm font-bold text-primary-700 hover:bg-gray-50 dark:bg-slate-900"
                >
                  Find Doctors →
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related articles (mobile) */}
        {relatedPosts.length > 0 && (
          <section className="mt-10 lg:hidden">
            <h2 className="mb-5 text-xl font-bold text-gray-900 dark:text-slate-100">Related Articles</h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {relatedPosts.map((rp) => (
                <BlogCard key={rp.id} post={rp} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
