import { NextRequest, NextResponse } from "next/server";
import {
  getApplications,
  addApplication,
  updateApplicationStatus,
  getJobById,
  getApplicationById,
  archiveApplication,
  unarchiveApplication,
  deleteApplication,
  reloadApplications,
} from "@/lib/careers-store";
import { uploadFile } from "@/lib/files-service";
import {
  sendCareerApplicationReceived,
  sendCareerStatusUpdateEmail,
} from "@/lib/email";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { findDoctorByEmail, createDoctor } from "@/lib/doctors-store";
import { inviteDoctor } from "@/lib/doctor-invite";

import { log } from "@/lib/log";
// Node runtime — we need Buffer / multipart handling and outbound fetch to the VPS.
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Re-read from Postgres so a warm Lambda picks up DELETEs / status
  // changes made by siblings. Fixes the "I deleted it but it still
  // shows up" class of bugs for Careers > Applications.
  await reloadApplications();
  const jobId = req.nextUrl.searchParams.get("jobId") || undefined;
  const view = req.nextUrl.searchParams.get("view"); // "archived" | "all" | default
  const applications = getApplications(jobId, {
    includeArchived: view === "all",
    onlyArchived: view === "archived",
  });
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";

  try {
    // Preferred path: multipart/form-data with a real CV file.
    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      const firstName = String(form.get("firstName") || "").trim();
      const lastName = String(form.get("lastName") || "").trim();
      const email = String(form.get("email") || "").trim();
      const phone = String(form.get("phone") || "").trim();
      const coverLetter = String(form.get("coverLetter") || "");
      const jobId = (form.get("jobId") as string) || null;
      const cv = form.get("cv");

      if (!firstName || !lastName || !email || !phone) {
        return NextResponse.json(
          { error: "firstName, lastName, email, phone are required" },
          { status: 400 }
        );
      }
      if (!(cv instanceof File) || cv.size === 0) {
        return NextResponse.json({ error: "CV file is required" }, { status: 400 });
      }
      if (cv.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "CV must be under 5MB" }, { status: 413 });
      }

      // Push the file to the VPS and capture the stored filename.
      let stored;
      try {
        stored = await uploadFile("cvs", cv, cv.name);
      } catch (err) {
        log.error("[careers] files-service upload failed:", err);
        return NextResponse.json(
          { error: "Could not save CV. Please try again." },
          { status: 502 }
        );
      }

      const app = addApplication({
        jobId,
        firstName,
        lastName,
        email,
        phone,
        coverLetter,
        cvFileName: cv.name,
        cvStoredFilename: stored.filename,
      });

      try {
        const jobTitleForNotif = jobId ? getJobById(jobId)?.title : undefined;
        addAdminNotification({
          type: "career_application",
          title: "New career application",
          body: `${firstName} ${lastName} applied${jobTitleForNotif ? ` for ${jobTitleForNotif}` : ""}.`,
          link: "/admin/careers",
        });
      } catch (err) {
        log.error("[careers] admin notification failed:", err);
      }

      // Await the HR auto-reply — Vercel can freeze the function the moment
      // the response flushes, which would cancel a fire-and-forget promise
      // before Resend receives it. Email failures are logged but never
      // propagate to the client.
      const jobTitle = jobId ? getJobById(jobId)?.title : undefined;
      try {
        await sendCareerApplicationReceived({ to: email, firstName, jobTitle });
      } catch (err) {
        log.error("[careers] auto-reply email failed:", err);
      }

      return NextResponse.json({ application: app }, { status: 201 });
    }

    // Legacy JSON path — keep for back-compat with any tooling still posting JSON.
    const body = await req.json();
    const required = ["firstName", "lastName", "email", "phone", "cvFileName"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json({ error: `${field} is required` }, { status: 400 });
      }
    }
    const app = addApplication({
      jobId: body.jobId || null,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      coverLetter: body.coverLetter || "",
      cvFileName: body.cvFileName,
    });

    try {
      const jobTitleForNotif = body.jobId ? getJobById(body.jobId)?.title : undefined;
      addAdminNotification({
        type: "career_application",
        title: "New career application",
        body: `${body.firstName} ${body.lastName} applied${jobTitleForNotif ? ` for ${jobTitleForNotif}` : ""}.`,
        link: "/admin/careers",
      });
    } catch (err) {
      log.error("[careers] admin notification failed:", err);
    }

    const jobTitle = body.jobId ? getJobById(body.jobId)?.title : undefined;
    sendCareerApplicationReceived({
      to: body.email,
      firstName: body.firstName,
      jobTitle,
    }).catch((err) =>
      log.error("[careers] auto-reply email failed:", err)
    );

    return NextResponse.json({ application: app }, { status: 201 });
  } catch (err) {
    log.error("[careers] POST failed:", err);
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    // Action-based dispatch — `action: "archive" | "unarchive"` for moving
    // records in and out of the archive; otherwise we treat it as a status
    // update (back-compat with the existing frontend).
    if (body.action === "archive") {
      const app = archiveApplication(body.id);
      if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ application: app });
    }
    if (body.action === "unarchive") {
      const app = unarchiveApplication(body.id);
      if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ application: app });
    }

    if (!body.status) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }

    const prev = getApplicationById(body.id);
    if (!prev) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const prevStatus = prev.status;

    const app = updateApplicationStatus(body.id, body.status);
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Notify the candidate whenever the status *actually* changes — and
    // only for states that are meaningful to share with them ("new" is the
    // internal starting state, no email for that). Fire-and-forget.
    const emailableStatuses = new Set([
      "reviewing",
      "shortlisted",
      "rejected",
      "hired",
    ]);
    if (
      body.status !== prevStatus &&
      emailableStatuses.has(body.status as string)
    ) {
      sendCareerStatusUpdateEmail({
        to: app.email,
        firstName: app.firstName,
        status: body.status as "reviewing" | "shortlisted" | "rejected" | "hired",
      }).catch((err) =>
        log.error("[careers] status email failed:", err)
      );
    }

    // On "hired", materialise a Doctor record (if the email isn't already
    // registered) and provision a 7-day temporary login. The welcome email
    // + SMS go out in addition to the generic status email above, so the
    // candidate gets both congratulations and usable credentials.
    if (body.status === "hired" && prevStatus !== "hired") {
      const fullName = `${app.firstName} ${app.lastName}`.trim();
      try {
        if (!findDoctorByEmail(app.email)) {
          createDoctor({
            name: fullName,
            specialty: "General Physician",
            email: app.email,
            phone: app.phone,
            status: "Active",
          });
        }
        await inviteDoctor({
          name: fullName,
          email: app.email,
          phone: app.phone,
        });
      } catch (err) {
        log.error("[careers] hired provisioning failed:", err);
      }
    }

    return NextResponse.json({ application: app });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id =
      req.nextUrl.searchParams.get("id") || (await req.json().catch(() => ({}))).id;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    // Reload first so a warm Lambda with a stale in-memory array doesn't
    // 404 on a row that actually exists in Postgres (or vice versa).
    await reloadApplications();
    const ok = deleteApplication(id);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
