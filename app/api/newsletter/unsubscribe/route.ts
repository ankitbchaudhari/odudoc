// One-click unsubscribe. Accepts ?email=… on GET (the link in newsletter
// emails) or { email } on POST (form submissions). Flips the subscriber's
// active flag to false. Always returns 200 even when the email isn't found,
// because confirming/denying membership leaks subscriber-list data.

import { NextRequest, NextResponse } from "next/server";
import {
  listSubscribers,
  setSubscriberActive,
} from "@/lib/subscribers-store";

export const runtime = "nodejs";

function unsubscribe(emailRaw: string): { found: boolean } {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return { found: false };
  const sub = listSubscribers().find((s) => s.email === email);
  if (!sub) return { found: false };
  setSubscriberActive(sub.id, false);
  return { found: true };
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email") || "";
  unsubscribe(email);
  // Redirect to a friendly confirmation page so the user sees something
  // useful when they click the link in their inbox.
  return NextResponse.redirect(`${req.nextUrl.origin}/unsubscribe?ok=1`);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  unsubscribe(email);
  return NextResponse.json({ ok: true });
}
