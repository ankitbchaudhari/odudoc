// Layout shell for the /doctors/* routes.
//
// We used to gate the entire subtree behind a sign-in redirect here,
// but that broke the most important funnel: a doctor shares their
// QR / profile URL on WhatsApp, the patient taps it, and instead of
// landing on the doctor's bookable profile they got punted to a
// generic login page with no context. They never came back.
//
// New policy:
//   - /doctors          (directory listing) — auth-gated inside the
//                       page itself, since browsing all doctors is
//                       lead-capture territory
//   - /doctors/[id]     (individual profile) — fully public so the
//                       patient can read the bio, see the slots, and
//                       hit "Book" without first creating an account.
//                       The booking flow itself still verifies their
//                       phone via OTP, so identity is captured at
//                       the moment of intent rather than upfront.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Doctors — Verified Specialists Near You",
  description:
    "Browse verified doctors by specialty, city and rating. Book video consultations or in-clinic visits on OduDoc.",
  alternates: { canonical: "/doctors" },
  openGraph: {
    title: "Find Doctors — Verified Specialists | OduDoc",
    description: "Browse verified doctors by specialty, city and rating.",
    url: "/doctors",
    type: "website",
  },
};

export default function DoctorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
