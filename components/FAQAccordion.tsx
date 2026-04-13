"use client";

import { useState } from "react";
import type { FAQ } from "@/lib/data";

export default function FAQAccordion({ items }: { items: FAQ[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {items.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-sm"
          >
            <button
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="flex w-full items-center justify-between px-6 py-4 text-left"
            >
              <span className="pr-4 text-sm font-semibold text-gray-900">{faq.question}</span>
              <svg
                className={`h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-96 pb-4" : "max-h-0"
              }`}
            >
              <p className="px-6 text-sm leading-relaxed text-gray-600">{faq.answer}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
