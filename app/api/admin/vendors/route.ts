// Admin-only: create a vendor manually (bypassing the public /sell signup).
// Useful when onboarding a pharmacy by hand instead of having them apply
// through the form. Optional `autoApprove` flips the status from "pending"
// to "approved" in the same call.

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  createVendor,
  getVendorByEmail,
  setVendorStatus,
  updateVendor,
} from "@/lib/vendors-store";
import { log } from "@/lib/log";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const ownerName = String(body.ownerName || "").trim();
  const ownerEmail = String(body.ownerEmail || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const addressLine = String(body.addressLine || "").trim();
  const city = String(body.city || "").trim();
  const country = String(body.country || "").trim();
  const licenseNumber = String(body.licenseNumber || "").trim();
  const licenseDocUrl =
    typeof body.licenseDocUrl === "string" ? body.licenseDocUrl.trim() : undefined;
  const bankAccount =
    typeof body.bankAccount === "string" ? body.bankAccount.trim() : undefined;
  const commissionPercent =
    typeof body.commissionPercent === "number" && Number.isFinite(body.commissionPercent)
      ? Math.max(0, Math.min(100, body.commissionPercent))
      : undefined;
  const autoApprove = body.autoApprove === true;

  if (name.length < 2) return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  if (ownerName.length < 2) return NextResponse.json({ error: "Owner name is required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    return NextResponse.json({ error: "Valid owner email is required." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 7)
    return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
  if (!addressLine || !city || !country)
    return NextResponse.json({ error: "Full business address is required." }, { status: 400 });
  if (licenseNumber.length < 3)
    return NextResponse.json({ error: "License number is required." }, { status: 400 });

  if (getVendorByEmail(ownerEmail)) {
    return NextResponse.json(
      { error: "A vendor with this owner email already exists." },
      { status: 409 }
    );
  }

  try {
    let vendor = createVendor({
      name,
      ownerName,
      ownerEmail,
      phone,
      addressLine,
      city,
      country,
      licenseNumber,
      licenseDocUrl,
      bankAccount,
    });

    // createVendor defaults commission to 10 — override if the admin
    // supplied a custom rate.
    if (commissionPercent !== undefined && commissionPercent !== vendor.commissionPercent) {
      vendor = updateVendor(vendor.id, { commissionPercent }) || vendor;
    }

    if (autoApprove) {
      vendor = setVendorStatus(vendor.id, "approved") || vendor;
    }

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (err) {
    log.error("admin_vendors.create_failed", err);
    return NextResponse.json({ error: "Could not create vendor." }, { status: 500 });
  }
}
