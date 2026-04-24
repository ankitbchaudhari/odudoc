"use client";

import { useEffect, useState } from "react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  productCount: number;
  createdAt: string;
}

export default function AdminTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/tags");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load");
        setTags(data.tags || []);
        setColors(data.colors || []);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTags([data.tag, ...tags]);
      setNewName("");
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    const prev = tags;
    setTags(tags.filter((t) => t.id !== id));
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" });
    if (!res.ok) { setTags(prev); alert("Failed to delete"); }
  };

  const cycleColor = async (id: string) => {
    if (!colors.length) return;
    const t = tags.find((x) => x.id === id);
    if (!t) return;
    const idx = colors.indexOf(t.color);
    const nextColor = colors[(idx + 1) % colors.length];
    const prev = tags;
    setTags(tags.map((x) => (x.id === id ? { ...x, color: nextColor } : x)));
    const res = await fetch(`/api/admin/tags/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: nextColor }),
    });
    if (!res.ok) setTags(prev);
  };

  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 p-6 text-white shadow-lg">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-14 -left-10 h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl" />
        <div className="relative">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-400" />
            </span>
            {tags.length} tags in use
          </div>
          <h1 className="text-2xl font-bold">Product Tags</h1>
          <p className="mt-1 text-sm text-fuchsia-50/90">Lightweight labels that appear on product cards.</p>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-gradient-to-r from-rose-50 to-red-50 p-3 text-sm text-red-700 ring-1 ring-rose-200">{error}</div>}

      <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500" />
        <div className="p-5">
          <form onSubmit={add} className="flex gap-3">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg">🏷️</span>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Add a tag (e.g. Limited Edition)"
                className="w-full rounded-lg border border-gray-200 bg-gradient-to-r from-purple-50/30 to-pink-50/30 px-3 py-2.5 pl-10 text-sm outline-none focus:border-fuchsia-500 focus:ring-2 focus:ring-fuchsia-500/20"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60"
            >
              {creating ? "Adding…" : "+ Add Tag"}
            </button>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="h-1 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500" />
        <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-600">
            ✨ All Tags ({tags.length})
          </h2>
          <p className="text-xs text-gray-400">Click a tag color swatch to change its color</p>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <div
                key={t.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow ${t.color}`}
              >
                <button
                  onClick={() => cycleColor(t.id)}
                  className="h-2 w-2 rounded-full bg-current opacity-70 hover:opacity-100"
                  aria-label="Change color"
                />
                <span>{t.name}</span>
                <span className="rounded-full bg-white/50 px-1.5 text-xs">{t.productCount}</span>
                <button
                  onClick={() => del(t.id)}
                  className="ml-1 opacity-50 hover:opacity-100"
                  aria-label="Delete"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {tags.length === 0 && <p className="text-sm text-gray-500">No tags yet — add one above.</p>}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
