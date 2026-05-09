// Family dependents — list + create.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listDependents,
  createDependent,
  type Relationship,
  type Sex,
} from "@/lib/family-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RELATIONSHIPS: Relationship[] = [
  "child", "spouse", "parent", "sibling", "grandparent",
  "grandchild", "in_law", "ward", "other",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  return NextResponse.json({ dependents: listDependents(userId) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  const body = await req.json();
  const name = String(body.name || "").trim();
  const relationship = String(body.relationship || "") as Relationship;
  if (!name) return NextResponse.json({ error: "missing_name" }, { status: 400 });
  if (!ALLOWED_RELATIONSHIPS.includes(relationship)) {
    return NextResponse.json({ error: "invalid_relationship" }, { status: 400 });
  }
  // Soft cap. Owners abusing the system to spam profiles is the
  // most likely source of growth-loop abuse; 12 dependents is more
  // than enough for the largest extended family use case.
  const existing = listDependents(userId);
  if (existing.length >= 12) {
    return NextResponse.json({ error: "dependent_limit_reached" }, { status: 400 });
  }
  const sex = body.sex as Sex | undefined;
  const dependent = createDependent({
    ownerUserId: userId,
    name,
    relationship,
    dateOfBirth: body.dateOfBirth || undefined,
    sex,
    phone: body.phone,
    photoUrl: body.photoUrl,
    abhaId: body.abhaId,
    allergies: Array.isArray(body.allergies) ? body.allergies : undefined,
    currentMeds: Array.isArray(body.currentMeds) ? body.currentMeds : undefined,
    weightKg: typeof body.weightKg === "number" ? body.weightKg : undefined,
    notes: body.notes,
  });
  try { await awaitAllFlushesStrict(); } catch {
    return NextResponse.json({ error: "saved_but_not_persisted" }, { status: 500 });
  }
  return NextResponse.json({ dependent });
}
