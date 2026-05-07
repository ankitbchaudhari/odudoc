"use client";

// Tiny shared primitives used by both the dashboard guide and the
// public /for-doctors/guide page. Pulled out into one file so a
// styling tweak (e.g. heading size) lands in both surfaces at once.

import Link from "next/link";
import type { ReactNode } from "react";

export function Section({
  id,
  title,
  tagline,
  children,
}: {
  id: string;
  title: string;
  tagline?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <header className="mb-4 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h2>
        {tagline && <p className="mt-1 text-sm text-slate-500">{tagline}</p>}
      </header>
      <div className="space-y-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}

export function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white shadow">
        {n}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="mt-1 text-sm leading-6 text-slate-700">{children}</div>
      </div>
    </div>
  );
}

export function Tips({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {items.map((t) => (
        <li key={t} className="flex gap-2 text-sm text-slate-700">
          <span
            aria-hidden
            className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-primary-500"
          />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Cta({
  href,
  label,
  variant = "solid",
}: {
  href: string;
  label: string;
  variant?: "solid" | "ghost";
}) {
  const cls =
    variant === "solid"
      ? "inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
      : "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50";
  return (
    <Link href={href} className={`mt-3 ${cls}`}>
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}
