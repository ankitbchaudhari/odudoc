// PATCH /api/clinic/referrals/[id]
//   Update referral status. The receiving clinic can mark
//   accepted / declined / completed. The referring clinic can
//   cancel an outstanding referral. Either side gets a 403 trying
//   to perform the other side's action.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import {
  getReferralById,
  reloadClinicReferrals,
  updateReferralStatus,
} from "@/lib/clinic-referrals-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const PatchSchema = z.object({
  status: z.enum(["accepted", "declined", "completed", "cancelled"]),
  reason: z.string().trim().max(500).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const parsed = await parseJson(req, PatchSchema);
  if (!parsed.ok) return parsed.response;
  const { status, reason } = parsed.data;

  await reloadClinicReferrals();
  const existing = getReferralById(params.id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.toClinicId !== session.clinicId && existing.fromClinicId !== session.clinicId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const updated = updateReferralStatus(params.id, status, {
    reason,
    clinicId: session.clinicId,
  });
  if (!updated) {
    return NextResponse.json(
      { error: "Only the receiving clinic can accept/decline/complete; only the referring clinic can cancel." },
      { status: 403 },
    );
  }
  return NextResponse.json({ referral: updated });
}
