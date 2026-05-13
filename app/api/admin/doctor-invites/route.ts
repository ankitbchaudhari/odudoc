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
import { sendDoctorInviteViaSentDm } from "@/lib/sent-dm";
import { markInviteWhatsappSent } from "@/lib/doctor-invites-store";
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
    /** Optional phone (with country code) — when single-recipient
     *  + provided, the resulting invite gets a WhatsApp link in
     *  the history. Bulk-paste flows can't use this since one
     *  phone per batch only makes sense for single sends. */
    phone?: string;
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

  // Phone-only invite path: when no emails are provided but a phone
  // number is, we treat this as a WhatsApp-first invite. The row
  // still needs a primary key on the email column (schema unchanged
  // for backward compat), so we synthesise an internal-only email
  // of the form `wa-<digits>@invite.odudoc.local`. The admin UI
  // hides synthetic emails and shows the phone instead.
  const rawPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const digits = rawPhone.replace(/[^\d]/g, "");
  const isPhoneOnly = unique.length === 0 && digits.length >= 7;

  if (unique.length === 0 && !isPhoneOnly) {
    return NextResponse.json(
      { error: "Provide at least one email or a WhatsApp number." },
      { status: 400 }
    );
  }
  if (unique.length > 50) {
    return NextResponse.json(
      { error: "Too many emails in one batch (max 50). Split it up." },
      { status: 413 }
    );
  }
  if (isPhoneOnly) {
    // Single phone-only invite. Skip email send; persist the row so
    // the admin gets a "Open WhatsApp" link in the history.
    const syntheticEmail = `wa-${digits}@invite.odudoc.local`;
    const phoneE164 = rawPhone.startsWith("+") ? rawPhone : `+${digits}`;
    try {
      const invite = await createDoctorInvite({
        email: syntheticEmail,
        name: body.name,
        specialty: body.specialty,
        country: body.country,
        phone: phoneE164,
        sentBy: adminEmail || "admin",
        note: body.note,
      });
      // Auto-fire the approved WhatsApp template when configured.
      // Falls back silently to the wa.me click-to-chat path in the
      // history row when no template is set up — admin can still
      // send manually from the row.
      let waAutoSent = false;
      let waError: string | undefined;
      try {
        const r = await sendDoctorInviteViaSentDm(phoneE164, {
          doctorName: body.name || "there",
        });
        if (r.ok) {
          waAutoSent = true;
          try { await markInviteWhatsappSent(invite.id); } catch { /* best-effort */ }
        } else {
          waError = r.error;
          log.warn("admin.doctor_invite.wa_auto_send_failed", { error: r.error || "unknown" });
        }
      } catch (err) {
        waError = err instanceof Error ? err.message : "send threw";
        log.warn("admin.doctor_invite.wa_auto_send_threw", { error: waError });
      }
      try { await awaitAllFlushesStrict(); } catch { /* best-effort */ }
      return NextResponse.json({
        ok: true,
        sent: 1,
        failed: 0,
        results: [{
          email: syntheticEmail,
          phone: phoneE164,
          ok: true,
          inviteId: invite.id,
          channel: "whatsapp",
          waAutoSent,
          waError,
        }],
      });
    } catch (err) {
      log.error("admin.doctor_invite.phone_only_failed", err, { phone: phoneE164 });
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Phone invite failed" },
        { status: 500 },
      );
    }
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
      // Phone goes on the invite row only when there's a single
      // recipient — bulk-paste flows would otherwise stamp every
      // row with the same number, which is wrong.
      const phoneForRow =
        unique.length === 1 ? body.phone : undefined;
      const invite = await createDoctorInvite({
        email,
        name: body.name,
        specialty: body.specialty,
        country: body.country,
        phone: phoneForRow,
        sentBy: adminEmail || "admin",
        note: body.note,
      });
      // Dual-channel: when a phone was attached to a single-recipient
      // send, also fire the WhatsApp template (best-effort, doesn't
      // block the email-side success).
      if (phoneForRow) {
        try {
          const normalizedPhone = phoneForRow.startsWith("+")
            ? phoneForRow
            : `+${phoneForRow.replace(/[^\d]/g, "")}`;
          const r = await sendDoctorInviteViaSentDm(normalizedPhone, {
            doctorName: body.name || "there",
          });
          if (r.ok) {
            try { await markInviteWhatsappSent(invite.id); } catch { /* best-effort */ }
          } else {
            log.warn("admin.doctor_invite.wa_dual_send_failed", { error: r.error || "unknown", email });
          }
        } catch (err) {
          log.warn("admin.doctor_invite.wa_dual_send_threw", {
            error: err instanceof Error ? err.message : "send threw",
            email,
          });
        }
      }
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
