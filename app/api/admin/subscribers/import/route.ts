import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bulkAddSubscribers } from "@/lib/subscribers-store";

export const runtime = "nodejs";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

// Parse a CSV blob. Accepts single-column email lists or multi-column rows
// where any cell could be an email — we pick whichever cell looks like one.
function extractEmails(csv: string): string[] {
  const out = new Set<string>();
  const rows = csv.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const re = /[^\s@,;"']+@[^\s@,;"']+\.[^\s@,;"']+/g;
  for (const row of rows) {
    const matches = row.match(re);
    if (matches) for (const m of matches) out.add(m.toLowerCase());
  }
  return Array.from(out);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv) return NextResponse.json({ error: "csv required" }, { status: 400 });
  const emails = extractEmails(csv);
  if (!emails.length) return NextResponse.json({ error: "No valid emails found in CSV" }, { status: 400 });
  const stats = bulkAddSubscribers(emails, "import");
  return NextResponse.json({ ok: true, parsed: emails.length, ...stats });
}
