// /api/share-tokens
//   GET  — list the calling patient's shares (active + expired).
//   POST — mint a new share token.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createShareToken, listSharesForPatient, type ShareScope } from "@/lib/share-token-store";
import { sendEmail } from "@/lib/email";
import { parseJson, z, emailSchema } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const SCOPES = ["consultations", "prescriptions", "lab_reports", "radiology", "vitals", "vaccinations"] as const;

const CreateSchema = z.object({
  scopes: z.array(z.enum(SCOPES)).min(1),
  consumerLabel: z.string().trim().max(120).optional(),
  consumerEmail: emailSchema.optional(),
  consultationIds: z.array(z.string().trim().max(40)).max(50).optional(),
  prescriptionIds: z.array(z.string().trim().max(40)).max(50).optional(),
  validHours: z.number().int().min(1).max(720), // 1h to 30d
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ shares: listSharesForPatient(session.user.email) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, CreateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const t = createShareToken({
    patientEmail: session.user.email,
    scopes: parsed.scopes as ShareScope[],
    consumerLabel: parsed.consumerLabel,
    consumerEmail: parsed.consumerEmail,
    consultationIds: parsed.consultationIds,
    prescriptionIds: parsed.prescriptionIds,
    validHours: parsed.validHours,
  });

  // If the patient gave a consumer email, send them the share URL.
  if (parsed.consumerEmail) {
    const origin = new URL(request.url).origin;
    const url = `${origin}/share/${t.token}`;
    sendEmail({
      from: "no-reply",
      to: parsed.consumerEmail,
      subject: `${session.user.name || "A patient on OduDoc"} shared a medical record with you`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <p>${session.user.name || "A patient on OduDoc"} has shared part of their medical record with you on OduDoc.</p>
          <p>Access expires on <strong>${new Date(t.expiresAt).toLocaleString()}</strong>.</p>
          <p style="margin:24px 0;text-align:center;">
            <a href="${url}" style="display:inline-block;background:#0F3570;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Open shared record</a>
          </p>
          <p style="font-size:12px;color:#64748b;">If you can't click the button, copy this link:<br/><code>${url}</code></p>
        </div>
      `,
    }).catch((err) => log.warn("share-token.email_failed", { err: String(err) }));
  }

  return NextResponse.json({ token: t }, { status: 201 });
}
