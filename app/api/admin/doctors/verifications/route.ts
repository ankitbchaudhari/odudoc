// Admin verification queue — list doctors filtered by their
// verification state. Query param `state`:
//   pending  — submission landed, not yet acted on
//   verified — admin already approved
//   rejected — admin returned with a reason
//   all      — everything (default)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDoctors, reloadDoctors } from "@/lib/doctors-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await reloadDoctors();
  const state = req.nextUrl.searchParams.get("state") || "all";
  const all = listDoctors({});
  const filtered = all.filter((d) => {
    const submitted = !!d.verificationSubmittedAt;
    const verified = !!d.verified;
    const rejected = !submitted && !verified && !!d.verificationRejectionReason;
    if (state === "pending") return submitted && !verified;
    if (state === "verified") return verified;
    if (state === "rejected") return rejected;
    return true;
  });

  // Counts shown in the tabs.
  const counts = {
    pending: all.filter((d) => d.verificationSubmittedAt && !d.verified).length,
    verified: all.filter((d) => d.verified).length,
    rejected: all.filter(
      (d) =>
        !d.verificationSubmittedAt && !d.verified && !!d.verificationRejectionReason
    ).length,
    all: all.length,
  };

  // Strip internal fields the admin UI doesn't need + sort by most-recently-actioned.
  const doctors = filtered
    .map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      phone: d.phone,
      specialty: d.specialty,
      country: d.country,
      verified: !!d.verified,
      verifiedAt: d.verifiedAt,
      verifiedBy: d.verifiedBy,
      verificationSubmittedAt: d.verificationSubmittedAt,
      verificationDocs: d.verificationDocs,
      verificationRejectionReason: d.verificationRejectionReason,
      licenseCountry: d.licenseCountry,
      licenseNumber: d.licenseNumber,
      licenseExpiry: d.licenseExpiry,
      joinedAt: d.joinedAt,
    }))
    .sort((a, b) => {
      // Pending first (most recent submission), then verified by
      // most-recent verifiedAt, then rejected/created falling back
      // to joinedAt.
      const aPriority = a.verificationSubmittedAt
        ? a.verificationSubmittedAt
        : a.verifiedAt || a.joinedAt;
      const bPriority = b.verificationSubmittedAt
        ? b.verificationSubmittedAt
        : b.verifiedAt || b.joinedAt;
      return bPriority.localeCompare(aPriority);
    });

  return NextResponse.json({ doctors, counts, state });
}
