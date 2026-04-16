import { NextRequest, NextResponse } from "next/server";
import { getApplications, addApplication, updateApplicationStatus } from "@/lib/careers-store";

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId") || undefined;
  const applications = getApplications(jobId);
  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  try {
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
    return NextResponse.json({ application: app }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id || !body.status) {
      return NextResponse.json({ error: "id and status required" }, { status: 400 });
    }
    const app = updateApplicationStatus(body.id, body.status);
    if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ application: app });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
