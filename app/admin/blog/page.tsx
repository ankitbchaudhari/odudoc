"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  authorBio: string;
  authorInitials: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  featured: boolean;
  status: "Published" | "Draft";
}

const CATEGORIES = ["Wellness", "Nutrition", "Mental Health", "Fitness", "Medical Tips", "News"];

export default function AdminBlog() {
  const [posts, setPosts] = useState<AdminBlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft">("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  // Form
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("Wellness");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<"Published" | "Draft">("Published");

  const loadPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/blog?view=all", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load posts");
      setPosts(data.posts || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const filtered = posts.filter((p) => {
    const s = search.toLowerCase();
    const matchSearch =
      !s ||
      p.title.toLowerCase().includes(s) ||
      p.author.toLowerCase().includes(s) ||
      p.tags.some((t) => t.toLowerCase().includes(s));
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const resetForm = () => {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContent("");
    setAuthor("");
    setCategory("Wellness");
    setTags("");
    setFeatured(false);
    setStatus("Published");
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: AdminBlogPost) => {
    setTitle(p.title);
    setSlug(p.slug);
    setExcerpt(p.excerpt);
    setContent(p.content);
    setAuthor(p.author);
    setCategory(p.category);
    setTags(p.tags.join(", "));
    setFeatured(p.featured);
    setStatus(p.status);
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      setError("Title and content are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        slug: slug.trim() || undefined,
        excerpt,
        content,
        author,
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        featured,
        status,
      };
      const res = await fetch(
        editingId ? `/api/blog/${editingId}` : "/api/blog",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      await loadPosts();
      setShowForm(false);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/blog/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Delete failed");
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const handleGenerate = async (strategy?: "broad" | "specialty" | "seasonal") => {
    setGenerating(true);
    setGenMsg(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(strategy ? { strategy } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      await loadPosts();
      setGenMsg(`Draft ready: "${data.post.title}" — scroll down to review & publish.`);
      setStatusFilter("Draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const buildLinkedInCaption = (p: AdminBlogPost): { caption: string; url: string } => {
    const url = `https://www.odudoc.com/blog/${p.slug}`;
    const hashtags = [
      ...p.tags.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`).filter((h) => h.length > 1),
      "#Health",
      "#OduDoc",
    ]
      .slice(0, 8)
      .join(" ");
    const caption = `${p.title}\n\n${p.excerpt}\n\nRead the full article: ${url}\n\n${hashtags}`;
    return { caption, url };
  };

  const handleShareLinkedIn = async (p: AdminBlogPost) => {
    if (p.status !== "Published") {
      setShareMsg("Publish the post first — LinkedIn needs a live URL to preview.");
      setTimeout(() => setShareMsg(null), 4000);
      return;
    }
    const { caption, url } = buildLinkedInCaption(p);
    try {
      await navigator.clipboard.writeText(caption);
      setShareMsg("✓ Caption copied to clipboard — paste it into the LinkedIn composer that just opened.");
    } catch {
      setShareMsg("LinkedIn opened. (Copy the caption manually — your browser blocked clipboard access.)");
    }
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      "_blank",
      "noreferrer"
    );
    setTimeout(() => setShareMsg(null), 6000);
  };

  const togglePublish = async (p: AdminBlogPost) => {
    const newStatus = p.status === "Published" ? "Draft" : "Published";
    try {
      const res = await fetch(`/api/blog/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Update failed");
      }
      await loadPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? "Loading…" : `${posts.length} posts total`}
          </p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Post
        </button>
      </div>

      {/* AI generator panel */}
      <div className="mb-6 overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-primary-50 p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-primary-600 text-white shadow-md">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.624L16.5 22.5l-.398-1.876a3 3 0 00-2.225-2.225L12 18l1.877-.398a3 3 0 002.225-2.225L16.5 13.5l.398 1.877a3 3 0 002.224 2.225L21 18l-1.878.398a3 3 0 00-2.224 2.225z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Generate article with AI</h3>
              <p className="mt-0.5 text-xs text-gray-600">
                Claude writes a health article and saves it as a Draft for your review.
                A new draft also arrives automatically every day at 11:00 IST.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleGenerate()}
              disabled={generating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-indigo-700 hover:to-primary-700 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Generating…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate (auto-pick)
                </>
              )}
            </button>
            <button
              onClick={() => handleGenerate("broad")}
              disabled={generating}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              General wellness
            </button>
            <button
              onClick={() => handleGenerate("specialty")}
              disabled={generating}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Specialty-linked
            </button>
            <button
              onClick={() => handleGenerate("seasonal")}
              disabled={generating}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              Seasonal / local
            </button>
          </div>
        </div>
        {genMsg && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            ✓ {genMsg}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {editingId ? "Edit Post" : "New Post"}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug (optional)</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="auto-generated from title"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Author</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Dr. Jane Doe"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "Published" | "Draft")}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                <option value="Published">Published</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tags</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="heart-health, wellness, tips (comma separated)"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Excerpt</label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                placeholder="Short summary that appears on the blog card"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"
                placeholder="Full article body. Supports basic HTML (<h2>, <p>, <ul>, etc.)."
              />
              <p className="mt-1 text-xs text-gray-400">
                HTML is allowed (headings, paragraphs, lists, bold, links).
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${featured ? "bg-primary-600" : "bg-gray-300"}`}
                  onClick={() => setFeatured(!featured)}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${featured ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </div>
                Featured on blog homepage
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update Post" : "Publish"}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-xl bg-white p-4 shadow-sm sm:flex-row">
        <input
          type="text"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | "Published" | "Draft")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
        >
          <option value="All">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Author</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{p.title}</span>
                      {p.featured && (
                        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                          ⭐ Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">/blog/{p.slug}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.author}</td>
                  <td className="px-6 py-4 text-gray-600">{p.category}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublish(p)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                        p.status === "Published"
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      }`}
                      title="Click to toggle"
                    >
                      {p.status}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <a
                        href={`/blog/${p.slug}${p.status === "Draft" ? "?preview=1" : ""}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
                        title={p.status === "Draft" ? "Preview draft" : "View on site"}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleShareLinkedIn(p)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-[#0A66C2]/10 hover:text-[#0A66C2]"
                        title="Share on LinkedIn"
                      >
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.852 3.37-1.852 3.601 0 4.267 2.37 4.267 5.455v6.288zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-gray-400">No posts found.</div>
        )}
      </div>

      {shareMsg && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-[#0A66C2]/20 bg-white px-4 py-3 text-sm text-gray-800 shadow-xl">
          {shareMsg}
        </div>
      )}
    </div>
  );
}
