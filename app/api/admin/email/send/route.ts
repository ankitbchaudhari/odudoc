import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listUsers, type User } from "@/lib/users-store";
import { listOrders } from "@/lib/orders-store";
import { sendAdminBroadcastEmail } from "@/lib/email";

export const runtime = "nodejs";

type Audience =
  | "patients"
  | "doctors"
  | "staff"
  | "customers"
  | "vendors"
  | "pharmacists"
  | "support"
  | "hr"
  | "all"
  | "custom";
type Sender = "admin" | "no-reply" | "notifications" | "hr" | "career" | "promotion";

// Role-backed audiences. "customers" (orders) and "all"/"custom"
// (aggregates) are handled specially below.
const ROLE_AUDIENCE_MAP: Record<string, User["role"]> = {
  patients: "patient",
  doctors: "doctor",
  staff: "staff",
  vendors: "vendor",
  pharmacists: "pharmacist",
  support: "support",
  hr: "hr",
};

const VALID_AUDIENCES: Audience[] = [
  "patients",
  "doctors",
  "staff",
  "customers",
  "vendors",
  "pharmacists",
  "support",
  "hr",
  "all",
  "custom",
];
const VALID_SENDERS: Sender[] = [
  "admin",
  "no-reply",
  "notifications",
  "hr",
  "career",
  "promotion",
];

// Minimal RFC-compliant-ish email validator for admin paste-in addresses.
function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Resolve an audience choice into a {email, name} list. We dedup by email so
// a user who is both a patient and a customer only receives one copy.
function resolveRecipients(
  audience: Audience,
  customEmails: string[]
): { email: string; name: string }[] {
  const map = new Map<string, { email: string; name: string }>();

  const add = (email: string, name: string) => {
    const key = email.toLowerCase();
    if (!map.has(key)) map.set(key, { email, name });
  };

  // Role-backed audiences (patients/doctors/staff/vendors/pharmacists/
  // support/hr): include when that specific audience is selected, OR when
  // "all" is selected.
  for (const [key, role] of Object.entries(ROLE_AUDIENCE_MAP)) {
    if (audience === key || audience === "all") {
      listUsers(role).forEach((u) => add(u.email, u.name));
    }
  }
  if (audience === "customers" || audience === "all") {
    for (const o of listOrders()) add(o.email, o.customer);
  }
  if (audience === "custom") {
    for (const e of customEmails) {
      if (looksLikeEmail(e)) add(e, "");
    }
  }

  return Array.from(map.values());
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    audience?: Audience;
    customEmails?: string[];
    subject?: string;
    message?: string;
    from?: Sender;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.audience || !VALID_AUDIENCES.includes(body.audience)) {
    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  }
  if (!body.subject?.trim()) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (!body.message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  const sender: Sender = body.from && VALID_SENDERS.includes(body.from) ? body.from : "admin";

  const customEmails = Array.isArray(body.customEmails) ? body.customEmails : [];
  const recipients = resolveRecipients(body.audience, customEmails);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "No recipients resolved for that audience." },
      { status: 400 }
    );
  }

  // Send sequentially so one flaky delivery doesn't take the whole batch
  // down, but bail after the first 200 recipients to avoid runaway jobs on
  // the serverless function timeout. (A real campaign tool would queue.)
  const MAX_PER_REQUEST = 200;
  const batch = recipients.slice(0, MAX_PER_REQUEST);

  let sent = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const r of batch) {
    const res = await sendAdminBroadcastEmail({
      to: r.email,
      recipientName: r.name || undefined,
      subject: body.subject,
      message: body.message,
      from: sender,
      ctaLabel: body.ctaLabel,
      ctaUrl: body.ctaUrl,
    });
    if (res.ok) sent++;
    else {
      failed++;
      failures.push(`${r.email}: ${res.error || "unknown error"}`);
    }
  }

  return NextResponse.json({
    ok: true,
    attempted: batch.length,
    totalMatched: recipients.length,
    sent,
    failed,
    failures: failures.slice(0, 20),
    truncated: recipients.length > MAX_PER_REQUEST,
  });
}
