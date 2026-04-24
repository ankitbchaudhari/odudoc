"use client";

import { useEffect, useMemo, useState } from "react";

type PageStatus = "Published" | "Draft";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: PageStatus;
  author: string;
  content: string;
  seoDescription?: string;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormState {
  title: string;
  slug: string;
  status: PageStatus;
  author: string;
  seoDescription: string;
  content: string;
  isCustom: boolean;
}

const emptyForm: FormState = {
  title: "",
  slug: "",
  status: "Draft",
  author: "Admin",
  seoDescription: "",
  content: "",
  isCustom: true,
};

export default function AdminPages() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PageStatus>("All");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/pages", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setPages(data.pages || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return pages.filter((p) => {
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [pages, search, statusFilter]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(p: CmsPage) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      slug: p.slug,
      status: p.status,
      author: p.author,
      seoDescription: p.seoDescription || "",
      content: p.content || "",
      isCustom: p.isCustom,
    });
    setShowModal(true);
  }

  async function save() {
    if (!form.title.trim()) {
      alert("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || form.title,
        status: form.status,
        author: form.author,
        content: form.content,
        seoDescription: form.seoDescription,
        isCustom: form.isCustom,
      };
      const url = editingId ? `/api/admin/pages/${editingId}` : "/api/admin/pages";
      const method = editingId ? "PATCH" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${r.status}`);
      }
      setShowModal(false);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removePage(id: string) {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`/api/admin/pages/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function togglePublish(p: CmsPage) {
    try {
      const r = await fetch(`/api/admin/pages/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: p.status === "Published" ? "Draft" : "Published",
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refresh();
    } catch (err) {
      alert((err as Error).message);
    }
  }

  function viewHref(p: CmsPage): string {
    if (p.isCustom) return `/cms${p.slug}`;
    return p.slug;
  }

  return (
    <div>
      {/* gradient hero */}
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-200 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-300" />
              </span>
              CMS content
            </div>
            <h1 className="text-2xl font-bold">Pages</h1>
            <p className="mt-1 text-sm text-sky-50/90">
              {pages.length} total · {pages.filter((p) => p.status === "Published").length} published · {pages.filter((p) => p.status === "Draft").length} draft
            </p>
          </div>
          <button
            onClick={openNew}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            + New Page
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl bg-gradient-to-r from-slate-50 to-white p-3 ring-1 ring-slate-100">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search pages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | PageStatus)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm outline-none focus:border-sky-500"
        >
          <option value="All">All statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500" />
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gradient-to-r from-slate-50 to-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Title</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">URL</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Author</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Updated</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  Loading pages…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                  No pages found.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((p, i) => {
                const palettes = [
                  "from-cyan-400 to-sky-500",
                  "from-violet-400 to-fuchsia-500",
                  "from-emerald-400 to-teal-500",
                  "from-amber-400 to-orange-500",
                  "from-rose-400 to-pink-500",
                  "from-indigo-400 to-violet-500",
                  "from-sky-400 to-blue-500",
                  "from-yellow-400 to-amber-500",
                ];
                const grad = palettes[i % palettes.length];
                return (
                <tr key={p.id} className="transition hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white shadow-sm ring-2 ring-white`}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          {p.title}
                          {p.isCustom && (
                            <span className="rounded bg-gradient-to-r from-primary-50 to-teal-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-700 ring-1 ring-primary-100">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-sky-600">
                    {p.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.updatedAt}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(p)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition hover:-translate-y-0.5 ${
                        p.status === "Published"
                          ? "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 ring-emerald-200"
                          : "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 ring-amber-200"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${p.status === "Published" ? "bg-emerald-500" : "bg-amber-500"}`} />
                      {p.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <a
                      href={viewHref(p)}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-2 inline-block rounded-lg bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-100"
                    >
                      View
                    </a>
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-2 inline-block rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100 transition hover:-translate-y-0.5 hover:bg-blue-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removePage(p.id)}
                      disabled={deletingId === p.id}
                      className="inline-block rounded-lg bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:bg-red-100 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );})}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? "Edit Page" : "New Page"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  URL slug *
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="/my-page"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as PageStatus })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Author
                </label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isCustom}
                    onChange={(e) =>
                      setForm({ ...form, isCustom: e.target.checked })
                    }
                  />
                  Custom page (rendered from content below)
                </label>
                <p className="text-[11px] text-gray-500">
                  Uncheck for metadata-only entries pointing at existing routes.
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  SEO description
                </label>
                <input
                  type="text"
                  value={form.seoDescription}
                  onChange={(e) =>
                    setForm({ ...form, seoDescription: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Content (HTML)
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={10}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs outline-none focus:border-primary-500"
                  placeholder="<h2>Heading</h2>&#10;<p>Paragraph...</p>"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  HTML is rendered as-is inside the page body. Supports headings,
                  paragraphs, lists, links, images.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingId ? "Save changes" : "Create page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
