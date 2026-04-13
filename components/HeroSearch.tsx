"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/doctors?search=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/doctors");
    }
  };

  return (
    <form onSubmit={handleSearch} className="mx-auto w-full max-w-2xl">
      <div className="flex items-center overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-lg transition-all duration-300 focus-within:border-primary-500 focus-within:shadow-xl">
        <div className="pl-4 text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search doctors, clinics, hospitals, etc."
          className="flex-1 px-4 py-4 text-gray-700 outline-none placeholder:text-gray-400"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="m-1.5 rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
