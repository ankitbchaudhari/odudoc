// Self-serve doctor identity verification submission.
//
// Doctors land on /dashboard/doctor without a verified badge and see
// a gate. They submit their ID front, ID back, a selfie, and (if not
// already on file) their medical-license document via this endpoint.
// We push the blobs to the Hostinger files server under the
// `doctor-verification` category, then record the URLs on the doctor
// row + stamp verificationSubmittedAt.
//
// Admin verification (the `verified` flag itself) is still flipped
// manually from /admin/doctors after a human reviews the docs. This
// route only covers the doctor-facing submission half of the flow.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findDoctorByEmail,
  reloadDoctors,
  submitDoctorVerification,
} from "@/lib/doctors-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { uploadFile, deleteFile } from "@/lib/files-service";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per document — IDs/selfies are small

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }
  await reloadDoctors();
  const d = findDoctorByEmail(user.email);
  if (!d) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  return NextResponse.json({
    verified: !!d.verified,
    verifiedAt: d.verifiedAt,
    verificationSubmittedAt: d.verificationSubmittedAt,
    verificationDocs: d.verificationDocs,
    verificationRejectionReason: d.verificationRejectionReason,
    licenseCountry: d.licenseCountry,
    licenseNumber: d.licenseNumber,
    licenseExpiry: d.licenseExpiry,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "doctor") {
    return NextResponse.json({ error: "Doctor session required" }, { status: 403 });
  }

  const ct = req.headers.get("content-type") || "";
  if (!ct.startsWith("multipart/form-data")) {
    return NextResponse.json(
      { error: "multipart/form-data required" },
      { status: 415 }
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  await reloadDoctors();
  const doctor = findDoctorByEmail(user.email);
  if (!doctor) {
    return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  }

  // Per-field uploads — all four are optional individually but at
  // least one new file or a license metadata change must be provided.
  const fields: Array<{
    field: "idFront" | "idBack" | "selfie" | "license";
    docKey: "idFrontUrl" | "idBackUrl" | "selfieUrl" | "licenseUrl";
  }> = [
    { field: "idFront", docKey: "idFrontUrl" },
    { field: "idBack", docKey: "idBackUrl" },
    { field: "selfie", docKey: "selfieUrl" },
    { field: "license", docKey: "licenseUrl" },
  ];

  const uploaded: Partial<Record<typeof fields[number]["docKey"], string>> = {};
  // Track every successful upload's stored filename so we can
  // best-effort clean up if the persist later fails.
  const successfulFilenames: string[] = [];
  for (const { field, docKey } of fields) {
    const value = form.get(field);
    if (!(value instanceof File) || value.size === 0) continue;
    if (value.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${field} is too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
        { status: 413 }
      );
    }
    try {
      const stored = await uploadFile(
        "doctor-verification",
        value,
        `${doctor.id}-${field}-${value.name}`,
      );
      uploaded[docKey] = stored.url;
      successfulFilenames.push(stored.filename);
    } catch (err) {
      // If any single upload fails, roll back the prior ones —
      // we'd rather the doctor retry the whole submission than
      // half-persist unreadable docs.
      log.error("doctor.verification.upload_failed", err, { field });
      for (const f of successfulFilenames) {
        try {
          await deleteFile("doctor-verification", f);
        } catch (delErr) {
          log.error("doctor.verification.rollback_failed", delErr);
        }
      }
      return NextResponse.json(
        { error: `Could not upload ${field}. Please retry.` },
        { status: 502 }
      );
    }
  }

  const licenseCountry = form.get("licenseCountry");
  const licenseNumber = form.get("licenseNumber");
  const licenseExpiry = form.get("licenseExpiry");

  if (
    Object.keys(uploaded).length === 0 &&
    !licenseCountry &&
    !licenseNumber &&
    !licenseExpiry
  ) {
    return NextResponse.json(
      { error: "Upload at least one document or update a license field." },
      { status: 400 }
    );
  }

  const updated = submitDoctorVerification(doctor.id, {
    docs: uploaded,
    licenseCountry: typeof licenseCountry === "string" ? licenseCountry : undefined,
    licenseNumber: typeof licenseNumber === "string" ? licenseNumber : undefined,
    licenseExpiry: typeof licenseExpiry === "string" ? licenseExpiry : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Could not save submission" }, { status: 500 });
  }

  // Notify admin so a human knows there's a queue to review.
  try {
    addAdminNotification({
      type: "doctor_verification_submission",
      title: "New doctor verification submission",
      body: `${updated.name} submitted documents for review.`,
      link: `/admin/doctors/verifications`,
    });
  } catch (err) {
    log.error("doctor.verification.admin_notification_failed", err);
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("doctor.verification.persist_failed", err, { doctorId: updated.id });
    // Roll back the just-uploaded blobs so the doctor doesn't see a
    // half-saved state on retry.
    for (const f of successfulFilenames) {
      try {
        await deleteFile("doctor-verification", f);
      } catch (delErr) {
        log.error("doctor.verification.rollback_failed", delErr);
      }
    }
    return NextResponse.json(
      {
        error:
          "Verification service is temporarily unavailable. Please retry — your submission was not saved.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    ok: true,
    verificationSubmittedAt: updated.verificationSubmittedAt,
  });
}
