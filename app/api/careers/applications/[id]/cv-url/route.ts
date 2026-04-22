import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getApplications } from "@/lib/careers-store";
import { signUrl } from "@/lib/files-service";

// Admin-only: mint a fresh 1-hour signed URL for a stored CV. The admin UI
// requests this on click instead of storing long-lived URLs in the DB.
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as { role?: string } | undefined)?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const app = getApplications().find((a) => a.id === params.id);
  if (!app) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!app.cvStoredFilename) {
    return NextResponse.json(
      { error: "This application has no uploaded CV file (legacy record)." },
      { status: 410 }
    );
  }

  const url = await signUrl("cvs", app.cvStoredFilename, 3600);
  if (!url) {
    return NextResponse.json(
      { error: "Could not mint signed URL" },
      { status: 502 }
    );
  }
  return NextResponse.json({ url });
}
