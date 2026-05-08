// Biomedical waste log — list, create, summarise.
// GET  /api/emr/waste?month=2026-05&category=yellow
// POST /api/emr/waste

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  createWasteEntry,
  listWaste,
  summariseWaste,
  type WasteCategory,
} from "@/lib/waste-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VALID_CATEGORIES: WasteCategory[] = ["yellow", "red", "blue", "white", "black"];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const month = sp.get("month") || new Date().toISOString().slice(0, 7);
  const category = (sp.get("category") || undefined) as WasteCategory | "All" | undefined;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;

  const entries = await listWaste({ doctorEmail: ownerEmail, month, category });
  const summary = await summariseWaste(ownerEmail, month);
  return NextResponse.json({ entries, summary });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    category?: string;
    sourceDept?: string;
    weightGrams?: number;
    bagCount?: number;
    vendorName?: string;
    manifestNo?: string;
    notes?: string;
    disposedAt?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.category || !VALID_CATEGORIES.includes(body.category as WasteCategory)) {
    return NextResponse.json(
      { error: `category must be one of ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 },
    );
  }
  if (!body.sourceDept || typeof body.weightGrams !== "number" || body.weightGrams < 0) {
    return NextResponse.json(
      { error: "sourceDept and weightGrams are required" },
      { status: 400 },
    );
  }

  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await createWasteEntry({
    doctorEmail: ownerEmail,
    category: body.category as WasteCategory,
    sourceDept: body.sourceDept,
    weightGrams: body.weightGrams,
    bagCount: body.bagCount,
    vendorName: body.vendorName,
    manifestNo: body.manifestNo,
    notes: body.notes,
    disposedAt: body.disposedAt,
    loggedBy: clinic.userEmail,
  });

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("emr.waste.persist_failed", err);
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ entry: row }, { status: 201 });
}
