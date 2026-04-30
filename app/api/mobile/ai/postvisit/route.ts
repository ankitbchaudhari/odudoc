// POST /api/mobile/ai/postvisit
//
// Mobile-Bearer-auth equivalent of /api/ai/postvisit. Patient-facing
// follow-up Q&A grounded in the consultation record + prescription.
//
// Body: { consultationId: string, question: string }
// Returns: { result: PostVisitAnswer }

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { answerPostVisitQuestion } from "@/lib/ai-postvisit";
import { getConsultation } from "@/lib/consultations-store";
import { getPrescription } from "@/lib/prescriptions-store";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "mobile-ai-postvisit", 30, "10 m");
  if (blocked) return blocked;

  const auth = await requireMobileUser(req);
  if (auth instanceof NextResponse) return auth;

  let body: { consultationId?: string; question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const consultationId = body.consultationId?.trim();
  const question = body.question?.trim();
  if (!consultationId || !question) {
    return NextResponse.json(
      { error: "consultationId and question required" },
      { status: 400 },
    );
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "Question too long" }, { status: 413 });
  }

  const consultation = getConsultation(consultationId);
  if (!consultation) {
    return NextResponse.json({ error: "Consultation not found" }, { status: 404 });
  }

  // Patients can only Q&A their own consultation. Doctors / admin can
  // peek (they may want to see what's being told to their patients).
  const ownerEmail = consultation.patientEmail?.toLowerCase();
  const callerEmail = auth.email.toLowerCase();
  const isOwner = ownerEmail === callerEmail;
  const isStaff = auth.role === "admin" || auth.role === "doctor" || auth.role === "nurse";
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      log.warn("mobile_ai_postvisit.rx_lookup_failed", { consultationId, err: String(err) });
    }
  }

  try {
    const result = await answerPostVisitQuestion({
      question,
      callerEmail: auth.email,
      patientEmail: consultation.patientEmail,
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
    log.error("mobile_ai_postvisit.failed", err);
    const msg = err instanceof Error ? err.message : "Q&A failed";
    return NextResponse.json(
      {
        error: /GEMINI_API_KEY/.test(msg)
          ? "AI assistant is not configured."
          : "Could not answer right now. Try again in a moment.",
      },
      { status: 502 },
    );
  }
}
