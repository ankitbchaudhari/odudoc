import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  listLeads,
  createLead,
  updateLead,
  deleteLead,
  type LeadStatus,
} from "@/lib/enterprise-leads-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin() {
  const s = await getServerSession(authOptions);
  return s?.user && (s.user as { role?: string }).role === "admin";
}

// Admin: list all leads. Public: 403 (no reason to list).
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({ leads: listLeads() });
}

// Public: submit a demo request.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (
      !body.organizationName ||
      !body.contactName ||
      !body.contactEmail ||
      typeof body.contactEmail !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.contactEmail)
    ) {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }
    const lead = createLead({
      organizationName: String(body.organizationName),
      contactName: String(body.contactName),
      contactEmail: String(body.contactEmail),
      contactPhone: body.contactPhone ? String(body.contactPhone) : undefined,
      country: body.country ? String(body.country) : undefined,
      bedsRange: body.bedsRange ? String(body.bedsRange) : undefined,
      interestedModules: Array.isArray(body.interestedModules)
        ? body.interestedModules.map(String)
        : [],
      currentSystem: body.currentSystem ? String(body.currentSystem) : undefined,
      message: body.message ? String(body.message) : undefined,
    });
    return NextResponse.json({ ok: true, id: lead.id });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const updated = updateLead(String(body.id), {
    status: body.status as LeadStatus | undefined,
    notes: body.notes !== undefined ? String(body.notes) : undefined,
  });
  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ lead: updated });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const ok = deleteLead(String(body.id));
  return NextResponse.json({ ok });
}
