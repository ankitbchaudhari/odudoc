// DICOM annotation save / load / history.
//
// GET  /api/emr/dicom-annotations?studyKey=...                 → latest revision
// GET  /api/emr/dicom-annotations?studyKey=...&history=1       → full history (newest first)
// GET  /api/emr/dicom-annotations?id=...                       → specific revision
// POST /api/emr/dicom-annotations  body: { studyKey, toolStateJson, note? }

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resolveClinic } from "@/lib/emr-store";
import {
  saveAnnotation,
  loadAnnotation,
  listAnnotationHistory,
  loadAnnotationById,
} from "@/lib/dicom-annotations-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sp = req.nextUrl.searchParams;
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;

  const id = sp.get("id");
  if (id) {
    const ann = await loadAnnotationById(ownerEmail, id);
    return NextResponse.json({ annotation: ann });
  }

  const studyKey = sp.get("studyKey");
  if (!studyKey) return NextResponse.json({ error: "studyKey required" }, { status: 400 });

  if (sp.get("history") === "1") {
    const history = await listAnnotationHistory(ownerEmail, studyKey);
    return NextResponse.json({ history });
  }

  const ann = await loadAnnotation(ownerEmail, studyKey);
  return NextResponse.json({ annotation: ann });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; role?: string } | undefined;
  const clinic = await resolveClinic(user?.email, user?.role);
  if (!clinic) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (clinic.role === "billing" || clinic.role === "lab_tech" || clinic.role === "frontdesk") {
    return NextResponse.json({ error: "Your role can't save DICOM annotations." }, { status: 403 });
  }
  let body: { studyKey?: string; toolStateJson?: string; note?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.studyKey || !body.toolStateJson) {
    return NextResponse.json({ error: "studyKey and toolStateJson required" }, { status: 400 });
  }
  const ownerEmail = clinic.role === "admin" ? clinic.userEmail : clinic.ownerEmail;
  const row = await saveAnnotation({
    doctorEmail: ownerEmail,
    studyKey: body.studyKey,
    toolStateJson: body.toolStateJson,
    createdBy: clinic.userEmail,
    note: body.note,
  });
  await awaitAllFlushesStrict().catch(() => {});
  return NextResponse.json({ annotation: row });
}
