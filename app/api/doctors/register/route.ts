import { NextRequest, NextResponse } from "next/server";
import { addApplication } from "@/lib/doctor-applications-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { sendDoctorApplicationReceivedEmail } from "@/lib/email";

import { log } from "@/lib/log";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const required = [
      "fullName",
      "email",
      "phone",
      "dateOfBirth",
      "gender",
      "address",
      "licenseNumber",
      "specialty",
      "yearsExperience",
      "qualifications",
    ];

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!Array.isArray(body.languages) || body.languages.length === 0) {
      return NextResponse.json(
        { error: "At least one language is required" },
        { status: 400 }
      );
    }

    // Enforce 18+ minimum age. Client-side validation can be bypassed, so
    // recompute the age here from the submitted DOB.
    {
      const dob = new Date(body.dateOfBirth);
      if (Number.isNaN(dob.getTime())) {
        return NextResponse.json(
          { error: "Invalid date of birth" },
          { status: 400 }
        );
      }
      const today = new Date();
      if (dob > today) {
        return NextResponse.json(
          { error: "Date of birth can't be in the future" },
          { status: 400 }
        );
      }
      let age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age < 18) {
        return NextResponse.json(
          { error: "You must be at least 18 years old to register" },
          { status: 400 }
        );
      }
    }

    // Gender is restricted to male/female on the signup form.
    if (body.gender !== "male" && body.gender !== "female") {
      return NextResponse.json(
        { error: "Gender must be male or female" },
        { status: 400 }
      );
    }

    const app = addApplication({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      address: `${body.address}${body.country ? ", " + body.country : ""}`,
      licenseNumber: body.licenseNumber,
      specialty: body.specialty,
      subSpecialty: body.subSpecialty || "",
      yearsExperience: Number(body.yearsExperience) || 0,
      qualifications: body.qualifications,
      affiliations: body.affiliations || "",
      languages: body.languages,
      documents: {
        medicalLicense: body.documents?.medicalLicense,
        governmentId: body.documents?.governmentId,
        medicalDegree: body.documents?.medicalDegree,
        professionalPhoto: body.documents?.professionalPhoto,
        specialtyCertifications: body.documents?.specialtyCertifications || [],
        hospitalAffiliationLetter: body.documents?.hospitalAffiliationLetter,
      },
      plan: body.plan === "premium" ? "premium" : "free",
      fee: Number(body.fee) || 100,
    });

    try {
      addAdminNotification({
        type: "doctor_application",
        title: "New doctor application",
        body: `${app.fullName} applied to practice ${app.specialty}.`,
        link: "/admin/applications",
      });
    } catch (err) {
      log.error("[doctor-register] admin notification failed:", err);
    }

    // Confirmation email to the applicant. Awaited so the Vercel Lambda
    // doesn't exit before Resend finishes the HTTP call (previously this was
    // void-ed and the email was regularly lost on cold starts). Failures
    // are logged but don't fail the registration itself.
    try {
      const res = await sendDoctorApplicationReceivedEmail({
        to: app.email,
        fullName: app.fullName,
        applicationId: app.id,
        specialty: app.specialty,
      });
      if (!res.ok) {
        log.error("doctor_register.applicant_email_failed", undefined, {
          error: res.error,
        });
      }
    } catch (err) {
      log.error("doctor_register.applicant_email_threw", err);
    }

    return NextResponse.json({ id: app.id, status: app.status }, { status: 201 });
  } catch (err) {
    log.error("Doctor registration error:", err);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
