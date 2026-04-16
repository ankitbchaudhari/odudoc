import { NextRequest, NextResponse } from "next/server";
import { addApplication } from "@/lib/doctor-applications-store";

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

    return NextResponse.json({ id: app.id, status: app.status }, { status: 201 });
  } catch (err) {
    console.error("Doctor registration error:", err);
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }
}
