"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import BlogCard from "@/components/BlogCard";
import { blogPosts, blogComments, categoryGradients } from "@/lib/data";

export default function BlogPostPage() {
  const params = useParams();
  const slug = params.slug as string;
  const post = blogPosts.find((p) => p.slug === slug);

  const [commentName, setCommentName] = useState("");
  const [commentEmail, setCommentEmail] = useState("");
  const [commentText, setCommentText] = useState("");
  const [localComments, setLocalComments] = useState(blogComments);
  const [copied, setCopied] = useState(false);

  if (!post) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-900">Article Not Found</h1>
        <p className="mt-2 text-gray-500">The article you are looking for does not exist.</p>
        <Link href="/blog" className="btn-primary mt-6">
          Back to Blog
        </Link>
      </div>
    );
  }

  const postComments = localComments.filter((c) => c.postId === post.id);
  const relatedPosts = blogPosts
    .filter((p) => p.id !== post.id && (p.category === post.category || p.tags.some((t) => post.tags.includes(t))))
    .slice(0, 3);
  const gradient = categoryGradients[post.category] || "from-gray-400 to-gray-600";

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentName && commentText) {
      const newComment = {
        id: `local-${Date.now()}`,
        postId: post.id,
        name: commentName,
        date: new Date().toISOString().split("T")[0],
        text: commentText,
      };
      setLocalComments([newComment, ...localComments]);
      setCommentName("");
      setCommentEmail("");
      setCommentText("");
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="border-b border-gray-100 bg-gray-50">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 text-sm text-gray-500 sm:px-6">
          <Link href="/" className="hover:text-primary-600">Home</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-primary-600">Blog</Link>
          <span>/</span>
          <span className="truncate text-gray-700">{post.title}</span>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        {/* Header */}
        <header className="mb-10">
          <span className="mb-3 inline-block rounded-full bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-600">
            {post.category}
          </span>
          <h1 className="mb-6 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
              {post.authorInitials}
            </div>
            <div>
              <p className="font-medium text-gray-900">{post.author}</p>
              <p className="text-sm text-gray-500">
                {post.date} &middot; {post.readTime}
              </p>
            </div>
          </div>
        </header>

        {/* Image placeholder */}
        <div className={`mb-10 flex h-64 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} sm:h-80 lg:h-96`}>
          <span className="text-6xl text-white/50">
            {post.category === "Wellness" && "🌿"}
            {post.category === "Nutrition" && "🥗"}
            {post.category === "Mental Health" && "🧠"}
            {post.category === "Fitness" && "💪"}
            {post.category === "Medical Tips" && "🩺"}
            {post.category === "News" && "📰"}
          </span>
        </div>

        {/* Article body */}
        <div
          className="blog-content mx-auto max-w-none"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-6">
          <span className="text-sm font-medium text-gray-500">Tags:</span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Share Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-6">
          <span className="text-sm font-medium text-gray-500">Share:</span>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1DA1F2] text-xs font-bold text-white transition-transform hover:scale-110"
          >
            X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877F2] text-xs font-bold text-white transition-transform hover:scale-110"
          >
            f
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A66C2] text-xs font-bold text-white transition-transform hover:scale-110"
          >
            in
          </a>
          <button
            onClick={handleCopyLink}
            className="flex h-9 items-center gap-1.5 rounded-full border border-gray-200 px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {copied ? (
              <>
                <svg className="h-3.5 w-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Copy Link
              </>
            )}
          </button>
        </div>

        {/* Author Bio */}
        <div className="mt-10 rounded-xl bg-gray-50 p-6 sm:flex sm:items-start sm:gap-5">
          <div className="mx-auto mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700 sm:mx-0 sm:mb-0">
            {post.authorInitials}
          </div>
          <div className="text-center sm:text-left">
            <p className="font-semibold text-gray-900">About {post.author}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{post.authorBio}</p>
          </div>
        </div>

        {/* Related Articles */}
        {relatedPosts.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-8 text-2xl font-bold text-gray-900">Related Articles</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPosts.map((p) => (
                <BlogCard key={p.id} post={p} />
              ))}
            </div>
          </section>
        )}

        {/* Comments Section */}
        <section className="mt-16">
          <h2 className="mb-8 text-2xl font-bold text-gray-900">
            Comments ({postComments.length})
          </h2>

          {/* Comment Form */}
          <form onSubmit={handleCommentSubmit} className="mb-10 rounded-xl bg-gray-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Leave a Comment</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <input
                type="text"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                placeholder="Your Name"
                required
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
              <input
                type="email"
                value={commentEmail}
                onChange={(e) => setCommentEmail(e.target.value)}
                placeholder="Your Email"
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write your comment..."
              required
              rows={4}
              className="mt-4 w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <button type="submit" className="btn-primary mt-4 !py-2.5">
              Submit Comment
            </button>
          </form>

          {/* Comments List */}
          <div className="space-y-6">
            {postComments.map((comment) => (
              <div key={comment.id} className="border-b border-gray-100 pb-6 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {comment.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{comment.name}</p>
                    <p className="text-xs text-gray-400">{comment.date}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{comment.text}</p>
                <button className="mt-2 text-xs font-medium text-primary-600 hover:text-primary-700">
                  Reply
                </button>
              </div>
            ))}
            {postComments.length === 0 && (
              <p className="text-center text-sm text-gray-400">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </section>
      </article>
    </>
  );
}
