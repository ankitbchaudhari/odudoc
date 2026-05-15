// POST /api/clinic/invoices            — create an invoice
// GET  /api/clinic/invoices?clinicId=&… — list invoices for this clinic
//
// Reception or the doctor calls POST after a visit. The body carries
// the line items + optional tax-context overrides (intra-state flag,
// override tax id) — defaults come from the clinic record. The tax
// breakdown is computed server-side via lib/tax/engine so the patient
// can't tamper with rates by editing the request body.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getClinicSession } from "@/lib/clinic-session";
import { getClinicById } from "@/lib/clinics-store";
import { getBookingById } from "@/lib/bookings-store";
import { computeInvoice, getRule } from "@/lib/tax/engine";
import {
  createClinicInvoice,
  listInvoicesByClinic,
  type ClinicInvoiceLineInput,
} from "@/lib/clinic-invoices-store";
import { parseJson } from "@/lib/api-validate";

export const runtime = "nodejs";

const LineSchema = z.object({
  description: z.string().trim().min(1).max(200),
  category: z.enum([
    "consultation", "lab_test", "imaging", "medicine",
    "consumable", "room_charge", "surgery", "other",
  ]),
  amountRupees: z.number().nonnegative().max(10_000_000),
  taxOverride: z.enum(["exempt", "standard", "reduced"]).optional(),
});

const CreateSchema = z.object({
  bookingId: z.string().regex(/^BK-\d+$/).optional(),
  patientName: z.string().trim().min(1).max(120),
  patientPhone: z.string().trim().min(3).max(32),
  patientEmail: z.string().trim().email().max(200).optional(),
  lines: z.array(LineSchema).min(1).max(40),
  /** India only — same-state buyer/seller collects CGST + SGST,
   *  inter-state collects IGST. Reception clicks a toggle on the
   *  invoice modal. */
  intraState: z.boolean().optional(),
  markPaidNow: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const parsed = await parseJson(req, CreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const clinic = getClinicById(session.clinicId);
  if (!clinic) return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });

  // Tax country — clinic.taxCountryCode is canonical; fall back to
  // a best-effort name → ISO mapping when missing on older rows.
  const countryCode = (clinic.taxCountryCode || guessCountryCode(clinic.country)).toUpperCase();
  const rule = getRule(countryCode);
  const currency = rule?.currency || "USD";

  // For India, intra-state defaults to true (assumes the patient
  // walked into the clinic in the same state). Reception can flip it
  // for an inter-state patient.
  const intraState = countryCode === "IN" ? (body.intraState ?? true) : undefined;

  const lines: ClinicInvoiceLineInput[] = body.lines.map((l) => ({
    description: l.description,
    category: l.category,
    amountRupees: l.amountRupees,
    taxOverride: l.taxOverride,
  }));

  const tax = computeInvoice({
    countryIso2: countryCode,
    lines,
    intraStateInIndia: intraState,
  });

  const booking = body.bookingId ? getBookingById(body.bookingId) : undefined;
  if (booking && booking.clinicId && booking.clinicId !== clinic.id) {
    return NextResponse.json({ error: "booking_belongs_to_different_clinic" }, { status: 403 });
  }

  const invoice = createClinicInvoice({
    clinicId: clinic.id,
    doctorId: clinic.doctorId,
    bookingId: booking?.id,
    patientName: body.patientName,
    patientPhone: body.patientPhone,
    patientEmail: body.patientEmail || booking?.patientEmail,
    patientUserId: booking?.patientUserId,
    issuer: {
      legalBusinessName: clinic.legalBusinessName,
      taxCountryCode: countryCode,
      taxIdType: clinic.taxIdType,
      taxId: clinic.taxId,
      taxRegistered: !!clinic.taxRegistered,
      addressLine1: clinic.addressLine1,
      city: clinic.city,
      state: clinic.state,
      postalCode: clinic.postalCode,
      homeStateCode: clinic.homeStateCode,
    },
    lines,
    tax,
    currency,
    intraState,
    createdByStaffId: session.staffId,
    paidAt: body.markPaidNow ? new Date().toISOString() : undefined,
  });

  if (body.markPaidNow) {
    invoice.status = "paid";
  }

  return NextResponse.json({ invoice });
}

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });
  const list = listInvoicesByClinic(session.clinicId);
  return NextResponse.json({ invoices: list });
}

// Best-effort name→ISO mapping for the (rare) case a clinic row was
// written before taxCountryCode existed. Covers OduDoc's primary
// markets; everything else falls back to "" which the tax engine
// treats as 'no tax' (regime: 'none').
function guessCountryCode(name?: string): string {
  if (!name) return "";
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    "india": "IN", "united arab emirates": "AE", "uae": "AE",
    "saudi arabia": "SA", "qatar": "QA", "bahrain": "BH",
    "kuwait": "KW", "oman": "OM", "singapore": "SG",
    "united kingdom": "GB", "uk": "GB", "united states": "US",
    "usa": "US", "canada": "CA", "australia": "AU",
  };
  return map[n] || "";
}
