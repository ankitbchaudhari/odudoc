// POST /api/qr/issue — patient issues a new QR.
//
// kind=consent is the main path (patient creates a scoped share);
// kind=identity / emergency are normally auto-provisioned via
// /api/qr/me but a patient can re-issue if needed.
//
// For kind=appointment + kind=wristband — issued server-side from
// booking + admission flows. Direct API access blocked here.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { issueQr, type ScopeField } from "@/lib/qr-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

const Schema = z.object({
  kind: z.enum(["consent", "identity", "emergency"]),
  label: z.string().max(200).optional(),
  validityHours: z.number().min(1).max(24 * 30).optional(),
  /** Consent-only: which data fields the scanner may see. */
  fields: z.array(z.enum([
    "identity", "allergies", "blood_group", "chronic_conditions",
    "current_medications", "ice_contacts", "abha_id",
    "recent_consultations", "recent_prescriptions", "recent_lab_results",
    "active_admission", "vital_signs_24h", "vaccinations", "discharge_summaries",
  ])).max(14).optional(),
  /** Consent-only: pin the QR to a specific doctor. */
  scannerDoctorId: z.string().max(64).optional(),
  /** Consent-only: time-bound the *data* visible (not the QR validity). */
  dataFromDate: z.string().optional(),
  dataToDate: z.string().optional(),
  usage: z.enum(["single", "multi"]).optional(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const blocked = await enforceRateLimit(request, "qr-issue", 20, "10 m");
  if (blocked) return blocked;

  const parsed = await parseJson(request, Schema);
  if (parsed instanceof NextResponse) return parsed;

  const patientId = session.user.id || session.user.email;

  const t = await issueQr({
    kind: parsed.kind,
    patientId,
    createdByEmail: session.user.email,
    label: parsed.label,
    validityHours: parsed.validityHours,
    usage: parsed.usage,
    scope: parsed.kind === "consent"
      ? {
          fields: (parsed.fields as ScopeField[] | undefined) || ["identity"],
          scannerRoles: ["doctor"],
          scannerDoctorId: parsed.scannerDoctorId,
          dataFromDate: parsed.dataFromDate,
          dataToDate: parsed.dataToDate,
        }
      : undefined,
  });
  return NextResponse.json({ token: t }, { status: 201 });
}
