"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { faqPageData } from "@/lib/data";

const categories = ["General", "Appointments", "Payments", "Video Consultations", "Lab Tests", "Account"];

export default function FAQPage() {
  const [activeCategory, setActiveCategory] = useState("General");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const categoryFaqs = faqPageData.filter((f) => f.category === activeCategory);
    if (!search.trim()) return categoryFaqs;
    return categoryFaqs.filter(
      (f) =>
        f.question.toLowerCase().includes(search.toLowerCase()) ||
        f.answer.toLowerCase().includes(search.toLowerCase())
    );
  }, [activeCategory, search]);

  return (
    <div className="bg-gray-50 dark:bg-slate-900 py-16">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-slate-100 md:text-4xl">
            Frequently Asked <span className="text-primary-600">Questions</span>
          </h1>
          <p className="mt-3 text-gray-500 dark:text-slate-400">
            Find answers to common questions about our services and platform.
          </p>
        </div>

        {/* Search */}
        <div className="mt-8">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-slate-700 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setOpenId(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary-600 text-white"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 shadow-sm hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* FAQ items */}
        <div className="mt-8 space-y-3">
          {filteredFaqs.length === 0 ? (
            <p className="py-12 text-center text-gray-500 dark:text-slate-400">No FAQs found matching your search.</p>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-shadow hover:shadow-sm"
                >
                  <button
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="flex w-full items-center justify-between px-6 py-4 text-left"
                  >
                    <span className="pr-4 text-sm font-semibold text-gray-900 dark:text-slate-100">{faq.question}</span>
                    <svg
                      className={`h-5 w-5 flex-shrink-0 text-gray-400 dark:text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-4" : "max-h-0"}`}>
                    <p className="px-6 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{faq.answer}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl bg-white dark:bg-slate-900 p-8 text-center shadow-md">
          <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Still Have Questions?</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
            Our support team is ready to help you with any inquiries.
          </p>
          <Link href="/contact" className="btn-primary mt-6 inline-block">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  );
}
