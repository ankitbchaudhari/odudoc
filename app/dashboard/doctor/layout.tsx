// Layout wrapper for the entire doctor dashboard tree.
// Mounts DoctorVerificationGate so unverified doctors see the
// submission flow regardless of which /dashboard/doctor/* page they
// land on (deep links from emails, bookmarks, etc).
//
// The gate itself short-circuits server-side (returns null while
// loading) so verified doctors don't see a flash of the gate before
// the dashboard renders.
//
// Sub-page-specific routes that the verification API itself relies
// on (uploads to /api/doctors/me/verification) bypass via
// /api endpoints — they're not under /dashboard/doctor/*.

import DoctorVerificationGate from "@/components/DoctorVerificationGate";

export default function DoctorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DoctorVerificationGate>{children}</DoctorVerificationGate>;
}
