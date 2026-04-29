// Admin doctor-invite endpoint.
//
// POST  body { emails: string[] | string, name?, specialty?, country?, note? }
//   Sends an OduDoc invitation email to each address (best-effort,
//   one-by-one — Resend rate-limits at ~14 rps on the free tier so
//   we serialise sends and surface per-recipient outcomes back to
//   the admin UI). Records each send in doctor-invites store so the
//   admin sees a real history with conversion status.
//
// GET   Returns the invite list + summary stats for the page.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createDoctorInvite,
  listDoctorInvites,
  getInviteStats,
  reloadDoctorInvites,
  cancelInvite,
} from "@/lib/doctor-invites-store";
import { sendDoctorInvitationEmail } from "@/lib/email";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAdmin(role: string | undefined): boolean {
  return role === "admin";
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  }
  if (typeof input !== "string") return [];
  // Split on comma, semicolon, newline, whitespace — accept whatever
  // the admin pastes. Strip mailto:, surrounding angle brackets,
  // and "Name <email>" artefacts.
  return input
    .split(/[\s,;]+/)
    .map((raw) =>
      raw
        .replace(/^mailto:/i, "")
        .replace(/.*<([^>]+)>.*/, "$1")
        .trim()
        .toLowerCase(),
    )
    .filter((s) => s.length > 0);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await reloadDoctorInvites();
  const [invites, stats] = await Promise.all([
    listDoctorInvites(),
    getInviteStats(),
  ]);
  return NextResponse.json({ invites, stats });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const adminEmail = (session?.user as { email?: string; role?: string } | undefined)
    ?.email || "";
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    emails?: unknown;
    email?: string;
    name?: string;
    specialty?: string;
    country?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const candidates = parseEmails(body.emails ?? body.email);
  // Dedupe inside the request — admin may paste a list with repeats.
  const unique = Array.from(new Set(candidates));
  if (unique.length === 0) {
    return NextResponse.json(
      { error: "Paste at least one valid email address." },
      { status: 400 }
    );
  }
  if (unique.length > 50) {
    return NextResponse.json(
      { error: "Too many emails in one batch (max 50). Split it up." },
      { status: 413 }
    );
  }

  const results: Array<{
    email: string;
    ok: boolean;
    error?: string;
    inviteId?: string;
  }> = [];

  for (const email of unique) {
    if (!EMAIL_REGEX.test(email)) {
      results.push({ email, ok: false, error: "Invalid email format" });
      continue;
    }
    try {
      const sendResult = await sendDoctorInvitationEmail({
        to: email,
        name: body.name,
        specialty: body.specialty,
        country: body.country,
      });
      if (!sendResult.ok) {
        results.push({
          email,
          ok: false,
          error: sendResult.error || "Send failed",
        });
        continue;
      }
      const invite = await createDoctorInvite({
        email,
        name: body.name,
        specialty: body.specialty,
        country: body.country,
        sentBy: adminEmail || "admin",
        note: body.note,
      });
      results.push({ email, ok: true, inviteId: invite.id });
    } catch (err) {
      log.error("admin.doctor_invite.send_failed", err, { email });
      results.push({
        email,
        ok: false,
        error: err instanceof Error ? err.message : "Send threw",
      });
    }
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("admin.doctor_invite.persist_failed", err);
    // Best-effort — emails went out, history record may be lost. The
    // admin sees the per-recipient outcomes regardless.
  }

  const sentOk = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    sent: sentOk,
    failed: results.length - sentOk,
    results,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!isAdmin(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const cancelled = await cancelInvite(id);
  if (!cancelled) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, invite: cancelled });
}
