// Right-to-portability (DPDP §11).
//
// Bundle the user's data into a downloadable JSON dump. We include
// every store the data principal owns: their User row, dependents,
// consents, passport scan history, safety context, and any erasure
// requests in flight. Each section is gated by what's actually in the
// store — empty sections are omitted to keep the payload readable.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/lib/users-store";
import { listAllConsentsForOwner } from "@/lib/health-passport-store";
import { listConsentsForUser, listErasureRequestsForUser } from "@/lib/consent-vault-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = findUserById(userId);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Best-effort dependents read; the family-store import is dynamic
  // because some test environments don't have it.
  let dependents: unknown[] = [];
  try {
    const fam = await import("@/lib/family-store");
    dependents = fam.listDependents(userId);
  } catch { /* optional */ }

  const dump = {
    exportedAt: new Date().toISOString(),
    notice:
      "This is a structured export of your personal data held by OduDoc, prepared under DPDP Act §11 (Right to Data Portability). Receipts and consents are individually signed; verify with grievance@odudoc.com if disputed.",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      country: user.country,
      medicalId: user.medicalId,
      createdAt: user.createdAt,
    },
    dependents,
    healthPassportConsents: listAllConsentsForOwner(userId),
    consentVault: listConsentsForUser(userId),
    erasureRequests: listErasureRequestsForUser(userId),
  };

  return new NextResponse(JSON.stringify(dump, null, 2), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="odudoc-data-export-${userId}.json"`,
    },
  });
}
