import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createVendor, listVendors, getVendorByEmail } from "@/lib/vendors-store";
import { uploadFile } from "@/lib/files-service";
import { sendVendorApplicationReceivedEmail } from "@/lib/email";

import { log } from "@/lib/log";
export const runtime = "nodejs";

// GET — admin lists vendors (optionally filtered by status).
// POST — anyone signed-in can submit a vendor application; status stays
// "pending" until an admin approves. Accepts either JSON or multipart/form-data
// (the latter supports an optional `licenseDoc` file upload).

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; role?: string } | undefined) || {};
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") || "All") as "All" | "pending" | "approved" | "suspended" | "rejected";
  return NextResponse.json({ vendors: listVendors({ status }) });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = (session?.user as { email?: string; name?: string } | undefined) || {};
  if (!user.email) return NextResponse.json({ error: "Please sign in to register as a vendor." }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";
  const fields: Record<string, string> = {};
  let licenseDoc: File | null = null;

  try {
    if (contentType.startsWith("multipart/form-data")) {
      const form = await req.formData();
      form.forEach((value, key) => {
        if (typeof value === "string") fields[key] = value;
      });
      const maybeFile = form.get("licenseDoc");
      if (maybeFile instanceof File && maybeFile.size > 0) {
        licenseDoc = maybeFile;
      }
    } else {
      const body = await req.json().catch(() => ({}));
      Object.entries(body || {}).forEach(([k, v]) => {
        if (typeof v === "string") fields[k] = v;
      });
    }
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const name = String(fields.name || "").trim();
  const ownerName = String(fields.ownerName || user.name || "").trim();
  const phone = String(fields.phone || "").trim();
  const addressLine = String(fields.addressLine || "").trim();
  const city = String(fields.city || "").trim();
  const country = String(fields.country || "").trim();
  const licenseNumber = String(fields.licenseNumber || "").trim();

  if (name.length < 2) return NextResponse.json({ error: "Pharmacy/business name is required." }, { status: 400 });
  if (ownerName.length < 2) return NextResponse.json({ error: "Owner name is required." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 7) return NextResponse.json({ error: "Valid phone number is required." }, { status: 400 });
  if (!addressLine || !city || !country) return NextResponse.json({ error: "Full business address is required." }, { status: 400 });
  if (licenseNumber.length < 3) return NextResponse.json({ error: "License number is required." }, { status: 400 });

  const existing = getVendorByEmail(user.email);
  if (existing) return NextResponse.json({ vendor: existing, existed: true });

  // Validate + upload the license document if one was attached.
  let licenseDocUrl: string | undefined;
  if (licenseDoc) {
    const MAX = 5 * 1024 * 1024;
    if (licenseDoc.size > MAX) {
      return NextResponse.json({ error: "License file must be under 5MB." }, { status: 413 });
    }
    const okTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (licenseDoc.type && !okTypes.includes(licenseDoc.type)) {
      return NextResponse.json({ error: "License must be a PDF, PNG, JPG or WEBP." }, { status: 400 });
    }
    try {
      const stored = await uploadFile("licenses", licenseDoc, licenseDoc.name);
      licenseDocUrl = stored.filename;
    } catch (err) {
      log.error("[vendors] license upload failed:", err);
      return NextResponse.json({ error: "Could not save the license file. Please try again." }, { status: 502 });
    }
  } else if (typeof fields.licenseDocUrl === "string") {
    licenseDocUrl = fields.licenseDocUrl;
  }

  const vendor = createVendor({
    name, ownerName, ownerEmail: user.email, phone,
    addressLine, city, country, licenseNumber,
    licenseDocUrl,
    bankAccount: typeof fields.bankAccount === "string" ? fields.bankAccount : undefined,
  });

  // Fire-and-forget acknowledgement to the applicant.
  sendVendorApplicationReceivedEmail({
    to: vendor.ownerEmail,
    ownerName: vendor.ownerName,
    vendorName: vendor.name,
  }).catch((err) => log.error("[vendors] received email failed:", err));

  return NextResponse.json({ vendor }, { status: 201 });
}
