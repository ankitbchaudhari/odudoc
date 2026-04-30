// POST /api/ai/postvisit
//
// Patient-facing follow-up question answerer. Auth is the patient's own
// next-auth session; the route fetches their own consultation by ID
// (only consultations they own — server-side scope) and uses it as
// context for the answer.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { answerPostVisitQuestion } from "@/lib/ai-postvisit";
import { getConsultation } from "@/lib/consultations-store";
import { getPrescription } from "@/lib/prescriptions-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Strict per-IP limit: a misbehaving client could spam this endlessly,
  // each call costs Gemini tokens. 30/10min is plenty for a real patient
  // chatting with their post-visit summary.
  const blocked = await enforceRateLimit(req, "ai-postvisit", 30, "10 m");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { consultationId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const consultationId = body.consultationId?.trim();
  const question = body.question?.trim();
  if (!consultationId || !question) {
    return NextResponse.json({ error: "consultationId and question required" }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "Question is too long (max 1000 chars)." }, { status: 413 });
  }

  const consultation = getConsultation(consultationId);
  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }
  // Patients can only Q&A their own consultation. Doctors and admin
  // can also call (they may want to see what the patient is being told).
  const ownerEmail = consultation.patientEmail?.toLowerCase();
  const callerEmail = user.email.toLowerCase();
  const role = user.role;
  const isOwner = ownerEmail === callerEmail;
  const isStaff = role === "admin" || role === "doctor" || role === "nurse";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Pull prescribed medicines if a prescription is attached.
  let medicines: Array<{ name: string; dose?: string; frequency?: string; duration?: string }> = [];
  if (consultation.prescriptionId) {
    try {
      const rx = getPrescription(consultation.prescriptionId);
      if (rx?.data?.medications && Array.isArray(rx.data.medications)) {
        medicines = rx.data.medications.map((m) => ({
          name: m.name || "",
          dose: m.dose,
          frequency: m.frequency,
          duration: m.duration,
        })).filter((m) => m.name);
      }
    } catch (err) {
      log.warn("ai_postvisit.rx_lookup_failed", { consultationId, err: String(err) });
    }
  }

  try {
    const result = await answerPostVisitQuestion({
      question,
      context: {
        chiefComplaint: consultation.medicalHistory?.chiefComplaint,
        diagnosis: consultation.medicalHistory?.symptoms || undefined,
        treatmentPlan: medicines.length
          ? medicines.map((m) => `${m.name} ${m.dose || ""} ${m.frequency || ""} for ${m.duration || ""}`.trim()).join("; ")
          : undefined,
        prescribedMedicines: medicines,
        doctorName: consultation.doctorName,
        visitDate: consultation.dateLabel || consultation.scheduledFor,
      },
    });
    return NextResponse.json({ result });
  } catch (err) {
    log.error("ai_postvisit.failed", err);
    const msg = err instanceof Error ? err.message : "Q&A failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI assistant is not configured."
          : "Could not answer right now. Try again in a moment.",
      },
      { status: 502 }
    );
  }
}
