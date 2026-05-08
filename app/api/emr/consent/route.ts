// Patient digital consent — list / create / revoke.
//
// Anyone signed in can post a consent if they're listed as the patient
// (matched by email). Admin / source clinic owner can list consents
// affecting them. Revoke takes a consent id.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createConsent,
  listConsentsForPatient,
  revokeConsent,
  type ConsentScope,
} from "@/lib/patient-consent-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

const VALID_SCOPES: ConsentScope[] = ["demographics_only", "summary", "full_chart", "psychiatric"];

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const consents = await listConsentsForPatient(user.email);
  return NextResponse.json({ consents });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const scope = body.scope as ConsentScope | undefined;
  if (!scope || !VALID_SCOPES.includes(scope)) {
    return NextResponse.json({ error: `scope must be one of ${VALID_SCOPES.join(", ")}` }, { status: 400 });
  }
  if (!body.sourceOwnerEmail || !body.grantedToOwnerEmail || !body.patientId) {
    return NextResponse.json(
      { error: "sourceOwnerEmail, grantedToOwnerEmail and patientId are required" },
      { status: 400 },
    );
  }
  const row = await createConsent({
    sourceOwnerEmail: String(body.sourceOwnerEmail),
    grantedToOwnerEmail: String(body.grantedToOwnerEmail),
    patientId: String(body.patientId),
    patientEmail: user.email,                 // signed-in user is the patient
    scope,
    purpose: body.purpose as string | undefined,
    signatureRef: body.signatureRef as string | undefined,
    expiresAt: body.expiresAt as string | undefined,
  });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ consent: row }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const row = await revokeConsent(id, user.email);
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ consent: row });
}
