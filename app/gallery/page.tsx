"use client";

import { useState } from "react";
import { galleryItems, galleryCategories } from "@/lib/data";

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedItem, setSelectedItem] = useState<number | null>(null);

  const filteredItems = galleryItems.filter(
    (item) => activeCategory === "All" || item.category === activeCategory
  );

  const currentIndex = selectedItem !== null
    ? filteredItems.findIndex((item) => item.id === galleryItems[selectedItem]?.id)
    : -1;

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevItem = filteredItems[currentIndex - 1];
      setSelectedItem(galleryItems.findIndex((g) => g.id === prevItem.id));
    }
  };

  const handleNext = () => {
    if (currentIndex < filteredItems.length - 1) {
      const nextItem = filteredItems[currentIndex + 1];
      setSelectedItem(galleryItems.findIndex((g) => g.id === nextItem.id));
    }
  };

  // Grid sizes pattern for masonry-like effect
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

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-teal-50 py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Our Facilities & <span className="text-primary-600">Gallery</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Take a virtual tour of our world-class healthcare facilities, meet our doctors, and explore our medical equipment.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Filter Tabs */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {galleryCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "bg-primary-600 text-white shadow-md"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid auto-rows-auto grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item, index) => {
            const globalIndex = galleryItems.findIndex((g) => g.id === item.id);
            const sizeClass = sizeClasses[index % sizeClasses.length];

            return (
              <div
                key={item.id}
                className={`group relative cursor-pointer overflow-hidden rounded-xl ${sizeClass}`}
                onClick={() => setSelectedItem(globalIndex)}
              >
                {/* Colored gradient placeholder */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.color} transition-transform duration-500 group-hover:scale-110`}
                />

                {/* Icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-5xl text-white/30">
                    {item.category === "Hospital" && "🏥"}
                    {item.category === "Doctors" && "👨‍⚕️"}
                    {item.category === "Equipment" && "🔬"}
                    {item.category === "Events" && "🎉"}
                    {item.category === "Patient Stories" && "❤️"}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <span className="mb-2 inline-block w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {item.category}
                  </span>
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/80">{item.description}</p>
                </div>

                {/* Category badge (always visible) */}
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {item.category}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-xl bg-gray-50 py-16 text-center">
            <p className="text-lg font-medium text-gray-500">No items found in this category.</p>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedItem !== null && galleryItems[selectedItem] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image area */}
            <div
              className={`flex h-72 items-center justify-center bg-gradient-to-br ${galleryItems[selectedItem].color} sm:h-96 lg:h-[28rem]`}
            >
              <span className="text-7xl text-white/40">
                {galleryItems[selectedItem].category === "Hospital" && "🏥"}
                {galleryItems[selectedItem].category === "Doctors" && "👨‍⚕️"}
                {galleryItems[selectedItem].category === "Equipment" && "🔬"}
                {galleryItems[selectedItem].category === "Events" && "🎉"}
                {galleryItems[selectedItem].category === "Patient Stories" && "❤️"}
              </span>
            </div>

            {/* Navigation arrows */}
            {currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            {currentIndex < filteredItems.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Info */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-600">
                  {galleryItems[selectedItem].category}
                </span>
                <span className="text-sm text-gray-400">
                  {currentIndex + 1} / {filteredItems.length}
                </span>
              </div>
              <h3 className="mt-3 text-xl font-bold text-gray-900">
                {galleryItems[selectedItem].title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {galleryItems[selectedItem].description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
