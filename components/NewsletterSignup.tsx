"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  return (
    <div className="rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 p-6 text-white">
      <h3 className="text-lg font-bold">Subscribe to Our Newsletter</h3>
      <p className="mt-1 text-sm text-primary-100">
        Get the latest health tips and updates delivered to your inbox.
      </p>

      {submitted ? (
        <div className="mt-4 rounded-lg bg-white/20 p-4 text-center">
          <p className="text-sm font-semibold">Thank you for subscribing!</p>
          <p className="mt-1 text-xs text-primary-100">
            You will receive our next newsletter soon.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-2 text-xs underline hover:no-underline"
          >
            Subscribe another email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full rounded-lg bg-white/20 px-4 py-2.5 text-sm text-white placeholder-white/70 outline-none ring-2 ring-transparent transition-all focus:bg-white/30 focus:ring-white/50"
          />
          <button
            type="submit"
            className="mt-3 w-full rounded-lg bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-primary-600 shadow-sm transition-all hover:bg-gray-50 dark:hover:bg-slate-800 hover:shadow-md"
          >
            Subscribe
          </button>
        </form>
      )}
    </div>
  );
}
