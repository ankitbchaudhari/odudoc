"use client";

import { useEffect, useState } from "react";

interface GalleryItem {
  id: string;
  title: string;
  description: string;
  category: string;
  color: string;
  imageUrl?: string;
}

const CATEGORIES = ["All", "Hospital", "Doctors", "Equipment", "Events", "Patient Stories"];

const tabGradients: Record<string, string> = {
  All: "from-primary-600 via-teal-600 to-emerald-600",
  Hospital: "from-sky-500 to-indigo-600",
  Doctors: "from-emerald-500 to-teal-600",
  Equipment: "from-fuchsia-500 to-pink-600",
  Events: "from-amber-500 to-orange-600",
  "Patient Stories": "from-rose-500 to-red-600",
};

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);

  useEffect(() => {
    fetch("/api/gallery", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {});
  }, []);

  const filteredItems = items.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  const currentIndex = selectedId !== null
    ? filteredItems.findIndex((i) => i.id === selectedId)
    : -1;
  const selected = currentIndex >= 0 ? filteredItems[currentIndex] : null;

  const handlePrev = () => {
    if (currentIndex > 0) setSelectedId(filteredItems[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < filteredItems.length - 1) {
      setSelectedId(filteredItems[currentIndex + 1].id);
    }
  };

  const sizeClasses = [
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-80 md:col-span-1 md:row-span-2",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-72 md:col-span-2 md:row-span-1",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-64",
    "col-span-1 row-span-1 h-80 md:col-span-1 md:row-span-2",
  ];

  const categoryIcon = (cat: string) => {
    if (cat === "Hospital") return "🏥";
    if (cat === "Doctors") return "👨‍⚕️";
    if (cat === "Equipment") return "🔬";
    if (cat === "Events") return "🎉";
    if (cat === "Patient Stories") return "❤️";
    return "📸";
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-50 py-20">
        <div className="pointer-events-none absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-sky-200/40 to-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-purple-200/40 to-rose-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700">
            <span>📸</span> Virtual tour
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-slate-100 sm:text-6xl">
            Our facilities &amp;{" "}
            <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-rose-500 bg-clip-text text-transparent">
              gallery
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
            Take a virtual tour of our world-class healthcare facilities, meet our doctors, and explore our medical equipment.
          </p>
        </div>
      </section>

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Filter Tabs */}
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const grad = tabGradients[cat] || "from-primary-600 to-teal-600";
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? `bg-gradient-to-r ${grad} text-white shadow-lg hover:scale-105`
                    : "border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 hover:border-primary-200 hover:text-primary-700 hover:shadow-sm"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Gallery Grid */}
        <div className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => {
            const sizeClass = sizeClasses[index % sizeClasses.length];
            return (
              <div
                key={item.id}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl ${sizeClass}`}
                onClick={() => setSelectedId(item.id)}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.color} transition-transform duration-500 group-hover:scale-110`}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl text-white/30 transition-transform duration-500 group-hover:scale-110">
                    {categoryIcon(item.category)}
                  </span>
                </div>
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/30 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {item.category}
                  </span>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/80">{item.description}</p>
                </div>
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm ring-1 ring-white/30">
                    {item.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-slate-50 to-primary-50/40 py-16 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-500 dark:text-slate-400">No items found in this category.</p>
          </div>
        )}
      </div>

      {/* Bottom accent section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-50 via-white to-purple-50 py-16">
        <div className="pointer-events-none absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-sky-200/40 to-indigo-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-br from-rose-200/40 to-amber-200/40 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100 md:text-4xl">
            Want to{" "}
            <span className="bg-gradient-to-r from-primary-600 via-purple-500 to-rose-500 bg-clip-text text-transparent">
              visit in person?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600 dark:text-slate-300">
            Schedule a facility tour or connect with our team to learn more about our partner hospitals.
          </p>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedId(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className={`flex h-72 items-center justify-center bg-gradient-to-br ${selected.color} sm:h-96 lg:h-[28rem]`}>
              <span className="text-7xl text-white/40">{categoryIcon(selected.category)}</span>
            </div>

            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentIndex < filteredItems.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-gradient-to-r from-primary-100 to-teal-100 px-3 py-1 text-xs font-semibold text-primary-700">
                  {selected.category}
                </span>
                <span className="text-sm text-gray-400 dark:text-slate-500">
                  {currentIndex + 1} / {filteredItems.length}
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-gray-900 dark:text-slate-100">{selected.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{selected.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
