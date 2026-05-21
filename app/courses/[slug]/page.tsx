// Single course detail page — V8 §1.
//
// Public read; enrolment requires sign-in. The enrol button posts
// to /api/courses/[slug]/enrol which charges the student wallet
// for paid tiers.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourseBySlug, type CourseTier } from "@/lib/courses-store";
import EnrolButton from "./EnrolButton";

export const revalidate = 60;

interface Params { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const c = await getCourseBySlug(slug);
  if (!c) return { title: "Course not found — OduDoc" };
  return {
    title: `${c.title} — OduDoc Academy`,
    description: c.tagline,
  };
}

const TIER_PILL: Record<CourseTier, string> = {
  free:    "bg-emerald-500/20 text-emerald-100",
  paid:    "bg-amber-500/20 text-amber-100",
  premium: "bg-fuchsia-500/20 text-fuchsia-100",
};

function fmtPrice(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString()}`;
}

export default async function CourseDetailPage({ params }: Params) {
  const { slug } = await params;
  const c = await getCourseBySlug(slug);
  if (!c) notFound();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-[#0F6E56] via-[#0A5942] to-[#042C53] py-16 text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Link href="/courses" className="text-xs font-semibold text-white/70 hover:underline">
            ← All courses
          </Link>
          <div className="mt-4 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_PILL[c.tier]}`}>{c.tier}</span>
            <span className="text-xs uppercase tracking-wider text-white/70">{c.level.replace("_", " ")}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{c.title}</h1>
          <p className="mt-3 text-lg text-white/85">{c.tagline}</p>
          <p className="mt-2 text-sm text-white/60">By {c.providerName}</p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div>
            <h2 className="text-xl font-bold text-gray-900">About this course</h2>
            <p className="mt-3 whitespace-pre-line text-base leading-relaxed text-gray-700">{c.description}</p>

            {c.tags.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Topics</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full border border-[#0F6E56]/30 px-3 py-1 text-xs font-medium text-[#0F6E56]">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-3xl font-extrabold text-[#0F6E56]">{fmtPrice(c.priceCents, c.currency)}</p>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li>📚 {c.effortHours} hours of content</li>
              <li>📈 {c.level.replace("_", " ")} level</li>
              {c.cmeCredits && <li>🎓 {c.cmeCredits} CME credits</li>}
              <li>📱 Mobile-friendly</li>
              <li>🔒 Blockchain certificate</li>
            </ul>
            <div className="mt-5">
              <EnrolButton slug={c.slug} tier={c.tier} priceCents={c.priceCents} currency={c.currency} />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
