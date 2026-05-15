// POST /api/refer-doctor
//
// Patient-driven doctor referral. Logged-in patient submits a doctor
// they want OduDoc to reach out to. We store the referral, ping the
// admin, and (optionally) email the doctor a soft warm-intro saying
// "your patient suggested OduDoc to you" — the highest-trust cold
// channel that exists.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createDoctorReferral, countReferralsByPatient, reloadDoctorReferrals } from "@/lib/doctor-referrals-store";
import { addAdminNotification } from "@/lib/admin-notifications-store";
import { sendEmail } from "@/lib/email";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { enforceRateLimit } from "@/lib/rate-limit-helpers";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const SOFT_WARM_INTRO_HTML = (params: {
  doctorName: string;
  patientName: string;
}) => `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:18px 24px;color:#ffffff;font-weight:700;font-size:18px;">OduDoc — recommended by your patient</td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">Dear Dr ${params.doctorName.split(" ").slice(-1).join("") || params.doctorName},</p>
          <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">
            <strong>${params.patientName}</strong>, one of your patients, suggested we reach out. They&rsquo;re using OduDoc and thought you&rsquo;d find it useful — specifically the AI ambient scribe that writes the SOAP note from the consultation audio.
          </p>
          <p style="margin:0 0 12px 0;font-size:15px;color:#374151;">
            We&rsquo;re running a 90-day pilot, free, founder-direct support. The full pitch is here:
          </p>
          <p style="margin:18px 0;">
            <a href="https://www.odudoc.com/pilot" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;">See the pilot programme</a>
          </p>
          <p style="margin:18px 0 0 0;font-size:13px;color:#6b7280;">
            If now isn&rsquo;t a good time, just reply with &ldquo;not interested&rdquo; and we&rsquo;ll stop. Your patient won&rsquo;t hear about it from us either way.
          </p>
          <p style="margin:8px 0 0 0;font-size:13px;color:#6b7280;">
            — OduDoc team
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

export async function POST(req: NextRequest) {
  const blocked = await enforceRateLimit(req, "refer-doctor", 10, "1 h");
  if (blocked) return blocked;

  const session = await getServerSession(authOptions);
  const user = session?.user as { email?: string; name?: string } | undefined;
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Soft per-patient cap so one bad actor can't blast 100 doctors.
  // Reload first so referrals made on sibling Lambdas count toward
  // the cap — otherwise the rate-limit is per-Lambda, not per-user.
  await reloadDoctorReferrals();
  const existing = countReferralsByPatient(user.email);
  if (existing >= 25) {
    return NextResponse.json(
      { error: "You've reached the limit of 25 doctor referrals." },
      { status: 429 },
    );
  }

  let body: {
    doctorName?: string;
    doctorEmail?: string;
    doctorPhone?: string;
    doctorSpecialty?: string;
    clinicName?: string;
    city?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const doctorName = (body.doctorName || "").trim();
  if (!doctorName) {
    return NextResponse.json({ error: "Doctor name is required" }, { status: 400 });
  }
  if (!body.doctorEmail && !body.doctorPhone) {
    return NextResponse.json(
      { error: "Need at least an email or phone for the doctor" },
      { status: 400 },
    );
  }

  const referral = createDoctorReferral({
    referredBy: user.email,
    referredByName: user.name || undefined,
    doctorName,
    doctorEmail: body.doctorEmail,
    doctorPhone: body.doctorPhone,
    doctorSpecialty: body.doctorSpecialty,
    clinicName: body.clinicName,
    city: body.city,
    note: body.note,
  });

  // Best-effort admin notification — never fail the request over this.
  try {
    addAdminNotification({
      type: "doctor_referral",
      title: "Patient referred a doctor",
      body: `${user.name || user.email} suggested ${doctorName}${
        body.clinicName ? ` (${body.clinicName})` : ""
      }${body.city ? `, ${body.city}` : ""}.`,
      link: "/admin/doctor-referrals",
    });
  } catch (err) {
    log.warn("refer_doctor.notify_admin_failed", { err: String(err) });
  }

  // Optional soft email to the doctor — only when we have an email
  // address. Tone is "your patient thought you'd find this useful",
  // not a sales pitch.
  if (referral.doctorEmail) {
    try {
      const r = await sendEmail({
        from: "admin",
        to: referral.doctorEmail,
        subject: `Recommended to OduDoc by your patient ${user.name || ""}`.trim(),
        html: SOFT_WARM_INTRO_HTML({
          doctorName: doctorName,
          patientName: user.name || user.email,
        }),
        replyTo: "founder@odudoc.com",
      });
      if (!r.ok) log.warn("refer_doctor.email_failed", { error: r.error });
    } catch (err) {
      log.warn("refer_doctor.email_threw", { err: String(err) });
    }
  }

  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("refer_doctor.persist_failed", err);
  }

  return NextResponse.json({ ok: true, referral });
}
