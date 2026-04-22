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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Tags</h1>
        <p className="mt-1 text-sm text-gray-500">Lightweight labels that appear on product cards.</p>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <form onSubmit={add} className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a tag (e.g. Limited Edition)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <button type="submit" disabled={creating} className="btn-primary !text-sm !px-5 disabled:opacity-60">
            {creating ? "Adding…" : "Add Tag"}
          </button>
        </form>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            All Tags ({tags.length})
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
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${t.color}`}
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
  );
}
