// /p/* — universal-link shortlinks for the patient app.
//
// Same pattern as /d/* — the OS intercepts these when the patient app
// is installed; otherwise this page falls back to the equivalent web
// route. Keeps every shareable URL functional regardless of whether
// the recipient has the app.
//
// Mapping:
//   /p/video-call/<id>     → /dashboard/consultations/<id>
//   /p/post-visit/<id>     → /dashboard/consultations/<id>
//   /p/prescription/<id>   → /prescription/<id>
//   /p/doctor/<id>         → /doctors/<id>
//   /p/booking/<doctorId>  → /consult/book?doctor=<doctorId>
//   /p/refer-doctor        → /dashboard/refer-doctor
//   /p/pricing             → /pricing
//   anything else          → /dashboard

import { redirect } from "next/navigation";

interface Params {
  params: Promise<{ slug: string[] }>;
}

function targetFor(parts: string[]): string {
  const [head, second] = parts;
  switch (head) {
    case "video-call":
    case "post-visit":
      return second ? `/dashboard/consultations/${second}` : "/dashboard/consultations";
    case "prescription":
      return second ? `/prescription/${second}` : "/dashboard/prescriptions";
    case "doctor":
      return second ? `/doctors/${second}` : "/doctors";
    case "booking":
      return second ? `/consult/book?doctor=${encodeURIComponent(second)}` : "/consult/book";
    case "refer-doctor":
      return "/dashboard/refer-doctor";
    case "pricing":
      return "/pricing";
    case "appointments":
      return "/dashboard/consultations";
    default:
      return "/dashboard";
  }
}

export default async function PatientShortlinkPage({ params }: Params) {
  const { slug } = await params;
  const parts = Array.isArray(slug) ? slug : [];
  const target = targetFor(parts);
  redirect(target);
}

export const dynamic = "force-dynamic";
