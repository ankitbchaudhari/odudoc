import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsultation, updateMedicalHistory, type MedicalHistory } from "@/lib/consultations-store";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isPatient = c.patientEmail === user.email.toLowerCase();
  const isAdmin = user.role === "admin";
  if (!isPatient && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const mh: MedicalHistory = {
    chiefComplaint: String(body.chiefComplaint || "").trim(),
    symptoms: String(body.symptoms || "").trim(),
    duration: String(body.duration || ""),
    severity: (body.severity || "") as MedicalHistory["severity"],
    allergies: String(body.allergies || ""),
    currentMedications: String(body.currentMedications || ""),
    pastConditions: String(body.pastConditions || ""),
    surgeries: String(body.surgeries || ""),
    familyHistory: String(body.familyHistory || ""),
    smoker: (body.smoker || "") as MedicalHistory["smoker"],
    alcohol: (body.alcohol || "") as MedicalHistory["alcohol"],
    pregnant: (body.pregnant || "") as MedicalHistory["pregnant"],
    additional: String(body.additional || ""),
  };

  if (!mh.chiefComplaint || mh.chiefComplaint.length < 3) {
    return NextResponse.json({ error: "Chief complaint is required" }, { status: 400 });
  }
  if (!mh.symptoms || mh.symptoms.length < 3) {
    return NextResponse.json({ error: "Symptoms are required" }, { status: 400 });
  }

  const updated = updateMedicalHistory(id, mh);
  return NextResponse.json({ consultation: updated });
}
