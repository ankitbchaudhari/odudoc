import { NextRequest, NextResponse } from "next/server";
import { addApplication } from "@/lib/doctor-applications-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { sendDoctorApplicationReceivedEmail } from "@/lib/email";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit-helpers";
import { licenseMetaFor } from "@/lib/medical-licenses";
import { recordAcceptance, CURRENT_VERSIONS } from "@/lib/doctor-baa-store";

import { log } from "@/lib/log";
export async function POST(req: NextRequest) {
  // Open POST writing PII to the doctor-applications store. Cap at
  // 3/min/IP and 20/day/IP — real applicants submit once.
  const burstBlocked = await enforceRateLimit(req, "doctor-register", 3, "1 m");
  if (burstBlocked) return burstBlocked;
  const dayBlocked = await enforceRateLimit(req, "doctor-register-day", 20, "1 d");
  if (dayBlocked) return dayBlocked;
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

    // Gender is restricted to male/female on the signup form. The
    // client used to send capitalised "Male"/"Female" while this
    // handler required lowercase — that 400'd every registration.
    // Normalise to lowercase before checking.
    const gender = typeof body.gender === "string" ? body.gender.trim().toLowerCase() : "";
    if (gender !== "male" && gender !== "female") {
      return NextResponse.json(
        { error: "Gender must be male or female" },
        { status: 400 }
      );
    }
    body.gender = gender;

    // Country drives the license-field labelling AND which compliance
    // framework (HIPAA BAA / GDPR DPA / generic DPA) the applicant
    // signed. Canonicalise to a 2-letter ISO code; default to "" if
    // the applicant left the country field as free-text address.
    const rawCountry = typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
    const licenseCountry =
      typeof body.licenseCountry === "string"
        ? body.licenseCountry.trim().toUpperCase().slice(0, 2)
        : rawCountry.slice(0, 2);
    const meta = licenseMetaFor(licenseCountry);

    // Compliance acceptance — required field. The form must surface
    // the BAA/DPA wording corresponding to meta.framework and capture
    // a typed-name signature. Without it we refuse the registration so
    // we never have a doctor record without a valid acceptance trail.
    const signature =
      typeof body.complianceSignature === "string" ? body.complianceSignature.trim() : "";
    if (signature.length < 2) {
      return NextResponse.json(
        {
          error:
            "Please type your full name to acknowledge the data-protection agreement before submitting.",
        },
        { status: 400 },
      );
    }

    const app = addApplication({
      fullName: body.fullName,
      email: body.email,
      phone: body.phone,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      address: `${body.address}${body.country ? ", " + body.country : ""}`,
      country: licenseCountry || undefined,
      licenseNumber: body.licenseNumber,
      licenseCountry: licenseCountry || undefined,
      licenseExpiry:
        typeof body.licenseExpiry === "string" && body.licenseExpiry.length >= 8
          ? body.licenseExpiry
          : undefined,
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
      compliance: {
        framework: meta.framework,
        version: CURRENT_VERSIONS[meta.framework],
        acceptedAt: new Date().toISOString(),
        ipAddress: clientIp(req),
        signature,
      },
    });

    // Persist the acceptance to the dedicated audit store too — that's
    // the table we'd produce in a regulatory dispute. The compliance
    // field on the application gives the same info inline; this row
    // is the durable, application-id-decoupled record.
    try {
      recordAcceptance({
        applicationId: app.id,
        email: body.email,
        framework: meta.framework,
        ipAddress: clientIp(req),
        userAgent: req.headers.get("user-agent") || undefined,
        signature,
      });
    } catch (err) {
      log.error("doctor_register.baa_record_failed", err);
    }

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
