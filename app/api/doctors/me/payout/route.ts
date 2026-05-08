// Manual-payout details for the signed-in doctor.
//
// Replaces the Stripe Connect flow with a universal "tell us how to pay
// you" form: bank wire, PayPal, Wise, UPI, or "other". Admin reviews the
// stored details on /admin/doctors/{id} and processes payouts off-platform.
//
// GET  → current details (or null)
// PUT  → upsert details

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  findDoctorByEmail,
  setDoctorPayout,
  type DoctorPayoutMethod,
} from "@/lib/doctors-store";
import { awaitAllFlushesStrict } from "@/lib/persistent-array";
import { log } from "@/lib/log";

export const runtime = "nodejs";

const VALID_METHODS: DoctorPayoutMethod[] = [
  "bank",
  "paypal",
  "wise",
  "upi",
  "other",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });

  return NextResponse.json({ payout: doctor.payout || null });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const doctor = findDoctorByEmail(email);
  if (!doctor) return NextResponse.json({ error: "Doctor record not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const method =
    typeof body.method === "string" && VALID_METHODS.includes(body.method as DoctorPayoutMethod)
      ? (body.method as DoctorPayoutMethod)
      : "bank";

  const patch = {
    method,
    accountHolder: typeof body.accountHolder === "string" ? body.accountHolder.trim() : undefined,
    bankName: typeof body.bankName === "string" ? body.bankName.trim() : undefined,
    accountNumber: typeof body.accountNumber === "string" ? body.accountNumber.trim() : undefined,
    routingCode: typeof body.routingCode === "string" ? body.routingCode.trim() : undefined,
    country: typeof body.country === "string" ? body.country.toUpperCase().trim() : undefined,
    currency: typeof body.currency === "string" ? body.currency.toUpperCase().trim() : undefined,
    paypalEmail: typeof body.paypalEmail === "string" ? body.paypalEmail.trim() : undefined,
    upiId: typeof body.upiId === "string" ? body.upiId.trim() : undefined,
    notes: typeof body.notes === "string" ? body.notes.trim() : undefined,
  };

  const updated = setDoctorPayout(doctor.id, patch);
  if (!updated) return NextResponse.json({ error: "Update failed" }, { status: 500 });

  // Drain Postgres flush before responding — Vercel will freeze the
  // Lambda the moment we return, so a fire-and-forget write would be
  // lost on cold-start lambdas. See admin/doctors route.
  try {
    await awaitAllFlushesStrict();
  } catch (err) {
    log.error("doctors.payout.persist_failed", err, { id: doctor.id });
    return NextResponse.json(
      { error: "Saved temporarily but failed to persist. Try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ payout: updated.payout });
}
