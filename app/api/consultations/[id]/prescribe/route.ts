import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getConsultation, attachPrescription } from "@/lib/consultations-store";
import { addPrescription } from "@/lib/prescriptions-store";
import type { PrescriptionData } from "@/lib/prescription-templates";
import { sendPrescriptionToPatient } from "@/lib/consultation-emails";
import { sendPrescriptionReadyViaSentDm } from "@/lib/sent-dm";
import { sendWhatsAppTemplate } from "@/lib/sms";

import { log } from "@/lib/log";
export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";

function medicationsTable(data: PrescriptionData): string {
  if (!data.medications?.length) return "";
  const rows = data.medications
    .map(
      (m) =>
        `<tr><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;"><b>${m.name}</b><br/><span style="color:#6b7280;font-size:12px;">${m.instructions || ""}</span></td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.dose}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.frequency}</td><td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;">${m.duration}</td></tr>`
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px;"><thead><tr style="background:#f3f4f6;"><th style="text-align:left;padding:8px;">Medicine</th><th style="text-align:left;padding:8px;">Dose</th><th style="text-align:left;padding:8px;">Frequency</th><th style="text-align:left;padding:8px;">Duration</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string; role?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const c = getConsultation(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner-doctor match: a doctor can prescribe on a consultation that's
  // theirs by email, name, OR that has no doctor yet (unclaimed fan-out
  // record — sometimes the claim hasn't flushed across Lambdas by the
  // time the call ends). Admins can always prescribe.
  const uEmail = user.email.toLowerCase();
  const uName = (user.name || "").toLowerCase().replace(/^dr\.?\s+/, "").trim();
  const cName = (c.doctorName || "").toLowerCase().replace(/^dr\.?\s+/, "").trim();
  const isOwnerDoctor =
    user.role === "doctor" &&
    (
      !c.doctorEmail ||
      c.doctorEmail === uEmail ||
      (!!uName && !!cName && cName === uName)
    );
  const isAdmin = user.role === "admin";
  if (!isOwnerDoctor && !isAdmin) {
    log.error("prescribe.forbidden", undefined, {
      args: [
        "[prescribe] rejected:",
        {
          consultationId: id,
          sessionEmail: uEmail,
          sessionName: user.name,
          sessionRole: user.role,
          consultDoctorEmail: c.doctorEmail,
          consultDoctorName: c.doctorName,
        },
      ],
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const data = body.data as Partial<PrescriptionData> | undefined;
  const templateId = typeof body.templateId === "string" ? body.templateId : "classic-blue";
  if (!data || !Array.isArray(data.medications)) {
    return NextResponse.json({ error: "data.medications required" }, { status: 400 });
  }

  const fullData: PrescriptionData = {
    doctorName: data.doctorName || c.doctorName,
    doctorQualification: data.doctorQualification || "",
    doctorRegistration: data.doctorRegistration || "",
    doctorSpecialty: data.doctorSpecialty || c.specialty,
    clinicName: data.clinicName || "OduDoc Online Clinic",
    clinicAddress: data.clinicAddress || "OduDoc Telemedicine",
    clinicPhone: data.clinicPhone || "",
    clinicEmail: data.clinicEmail || c.doctorEmail,
    patientName: data.patientName || c.patientName,
    patientAge: data.patientAge || "",
    patientGender: data.patientGender || "",
    patientId: data.patientId || c.id,
    patientPhone: data.patientPhone || c.patientPhone,
    date: data.date || new Date().toISOString().slice(0, 10),
    symptoms: data.symptoms || c.medicalHistory.symptoms,
    diagnosis: data.diagnosis || "",
    medications: data.medications,
    tests: data.tests || [],
    advice: data.advice || "",
    followUp: data.followUp || "",
    signature: data.signature || c.doctorName,
  };

  const rx = addPrescription({
    doctorEmail: c.doctorEmail,
    patientEmail: c.patientEmail,
    templateId,
    data: fullData,
  });

  attachPrescription(id, rx.id);

  const viewUrl = `${SITE_URL}/prescription/${rx.id}`;
  const buyUrl = `${SITE_URL}/shop?rx=${rx.id}`;
  sendPrescriptionToPatient({
    to: c.patientEmail,
    patientName: c.patientName,
    doctorName: c.doctorName,
    prescriptionId: rx.id,
    medicationsHtml: medicationsTable(fullData),
    buyUrl,
    viewUrl,
  }).catch(console.error);

  // WhatsApp template — prefers Meta Cloud API direct (no BSP markup)
  // when META_WA_TEMPLATE_PRESCRIPTION_READY is set, falls back to
  // sent.dm (SENTDM_TEMPLATE_PRESCRIPTION_READY) → Twilio. The template
  // header is a PDF document so the patient receives the actual
  // prescription attached, not just a link. View URL is included as
  // the URL-button substitution.
  const patientPhone = data.patientPhone || c.patientPhone;
  if (patientPhone) {
    sendWhatsAppTemplate(
      patientPhone,
      process.env.TWILIO_WA_PRESCRIPTION_CONTENT_SID,
      {
        "1": c.patientName || "there",
        "2": c.doctorName || "your doctor",
        "3": rx.id,
      },
      {
        metaTemplate: process.env.META_WA_TEMPLATE_PRESCRIPTION_READY,
        metaLanguageCode: process.env.META_WA_LOCALE || "en",
        sentDmTemplate: process.env.SENTDM_TEMPLATE_PRESCRIPTION_READY,
      },
    )
      .then((r) => {
        if (!r.ok && !r.skipped) {
          log.warn("prescription.wa_template_failed", { error: r.error || "unknown" });
          // Fallback to legacy sent.dm direct call if the chained path
          // returned an error (e.g. all template names missing). Keeps
          // existing deployments working until Meta templates are
          // approved.
          sendPrescriptionReadyViaSentDm(patientPhone, {
            patientName: c.patientName || "there",
            doctorName: c.doctorName || "your doctor",
          }).catch(() => {});
        }
      })
      .catch((err) =>
        log.warn("prescription.wa_template_threw", {
          error: err instanceof Error ? err.message : "send threw",
        }),
      );
  }

  return NextResponse.json({ prescription: rx, viewUrl, buyUrl });
}
