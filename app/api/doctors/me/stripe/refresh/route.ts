// Re-issue a Stripe Connect onboarding link if the first one expired.
// Stripe account_links live ~ a few minutes; doctors who get pulled
// away mid-form need a fresh URL on return.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findDoctorByEmail } from "@/lib/doctors-store";
import { stripe } from "@/lib/stripe";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });
  if (!doctor.stripeAccountId) {
    return NextResponse.json(
      { error: "No Stripe account yet — call /onboard first." },
      { status: 409 },
    );
  }

  try {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.odudoc.com";
    const link = await stripe.accountLinks.create({
      account: doctor.stripeAccountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/doctor?stripe=refresh`,
      return_url: `${origin}/dashboard/doctor?stripe=return`,
    });
    return NextResponse.json({ url: link.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Stripe link refresh failed";
    log.error("doctors.stripe.refresh_failed", err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
