// GET /api/patients/mobile/prescriptions
//
// List the calling patient's prescriptions. Bearer-authenticated; the patient
// identity is taken from the JWT, not from request input, so callers can't
// peek at someone else's records.

import { NextRequest, NextResponse } from "next/server";
import { requireMobileUser } from "@/lib/mobile-auth";
import { listPrescriptions } from "@/lib/prescriptions-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireMobileUser(request);
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "patient") {
    return NextResponse.json(
      { error: "wrong_role", message: "This endpoint is for patients." },
      { status: 403 }
    );
  }

  try {
    const records = listPrescriptions({ patientEmail: auth.email });
    // Map to the slimmer shape the patient app expects (lib/data.ts Prescription):
    //   { id, doctorName, date, medications: [{ name, dosage, duration }] }
    const prescriptions = records
      .filter((r) => r.status === "active")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((r) => {
        const data: any = r.data ?? {};
        const meds = Array.isArray(data.medications)
          ? data.medications.map((m: any) => ({
              name: m.name ?? m.drug ?? "Unknown medicine",
              dosage: m.dosage ?? m.dose ?? "",
              duration: m.duration ?? "",
            }))
          : [];
        return {
          id: r.id,
          doctorName: data.doctorName ?? r.doctorEmail,
          date: r.createdAt.slice(0, 10),
          medications: meds,
          diagnosis: data.diagnosis,
          notes: data.notes,
        };
      });
    return NextResponse.json({ prescriptions });
  } catch (err) {
    log.error("mobile prescriptions list error", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
