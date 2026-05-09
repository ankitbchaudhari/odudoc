// Patient-side consent vault — list + grant.
//
// GET → list every consent the signed-in user has issued (across self
//       and dependents).
// POST { grantedToOrgId, scopes[], ttlHours?, dependentId?, note? }
//   → grant or extend consent.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listAllConsentsForOwner,
  grantConsent,
  type PassportScope,
} from "@/lib/health-passport-store";
import { getDependentForOwner } from "@/lib/family-store";
import { getOrganizationById } from "@/lib/organizations-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_SCOPES: PassportScope[] = [
  "allergies", "current_meds", "diagnoses",
  "prescriptions", "vaccinations", "vitals",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const list = listAllConsentsForOwner(userId);
  // Expand org names so the UI doesn't need a second roundtrip.
  const expanded = list.map((c) => {
    const org = getOrganizationById(c.grantedToOrgId);
    return {
      ...c,
      orgName: org?.name || "(unknown)",
      orgCountry: org?.country,
      isExpired: c.expiresAt ? new Date(c.expiresAt).getTime() < Date.now() : false,
    };
  });
  return NextResponse.json({ consents: expanded });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const body = await req.json();
  const grantedToOrgId = String(body.grantedToOrgId || "").trim();
  if (!grantedToOrgId) return NextResponse.json({ error: "missing_org" }, { status: 400 });
  const target = getOrganizationById(grantedToOrgId);
  if (!target) return NextResponse.json({ error: "org_not_found" }, { status: 404 });
  if (target.status !== "active") {
    return NextResponse.json({ error: "org_inactive" }, { status: 400 });
  }
  const dependentId = body.dependentId ? String(body.dependentId) : undefined;
  if (dependentId) {
    const d = getDependentForOwner(dependentId, userId);
    if (!d) return NextResponse.json({ error: "dependent_not_owned" }, { status: 403 });
  }
  const rawScopes: string[] = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes = rawScopes.filter((s): s is PassportScope =>
    ALLOWED_SCOPES.includes(s as PassportScope),
  );
  const ttlHours = typeof body.ttlHours === "number" && body.ttlHours > 0 && body.ttlHours <= 24 * 365
    ? body.ttlHours
    : undefined;
  const consent = grantConsent({
    ownerUserId: userId,
    dependentId,
    grantedToOrgId,
    scopes,
    ttlHours,
    note: body.note ? String(body.note).slice(0, 500) : undefined,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ consent });
}
