// Stripe Connect onboarding — for doctors directly (NOT via vendors).
//
// The audit caught that vendor onboarding routes gate on `vendor.status`
// and doctors aren't vendors, so doctors literally couldn't complete a
// Connect onboarding round-trip. This is the doctor-shaped parallel:
//   POST creates an Express connected account on first call, stashes
//        the id on the Doctor record, returns the account_link URL.
//   The /refresh sibling route re-creates the link if the first one
//        expires before the doctor completes the form.
//
// Onboarding state mirrors back to the Doctor record via
// /api/doctors/me/stripe/status so the dashboard can render
// "Verified for payouts" without re-hitting Stripe per page.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail, setDoctorStripeAccount } from "@/lib/doctors-store";
import { stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  if (doctor.status !== "Active") {
    return NextResponse.json(
      { error: "Doctor must be approved before connecting Stripe." },
      { status: 403 },
    );
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured on the server." }, { status: 500 });
  }

  try {
    let accountId = doctor.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: doctor.email,
        business_profile: {
          name: doctor.name,
          // Healthcare MCC — telehealth providers fall under 8011 (doctor
          // services). Pre-classifying avoids a manual review delay.
          mcc: "8011",
        },
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        metadata: { doctorId: doctor.id, role: "doctor" },
      });
      accountId = account.id;
      setDoctorStripeAccount(doctor.id, accountId);
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/doctor?stripe=refresh`,
      return_url: `${origin}/dashboard/doctor?stripe=return`,
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe onboarding failed";
    log.error("doctors.stripe.onboard_failed", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
