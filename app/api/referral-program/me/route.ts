// Self-read for the referral program: returns the signed-in user's
// referral code, their share link, current credit balance, and a
// summary of every referral they've made.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  ensureReferralCode,
  findUserByEmail,
} from "@/lib/users-store";
import {
  getReferralStatsForUser,
  reloadReferralProgram,
  REFERRAL_REWARD_CENTS,
  DOCTOR_REFERRAL_REWARD_CENTS,
} from "@/lib/referral-program-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { email?: string } | undefined;
  if (!sessionUser?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = findUserByEmail(sessionUser.email);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  // Lazy-mint a code if one of the pre-feature accounts is hitting
  // this endpoint for the first time. The flush is fire-and-forget
  // so a Postgres hiccup doesn't block the response.
  const code = ensureReferralCode(user);
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("referral_program.me.code_persist_failed", err, {
      userId: user.id,
    });
  }

  await reloadReferralProgram();
  const stats = await getReferralStatsForUser(user.id, user.email);

  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
  return NextResponse.json({
    code,
    shareUrl: `${base}/?ref=${code}`,
    /** Direct link the user can paste in the Apply-as-doctor flow.
     *  Lands on /for-doctors with the ?ref pre-attached so the code
     *  is captured even before the candidate clicks Apply. */
    doctorShareUrl: `${base}/for-doctors?ref=${code}`,
    creditCents: user.referralCreditCents || 0,
    currency: "USD",
    rewardEachCents: REFERRAL_REWARD_CENTS,
    doctorRewardEachCents: DOCTOR_REFERRAL_REWARD_CENTS,
    role: user.role,
    stats,
  });
}
