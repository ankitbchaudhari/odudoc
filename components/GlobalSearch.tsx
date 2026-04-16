"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { doctors, departments, blogPosts, products } from "@/lib/data";

interface SearchResult {
  category: string;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
}

const staticPages: SearchResult[] = [
  { category: "Pages", title: "Home", subtitle: "Main landing page", href: "/", icon: "home" },
  { category: "Pages", title: "About", subtitle: "About OduDoc", href: "/about", icon: "info" },
  { category: "Pages", title: "Contact", subtitle: "Get in touch", href: "/contact", icon: "mail" },
  { category: "Pages", title: "FAQ", subtitle: "Frequently asked questions", href: "/faq", icon: "help" },
  { category: "Pages", title: "Pricing", subtitle: "Plans and pricing", href: "/pricing", icon: "credit" },
  { category: "Pages", title: "Gallery", subtitle: "Photo gallery", href: "/gallery", icon: "image" },
  { category: "Pages", title: "Appointments", subtitle: "Book an appointment", href: "/appointments", icon: "calendar" },
];

function getIcon(type: string) {
  switch (type) {
    case "doctor":
      return (
        <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    case "department":
      return (
        <svg className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      );
    case "blog":
      return (
        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      );
    case "product":
      return (
        <svg className="h-5 w-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    default:
      return (
        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

function searchAll(query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  doctors
    .filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((d) =>
      results.push({
        category: "Doctors",
        title: d.name,
        subtitle: d.specialty,
        href: `/doctors/${d.id}`,
        icon: "doctor",
      })
    );

  departments
    .filter((d) => d.name.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((d) =>
      results.push({
        category: "Departments",
        title: d.name,
        subtitle: d.shortDescription,
        href: `/departments/${d.slug}`,
        icon: "department",
      })
    );

  blogPosts
    .filter((b) => b.title.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((b) =>
      results.push({
        category: "Blog Posts",
        title: b.title,
        subtitle: `By ${b.author}`,
        href: `/blog/${b.slug}`,
        icon: "blog",
      })
    );

  products
    .filter((p) => p.name.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((p) =>
      results.push({
        category: "Products",
        title: p.name,
        subtitle: `$${p.price}`,
        href: `/shop/${p.slug}`,
        icon: "product",
      })
    );

  staticPages
    .filter((p) => p.title.toLowerCase().includes(q))
    .forEach((p) => results.push(p));

  return results;
}

export default function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const results = searchAll(query);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIndex]) {
        onClose();
        window.location.href = results[activeIndex].href;
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, activeIndex, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    const container = resultsRef.current;
    if (!container) return;
    const activeEl = container.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!open) return null;

  // Group results by category
  const grouped: Record<string, SearchResult[]> = {};
  results.forEach((r) => {
    if (!grouped[r.category]) grouped[r.category] = [];
    grouped[r.category].push(r);
  });

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[10vh]" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search doctors, departments, blog posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-base outline-none placeholder:text-gray-400"
          />
          <kbd className="hidden rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[60vh] overflow-y-auto p-2">
          {query && results.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="mt-3 text-sm text-gray-500">No results found for &quot;{query}&quot;</p>
            </div>
          )}
          {!query && (
            <div className="py-8 text-center text-sm text-gray-400">
              Start typing to search...
            </div>
          )}
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category} className="mb-2">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {category}
              </p>
              {items.map((item) => {
                flatIndex++;
                const idx = flatIndex;
                return (
                  <Link
                    key={`${item.category}-${item.href}`}
                    href={item.href}
                    data-index={idx}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      idx === activeIndex ? "bg-primary-50 text-primary-700" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {getIcon(item.icon)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="truncate text-xs text-gray-400">{item.subtitle}</p>
                    </div>
                    <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-xs text-gray-400">
              <kbd className="rounded bg-gray-100 px-1.5 py-0.5">↑↓</kbd> Navigate{" "}
              <kbd className="ml-2 rounded bg-gray-100 px-1.5 py-0.5">Enter</kbd> Open{" "}
              <kbd className="ml-2 rounded bg-gray-100 px-1.5 py-0.5">Esc</kbd> Close
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
