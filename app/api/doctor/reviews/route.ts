// GET /api/doctor/reviews
//   → {
//       reviews: [{ id, name, rating, review, createdAt, location, status }],
//       summary: { count, average, distribution: { 1,2,3,4,5 }, published, pending }
//     }
//
// Returns testimonials authored about the currently logged-in doctor.
// Matches on doctor display name (case-insensitive, trimmed) since
// testimonials are keyed by free-text doctor name.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listTestimonials } from "@/lib/testimonials-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalise(s: string | null | undefined): string {
  return (s || "").trim().toLowerCase();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; name?: string } | undefined;
  if (user?.role !== "doctor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const doctorName = normalise(user.name);
  if (!doctorName) {
    return NextResponse.json({
      reviews: [],
      summary: { count: 0, average: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, published: 0, pending: 0 },
    });
  }

  // Match strict name, plus common "Dr. X" variants.
  const candidates = new Set<string>([
    doctorName,
    doctorName.replace(/^dr\.?\s*/i, "").trim(),
    `dr. ${doctorName.replace(/^dr\.?\s*/i, "").trim()}`,
  ]);

  const all = listTestimonials();
  const mine = all.filter((t) => candidates.has(normalise(t.doctor)));

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let sum = 0;
  let published = 0;
  let pending = 0;
  for (const t of mine) {
    const r = Math.max(1, Math.min(5, Math.round(t.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[r] = (distribution[r] || 0) + 1;
    sum += t.rating;
    if (t.status === "Published") published += 1;
    else pending += 1;
  }
  const count = mine.length;
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;

  // Only expose published reviews to the doctor page publicly-shaped;
  // pending show up as "Awaiting admin approval" counters but no content.
  const reviews = mine
    .filter((t) => t.status === "Published")
    .map((t) => ({
      id: t.id,
      name: t.name,
      rating: t.rating,
      review: t.review,
      location: t.location,
      createdAt: t.createdAt,
    }));

  return NextResponse.json({
    reviews,
    summary: { count, average, distribution, published, pending },
  });
}
