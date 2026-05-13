// Issue a QR token for the active profile (self or active dependent).
//
// GET → { token, qrUrl, profile }
//
// The QR encodes a signed token. We also return a qrUrl pointing at a
// public QR-image service so the dashboard can render the QR without
// pulling in a JS QR library — simplest path that works.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveActiveProfile } from "@/lib/family-active";
import { findUserById } from "@/lib/users-store";
import { issuePassportToken } from "@/lib/health-passport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const active = await resolveActiveProfile(userId);
  let medicalId = "";
  let displayName = "You";
  let dependentId: string | undefined;
  if (active.kind === "dependent") {
    medicalId = active.medicalId;
    displayName = active.dependentName;
    dependentId = active.dependentId;
  } else {
    const u = findUserById(userId);
    medicalId = u?.medicalId || "";
    displayName = u?.name || "You";
  }
  if (!medicalId) {
    return NextResponse.json({ error: "no_medical_id" }, { status: 400 });
  }

  const token = issuePassportToken({ userId, dependentId, medicalId });

  // Public-image QR service — works without bundling a QR library and
  // re-renders instantly on any browser. Production deployments may
  // want to swap in a self-hosted generator for offline reliability.
  const data = encodeURIComponent(token);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${data}`;

  return NextResponse.json({
    token,
    qrUrl,
    profile: {
      name: displayName,
      medicalId,
      // Canonical Medical ID format is `NNN-NNNNN-NNNNN-NNN` already
       // — handed back as-is so this surface matches /profile and any
       // other place that renders the ID. The previous 4-char re-chunk
       // produced double dashes like `026--9122-5-04-756--518`.
      formattedMedicalId: medicalId,
      isDependent: active.kind === "dependent",
    },
  });
}
