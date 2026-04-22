import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  addPrescription,
  listPrescriptions,
  type PrescriptionRecord,
} from "@/lib/prescriptions-store";
import type { PrescriptionData } from "@/lib/prescription-templates";
import { sendEmail } from "@/lib/email";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// POST /api/prescriptions
// Doctor (or admin) saves a prescription. doctorEmail is taken from the session
// so we never trust a client-supplied author.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "doctor" && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    patientEmail?: string;
    templateId?: string;
    data?: PrescriptionData;
    notifyPatient?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const patientEmail = (body.patientEmail || "").trim().toLowerCase();
  const templateId = (body.templateId || "").trim();
  const data = body.data;

  if (!patientEmail || !templateId || !data) {
    return NextResponse.json(
      { error: "patientEmail, templateId, and data are required" },
      { status: 400 }
    );
  }
  if (!data.patientName || !data.diagnosis || !Array.isArray(data.medications)) {
    return NextResponse.json(
      { error: "Prescription data missing required fields" },
      { status: 400 }
    );
  }

  const rx = addPrescription({
    doctorEmail: user.email.toLowerCase(),
    patientEmail,
    templateId,
    data,
  });

  // Optional: email the patient so they know a new prescription is waiting
  // in their dashboard. Doctor triggers this from the "Send to Patient"
  // button. Failure is non-fatal — the rx is still saved.
  let emailed = false;
  if (body.notifyPatient) {
    try {
      const medList = (data.medications || [])
        .slice(0, 5)
        .map(
          (m) =>
            `<li><b>${m.name}</b> — ${m.dose || ""} ${m.frequency || ""}${
              m.duration ? ` for ${m.duration}` : ""
            }</li>`
        )
        .join("");
      const result = await sendEmail({
        from: "notifications",
        to: patientEmail,
        subject: `New prescription from ${data.doctorName || "your doctor"}`,
        html: `
          <p>Hi ${data.patientName || ""},</p>
          <p>${data.doctorName || "Your doctor"} has issued you a new
          prescription on OduDoc.</p>
          ${data.diagnosis ? `<p><b>Diagnosis:</b> ${data.diagnosis}</p>` : ""}
          ${medList ? `<p><b>Medications:</b></p><ul>${medList}</ul>` : ""}
          <p>You can view, download, or print the full prescription from your
          <a href="https://www.odudoc.com/dashboard/prescriptions">OduDoc
          dashboard</a>.</p>
          <p>— The OduDoc Team</p>
        `,
      });
      emailed = result.ok;
    } catch (err) {
      log.error("console.error", undefined, { args: ["[prescriptions] notify patient failed:", err] });
    }
  }

  return NextResponse.json({ prescription: rx, emailed }, { status: 201 });
}

// GET /api/prescriptions
// Returns prescriptions scoped by session role:
//   admin   → all
//   doctor  → ones they wrote
//   patient → ones addressed to their email
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let items: PrescriptionRecord[];
  if (user.role === "admin") {
    items = listPrescriptions();
  } else if (user.role === "doctor") {
    items = listPrescriptions({ doctorEmail: user.email });
  } else {
    items = listPrescriptions({ patientEmail: user.email });
  }
  return NextResponse.json({ prescriptions: items });
}
