import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Press",
  description: "Press kit, brand assets, and media enquiries for OduDoc.",
  alternates: { canonical: "/press" },
};

export default function PressPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Press &amp; media</p>
      <h1 className="mt-2 text-4xl font-extrabold text-gray-900 dark:text-slate-100">
        Tell the OduDoc story
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-gray-600 dark:text-slate-300">
        Brand assets, founder bios, fact sheets, and high-resolution screenshots for journalists, analysts, and partners.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Fact sheet</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-300">
            <li><strong>Founded:</strong> 2024</li>
            <li><strong>Headquarters:</strong> Operated by Sarjudas Digital Trading and Escrow Services LLC</li>
            <li><strong>Stage:</strong> Pre-launch · pilot hospitals onboarding</li>
            <li><strong>Geographies:</strong> India (primary) + 18 country tax engine</li>
            <li><strong>Compliance:</strong> ABDM / ABHA, IMC telemedicine, HIPAA-aligned, DPDP</li>
            <li><strong>Stack:</strong> Next.js 14 · Vercel · Postgres · Gemini AI</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Brand assets</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
            Logo files (SVG / PNG), wordmark variants, brand colours, screenshots for use in articles and decks.
          </p>
          <Link
            href="/contact?subject=press-assets"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Request press kit →
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Media enquiries</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">
            For interviews, quotes, or briefings, email{" "}
            <a className="text-emerald-600 hover:underline" href="mailto:press@odudoc.com">press@odudoc.com</a>{" "}
            — we aim to respond within 24 hours on business days.
          </p>
        </div>
      </div>
    </main>
  );
}
