// Pull the latest Connect onboarding state from Stripe and mirror it
// back onto the Doctor record. Called when the doctor returns from
// the Connect form (return_url hits /dashboard/doctor?stripe=return)
// and again at the top of the dashboard so the rendered state matches
// reality. Cheap (one /v1/accounts retrieve) but rate-limit on the
// caller side anyway — see /dashboard/doctor.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail, syncDoctorStripeStatus } from "@/lib/doctors-store";
import { stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });

  if (!doctor.stripeAccountId) {
    return NextResponse.json({
      connected: false,
      detailsSubmitted: false,
      payoutsEnabled: false,
      chargesEnabled: false,
    });
  }

  try {
    const account = await stripe.accounts.retrieve(doctor.stripeAccountId);
    const detailsSubmitted = !!account.details_submitted;
    const payoutsEnabled = !!account.payouts_enabled;
    const chargesEnabled = !!account.charges_enabled;
    syncDoctorStripeStatus(doctor.id, { detailsSubmitted, payoutsEnabled, chargesEnabled });
    return NextResponse.json({
      connected: true,
      accountId: doctor.stripeAccountId,
      detailsSubmitted,
      payoutsEnabled,
      chargesEnabled,
      requirements: account.requirements ?? null,
    });
  } catch (err) {
    log.error("doctors.stripe.status_failed", err);
    return NextResponse.json({ error: "Stripe status check failed" }, { status: 502 });
  }
}
