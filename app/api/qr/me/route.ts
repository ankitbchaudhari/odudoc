// GET /api/qr/me — list the signed-in patient's QRs (token previews
// only — full tokens stay server-side except when explicitly
// requested by the holder via the dashboard).

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listQrsForPatient, ensureIdentityQr, ensureEmergencyQr } from "@/lib/qr-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const patientId = session.user.id || session.user.email;

  // Always ensure the identity + emergency QRs exist — patients
  // expect to see these two on their My QRs page from day one.
  await ensureIdentityQr(patientId, session.user.email);
  await ensureEmergencyQr(patientId, session.user.email);

  const tokens = await listQrsForPatient(patientId);
  // Return the full token to the patient — they own these and the
  // dashboard renders the QR image from them.
  return NextResponse.json({ tokens });
}
