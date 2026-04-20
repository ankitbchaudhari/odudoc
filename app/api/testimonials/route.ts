import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listTestimonials,
  addTestimonial,
  updateTestimonial,
  setTestimonialStatus,
  deleteTestimonial,
  toPublicTestimonial,
  type TestimonialStatus,
} from "@/lib/testimonials-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// GET /api/testimonials            → public, published only (returns public shape)
// GET /api/testimonials?view=admin → admin, all rows (returns full shape)
export async function GET(req: NextRequest) {
  const view = req.nextUrl.searchParams.get("view");
  if (view === "admin") {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ testimonials: listTestimonials() });
  }
  const items = listTestimonials({ onlyPublished: true }).map(toPublicTestimonial);
  return NextResponse.json({ testimonials: items });
}

// POST /api/testimonials
//   Body: { name, email?, location?, rating, review, doctor?, status? }
//   Public callers submit without auth (status forced to "Pending").
//   Admins can pass status = "Published" directly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { name, email, location, rating, review, doctor, status } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof review !== "string" || !review.trim()) {
    return NextResponse.json({ error: "Review is required" }, { status: 400 });
  }
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  let finalStatus: TestimonialStatus = "Pending";
  if (status === "Published") {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (isAdmin(role)) finalStatus = "Published";
  }

  const t = addTestimonial({
    name,
    email: typeof email === "string" ? email : undefined,
    location: typeof location === "string" ? location : undefined,
    rating: r,
    review,
    doctor: typeof doctor === "string" ? doctor : undefined,
    status: finalStatus,
  });
  return NextResponse.json({ testimonial: t }, { status: 201 });
}

// PATCH /api/testimonials  — admin edit / approve / reject
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { id, action, ...patch } = body as Record<string, unknown>;
  if (typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });

  if (action === "approve") {
    const t = setTestimonialStatus(id, "Published");
    return t
      ? NextResponse.json({ testimonial: t })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (action === "reject") {
    const t = setTestimonialStatus(id, "Pending");
    return t
      ? NextResponse.json({ testimonial: t })
      : NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const t = updateTestimonial(id, {
    name: typeof patch.name === "string" ? patch.name : undefined,
    email: typeof patch.email === "string" ? patch.email : undefined,
    location: typeof patch.location === "string" ? patch.location : undefined,
    rating: typeof patch.rating === "number" ? patch.rating : undefined,
    review: typeof patch.review === "string" ? patch.review : undefined,
    doctor: typeof patch.doctor === "string" ? patch.doctor : undefined,
    status: patch.status === "Published" || patch.status === "Pending" ? patch.status : undefined,
  });
  return t
    ? NextResponse.json({ testimonial: t })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}

// DELETE /api/testimonials  { id }  — admin
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteTestimonial(id);
  return ok
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
