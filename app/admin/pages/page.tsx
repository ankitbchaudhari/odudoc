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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage CMS pages. Edit content, change status, or create new pages.
          </p>
        </div>
        <button
          onClick={openNew}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          + New Page
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "All" | PageStatus)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500"
        >
          <option value="All">All statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
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
              filtered.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.title}
                      {p.isCustom && (
                        <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-700">
                          Custom
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-600">
                    {p.slug}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.author}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{p.updatedAt}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(p)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        p.status === "Published"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {p.status}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right text-sm">
                    <a
                      href={viewHref(p)}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-3 font-medium text-gray-500 hover:text-gray-700 hover:underline"
                    >
                      View
                    </a>
                    <button
                      onClick={() => openEdit(p)}
                      className="mr-3 font-medium text-primary-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removePage(p.id)}
                      disabled={deletingId === p.id}
                      className="font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
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
