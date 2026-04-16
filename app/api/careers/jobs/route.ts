import { NextRequest, NextResponse } from "next/server";
import { getJobs, addJob, updateJob, deleteJob } from "@/lib/careers-store";

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all") === "1";
  const jobs = getJobs(!all); // default: active only
  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.department) {
      return NextResponse.json({ error: "Title and department required" }, { status: 400 });
    }
    const job = addJob({
      title: body.title,
      department: body.department,
      location: body.location || "Remote",
      employmentType: body.employmentType || "Full-time",
      salary: body.salary || "Competitive",
      description: body.description || "",
      responsibilities: body.responsibilities || [],
      requirements: body.requirements || [],
      active: body.active !== false,
    });
    return NextResponse.json({ job }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const job = updateJob(body.id, body);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ job });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteJob(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
