"use client";

import { useState } from "react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string;
  productCount: number;
}

const COLORS = [
  "bg-red-100 text-red-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-yellow-100 text-yellow-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
  "bg-cyan-100 text-cyan-700",
  "bg-blue-100 text-blue-700",
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-pink-100 text-pink-700",
  "bg-gray-100 text-gray-700",
];

export default function AdminTags() {
  const [tags, setTags] = useState<Tag[]>([
    { id: "1", name: "New Arrival", slug: "new", color: COLORS[7], productCount: 23 },
    { id: "2", name: "Best Seller", slug: "bestseller", color: COLORS[4], productCount: 34 },
    { id: "3", name: "On Sale", slug: "sale", color: COLORS[0], productCount: 18 },
    { id: "4", name: "Prescription", slug: "rx", color: COLORS[9], productCount: 89 },
    { id: "5", name: "OTC", slug: "otc", color: COLORS[6], productCount: 65 },
    { id: "6", name: "Organic", slug: "organic", color: COLORS[5], productCount: 27 },
    { id: "7", name: "Fast Shipping", slug: "fast-ship", color: COLORS[2], productCount: 112 },
    { id: "8", name: "Imported", slug: "imported", color: COLORS[8], productCount: 41 },
  ]);
  const [newName, setNewName] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setTags([
      { id: `${Date.now()}`, name: newName.trim(), slug, color: COLORS[Math.floor(Math.random() * COLORS.length)], productCount: 0 },
      ...tags,
    ]);
    setNewName("");
  };

  const del = (id: string) => setTags(tags.filter((t) => t.id !== id));
  const cycleColor = (id: string) => {
    setTags(
      tags.map((t) => {
        if (t.id !== id) return t;
        const idx = COLORS.indexOf(t.color);
        return { ...t, color: COLORS[(idx + 1) % COLORS.length] };
      })
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Tags</h1>
        <p className="mt-1 text-sm text-gray-500">Lightweight labels that appear on product cards.</p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <form onSubmit={add} className="flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a tag (e.g. Limited Edition)"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <button type="submit" className="btn-primary !text-sm !px-5">
            Add Tag
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
        </div>
      </div>
    </div>
  );
}
