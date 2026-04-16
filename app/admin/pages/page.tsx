"use client";

import { useState } from "react";

interface CmsPage {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft";
  updatedAt: string;
  author: string;
}

export default function AdminPages() {
  const [pages, setPages] = useState<CmsPage[]>([
    { id: "1", title: "About Us", slug: "/about", status: "published", updatedAt: "2026-04-10", author: "Admin" },
    { id: "2", title: "Contact", slug: "/contact", status: "published", updatedAt: "2026-04-08", author: "Admin" },
    { id: "3", title: "FAQ", slug: "/faq", status: "published", updatedAt: "2026-04-05", author: "Admin" },
    { id: "4", title: "Pricing", slug: "/pricing", status: "published", updatedAt: "2026-04-04", author: "Admin" },
    { id: "5", title: "Gallery", slug: "/gallery", status: "published", updatedAt: "2026-04-02", author: "Admin" },
    { id: "6", title: "Testimonials", slug: "/testimonials", status: "published", updatedAt: "2026-03-28", author: "Admin" },
    { id: "7", title: "Privacy Policy", slug: "/privacy", status: "draft", updatedAt: "2026-03-20", author: "Admin" },
    { id: "8", title: "Terms & Conditions", slug: "/terms", status: "draft", updatedAt: "2026-03-20", author: "Admin" },
    { id: "9", title: "For Doctors", slug: "/for-doctors", status: "published", updatedAt: "2026-04-14", author: "Admin" },
    { id: "10", title: "Careers", slug: "/careers", status: "published", updatedAt: "2026-04-15", author: "Admin" },
  ]);
  const [search, setSearch] = useState("");

  const filtered = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const togglePublish = (id: string) => {
    setPages(
      pages.map((p) =>
        p.id === id
          ? { ...p, status: p.status === "published" ? "draft" : "published" }
          : p
      )
    );
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage CMS pages. Edit content, change status, or create new pages.
          </p>
        </div>
        <button className="btn-primary !text-sm">+ New Page</button>
      </div>

      <div className="mb-4">
        <input
          type="search"
          placeholder="Search pages..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-gray-200 px-4 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
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
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-primary-600">{p.slug}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.author}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.updatedAt}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => togglePublish(p.id)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      p.status === "published"
                        ? "bg-green-50 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {p.status === "published" ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right text-sm">
                  <a
                    href={p.slug}
                    target="_blank"
                    rel="noreferrer"
                    className="mr-3 font-medium text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    View
                  </a>
                  <button className="mr-3 font-medium text-primary-600 hover:underline">
                    Edit
                  </button>
                  <button className="font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
