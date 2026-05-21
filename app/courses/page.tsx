// Public course marketplace — V8 §1.
//
// SSG'd with 60s ISR. The page is public; enrolment requires
// sign-in (the CTA links to /courses/[slug] which gates the enrol
// button).

import Link from "next/link";
import { listCourses, type CourseTier } from "@/lib/courses-store";

export const revalidate = 60;
export const metadata = {
  title: "Courses — OduDoc Academy",
  description: "Medical CME, certification, and PG-prep courses on OduDoc. Browse and enrol.",
};

const TIER_PILL: Record<CourseTier, string> = {
  free:    "bg-emerald-100 text-emerald-800",
  paid:    "bg-amber-100 text-amber-800",
  premium: "bg-fuchsia-100 text-fuchsia-800",
};

function fmtPrice(cents: number, currency: string): string {
  if (cents === 0) return "Free";
  const sym = currency === "INR" ? "₹" : "$";
  return `${sym}${(cents / 100).toLocaleString()}`;
}

export default async function CoursesPage() {
  const courses = await listCourses();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#0F6E56] via-[#0A5942] to-[#042C53] py-20 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">OduDoc Academy</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Learn medicine, the way you practise it.
          </h1>
          <p className="mt-4 text-lg text-white/85">
            CME, certification, and PG-prep courses for clinicians at every
            stage. Mobile-first. Blockchain-verified certificates.
          </p>
        </div>
      </section>

      {/* Catalogue */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Browse courses</h2>
            <p className="mt-1 text-sm text-gray-600">{courses.length} courses available.</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-10 text-center text-sm text-gray-500">
            No courses published yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => (
              <Link
                key={c.id}
                href={`/courses/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
              >
                <div className="relative h-40 bg-gradient-to-br from-[#0F6E56] to-[#042C53]">
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <span className="text-4xl font-extrabold opacity-30">{c.title.charAt(0)}</span>
                    </div>
                  )}
                  <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${TIER_PILL[c.tier]}`}>
                    {c.tier}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#0F6E56]">{c.providerName}</p>
                  <h3 className="mt-1 text-base font-bold text-gray-900 group-hover:text-[#0F6E56]">{c.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-gray-600">{c.tagline}</p>
                  <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                    <span className="text-xs text-gray-500">
                      {c.effortHours}h · {c.level.replace("_", " ")}
                      {c.cmeCredits && ` · ${c.cmeCredits} CME`}
                    </span>
                    <span className="text-base font-bold text-[#0F6E56]">{fmtPrice(c.priceCents, c.currency)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Why-us strip */}
      <section className="bg-gray-50 py-12">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:grid-cols-3 sm:px-6">
          <Tile emoji="🎓" title="Verified certificates" body="Every completion certificate is hashed on a tamper-evident chain. Recruiters and councils can verify in one click." />
          <Tile emoji="📱" title="Mobile-first" body="Designed for the OduDoc Pro app. Learn between consults." />
          <Tile emoji="🌍" title="14 languages" body="Pre-translated medical content — not AI free-form translation, professionally reviewed." />
        </div>
      </section>
    </div>
  );
}

function Tile({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-center">
      <div className="text-3xl">{emoji}</div>
      <h3 className="mt-2 text-sm font-bold text-gray-900">{title}</h3>
      <p className="mt-1 text-xs text-gray-600">{body}</p>
    </div>
  );
}
