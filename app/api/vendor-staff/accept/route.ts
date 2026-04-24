// POST /api/vendor-staff/accept
//
// Any signed-in user calls this to flip their pending pharmacy-staff
// invitations into `active`. We don't require a token because the
// invite is keyed on email — whoever controls the email address is
// who we meant to invite. Idempotent: safe to call repeatedly.
//
// GET returns the list of the caller's memberships so the Team-Invite
// acceptance UI can show "You've been invited by X Pharmacy" prompts.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  acceptStaffInvite,
  listStaffByEmail,
} from "@/lib/vendor-staff-store";
import { getVendorById } from "@/lib/vendors-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = listStaffByEmail(email).map((r) => {
    const v = getVendorById(r.vendorId);
    return {
      ...r,
      vendorName: v?.name,
    };
  });
  return NextResponse.json({ memberships: rows });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const accepted = acceptStaffInvite(email);
  return NextResponse.json({ accepted });
}
