"use client";

import { useState } from "react";
import type { FAQ } from "@/lib/data";

export default function FAQAccordion({ items }: { items: FAQ[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((faq, idx) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 transition-all ${
              isOpen
                ? "border-primary-300 shadow-lg shadow-primary-500/10"
                : "border-gray-100 hover:border-primary-200 hover:shadow-md"
            }`}
          >
            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="flex w-full items-center gap-4 px-6 py-4 text-left"
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-colors ${
                  isOpen
                    ? "bg-gradient-to-br from-primary-500 to-teal-500 text-white"
                    : "bg-primary-50 text-primary-600"
                }`}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span
                className={`flex-1 pr-2 text-sm font-semibold ${
                  isOpen ? "text-primary-700" : "text-gray-900 dark:text-slate-100"
                }`}
              >
                {faq.question}
              </span>
              <svg
                className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${
                  isOpen ? "rotate-180 text-primary-600" : "text-gray-400 dark:text-slate-500"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-96 pb-5" : "max-h-0"
              }`}
            >
              <p className="border-t border-gray-100 px-6 pt-4 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                {faq.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
