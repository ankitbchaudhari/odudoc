// /api/ppme/[id]
//
// GET — full report detail including all tests + photos.
// PATCH — examining doctor updates a single test (status, result,
//         reference range, etc.) or attaches a photo URL.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPpme, updateTest, attachPhoto } from "@/lib/ppme-store";
import { parseJson, z } from "@/lib/validate";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const report = await getPpme(id);
  if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ report });
}

const PatchSchema = z.object({
  testCode: z.string().min(1).optional(),
  test: z.object({
    status: z.enum(["pending", "done", "skipped", "abnormal"]).optional(),
    result: z.string().max(500).optional(),
    referenceRange: z.string().max(200).optional(),
    recordedBy: z.string().max(120).optional(),
    recordedAt: z.string().optional(),
  }).optional(),
  attachPhotoUrl: z.string().url().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!["admin", "doctor", "staff", "support"].includes(session.user.role || "")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const parsed = await parseJson(request, PatchSchema);
  if (parsed instanceof NextResponse) return parsed;

  try {
    let report = await getPpme(id);
    if (!report) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (parsed.testCode && parsed.test) {
      report = await updateTest(id, parsed.testCode, parsed.test);
    }
    if (parsed.attachPhotoUrl) {
      report = await attachPhoto(id, parsed.attachPhotoUrl);
    }
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
}
