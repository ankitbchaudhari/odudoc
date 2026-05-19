// /api/family-access
//   GET ?dependentId=… — list collaborators on this dependent.
//   POST              — owner invites a new collaborator.
//   PATCH (?id=…)     — collaborator accepts an invite.
//   DELETE (?id=…)    — owner revokes (or collaborator declines).

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  inviteCollaborator,
  acceptInvite,
  revokeAccess,
  listAccessesForDependent,
  listInvitesForCollaborator,
  type FamilyPermission,
} from "@/lib/family-permissions";
import { sendEmail } from "@/lib/email";
import { parseJson, z, emailSchema, nonEmptyString } from "@/lib/validate";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const InviteSchema = z.object({
  dependentId: nonEmptyString.max(40),
  collaboratorEmail: emailSchema,
  collaboratorLabel: z.string().trim().max(120).optional(),
  level: z.enum(["primary", "caregiver", "observer"]),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = request.nextUrl.searchParams;
  const dependentId = sp.get("dependentId");
  if (dependentId) {
    return NextResponse.json({ accesses: listAccessesForDependent(session.user.email, dependentId) });
  }
  // No dependent → list pending invites this user can accept.
  return NextResponse.json({ pendingInvites: listInvitesForCollaborator(session.user.email) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseJson(request, InviteSchema);
  if (parsed instanceof NextResponse) return parsed;
  const a = inviteCollaborator({
    ownerEmail: session.user.email,
    dependentId: parsed.dependentId,
    collaboratorEmail: parsed.collaboratorEmail,
    collaboratorLabel: parsed.collaboratorLabel,
    level: parsed.level as FamilyPermission,
  });

  // Notify the collaborator.
  const origin = new URL(request.url).origin;
  sendEmail({
    from: "no-reply",
    to: parsed.collaboratorEmail,
    subject: `${session.user.name || "Someone"} invited you to help manage care on OduDoc`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <p>${session.user.name || "An OduDoc patient"} has invited you to collaborate on a dependent's care record.</p>
        <p>Access level: <strong>${parsed.level}</strong></p>
        <p style="margin:24px 0;text-align:center;">
          <a href="${origin}/dashboard/family" style="display:inline-block;background:#0F3570;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">View invitation</a>
        </p>
        <p style="font-size:12px;color:#64748b;">If you don't have an OduDoc account, sign up with this email first.</p>
      </div>
    `,
  }).catch((err) => log.warn("family-access.email_failed", { err: String(err) }));

  return NextResponse.json({ access: a }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const a = acceptInvite(id, session.user.email);
  if (!a) return NextResponse.json({ error: "Invite not found or not yours" }, { status: 404 });
  return NextResponse.json({ access: a });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const a = revokeAccess(id, session.user.email);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ access: a });
}
