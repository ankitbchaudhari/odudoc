// /d/* — universal-link shortlinks for the doctor app.
//
// When a user has the doctor app installed, Android/iOS intercept
// these URLs and open the app at the matching screen (Expo Router
// path-matches /d/video-call/<id> → app/video-call/[id].tsx).
//
// When the user does NOT have the app, they hit this Next.js page,
// which redirects them to the equivalent web route OR to the doctor
// app store page so they can install + open it.
//
// Mapping table (path under /d/ → web route OR install prompt):
//   /d/video-call/<id>  → /dashboard/doctor/consultations/<id>
//   /d/patient/<id>     → /dashboard/doctor/emr/patients/<id>
//   /d/dictionary       → /dashboard/doctor/dictionary
//   /d/ai-usage         → /dashboard/doctor/ai-usage
//   anything else       → /dashboard/doctor

import { redirect } from "next/navigation";

interface Params {
  params: Promise<{ slug: string[] }>;
}

const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.odudoc.doctor";

function targetFor(parts: string[]): string {
  const [head, second] = parts;
  switch (head) {
    case "video-call":
      // No web video-call route per consultation id; route to the
      // doctor's consultation detail screen which is the closest match.
      return second ? `/dashboard/doctor/consultations/${second}` : "/dashboard/doctor";
    case "patient":
      return second ? `/dashboard/doctor/emr/patients/${second}` : "/dashboard/doctor/emr";
    case "dictionary":
      return "/dashboard/doctor/dictionary";
    case "ai-usage":
      return "/dashboard/doctor/ai-usage";
    case "consultations":
    case "appointments":
      return "/dashboard/doctor/consultations";
    default:
      return "/dashboard/doctor";
  }
}

export default async function DoctorShortlinkPage({ params }: Params) {
  const { slug } = await params;
  const parts = Array.isArray(slug) ? slug : [];
  const target = targetFor(parts);
  redirect(target);
}

// Always rendered dynamically since `redirect()` is called on every
// request. We don't want Next caching the redirect target.
export const dynamic = "force-dynamic";
