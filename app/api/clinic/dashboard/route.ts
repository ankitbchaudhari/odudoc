// GET /api/clinic/dashboard
//
// Compact stats payload for the staff dashboard landing page. One
// round-trip returns:
//   - clinic + staff session info (so the header doesn't need a
//     separate /api/clinic/auth fetch)
//   - today's booking counts (scheduled / arrived / completed)
//   - today's invoice totals (issued / paid)
//   - recent activity (last 5 invoices + bookings combined)
//   - staff list snapshot for managers

import { NextRequest, NextResponse } from "next/server";
import { getClinicSession } from "@/lib/clinic-session";
import { getClinicById } from "@/lib/clinics-store";
import { getStaffById, listStaffByClinic } from "@/lib/clinic-staff-store";
import { getBookings, reloadBookings } from "@/lib/bookings-store";
import { listInvoicesByClinic, reloadInvoices } from "@/lib/clinic-invoices-store";
import { listEmrByClinic, reloadEmr } from "@/lib/clinic-emr-store";
import { countPendingInbound, reloadClinicReferrals } from "@/lib/clinic-referrals-store";

export const runtime = "nodejs";

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString(), todayYmd: start.toISOString().slice(0, 10) };
}

export async function GET(req: NextRequest) {
  const session = getClinicSession(req);
  if (!session) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const clinic = getClinicById(session.clinicId);
  if (!clinic) return NextResponse.json({ error: "clinic_not_found" }, { status: 404 });

  const staff = getStaffById(session.staffId);
  if (!staff) return NextResponse.json({ error: "staff_not_found" }, { status: 404 });

  const { startIso, endIso, todayYmd } = todayBounds();

  // Refresh in-memory state from Postgres so the dashboard reflects
  // bookings / invoices / EMR rows written by sibling Lambdas
  // moments before this read.
  await Promise.all([reloadBookings(), reloadInvoices(), reloadEmr(), reloadClinicReferrals()]);

  const pendingReferrals = countPendingInbound(clinic.id);

  // Today's bookings for this clinic
  const allBookings = getBookings().filter((b) => b.clinicId === clinic.id);
  const todays = allBookings.filter((b) => b.date === todayYmd);
  const upcoming = allBookings.filter((b) => (b.date || "") > todayYmd && (b.status ?? "scheduled") === "scheduled");

  const bookingStats = {
    todayTotal: todays.length,
    todayArrived: todays.filter((b) => b.arrivedAt).length,
    todayPending: todays.filter((b) => !b.arrivedAt && (b.status ?? "scheduled") === "scheduled").length,
    todayPaid: todays.filter((b) => b.paymentStatus === "paid").length,
    upcoming: upcoming.length,
  };

  // Today's invoices
  const allInvoices = listInvoicesByClinic(clinic.id);
  const todaysInvoices = allInvoices.filter(
    (i) => i.issuedAt >= startIso && i.issuedAt < endIso,
  );
  const invoiceStats = {
    todayCount: todaysInvoices.length,
    todayInvoiced: todaysInvoices.reduce((s, i) => s + (i.status !== "void" ? i.tax.grandTotalRupees : 0), 0),
    todayCollected: todaysInvoices.reduce((s, i) => s + (i.status === "paid" ? i.tax.grandTotalRupees : 0), 0),
    todayTaxDue: todaysInvoices.reduce((s, i) => s + (i.status !== "void" ? i.tax.totalTaxRupees : 0), 0),
  };

  // EMR entries today
  const emrToday = listEmrByClinic(clinic.id).filter(
    (e) => e.createdAt >= startIso && e.createdAt < endIso,
  );

  // Recent activity — last 5 invoices + last 5 arrivals merged
  type Activity = {
    kind: "invoice" | "arrival" | "emr";
    id: string;
    label: string;
    detail: string;
    at: string;
  };
  const activity: Activity[] = [
    ...allInvoices.slice(0, 5).map((i): Activity => ({
      kind: "invoice",
      id: i.id,
      label: `Invoice ${i.number}`,
      detail: `${i.patientName} · ${i.currency} ${i.tax.grandTotalRupees}`,
      at: i.issuedAt,
    })),
    ...allBookings
      .filter((b) => b.arrivedAt)
      .sort((a, b) => (b.arrivedAt || "").localeCompare(a.arrivedAt || ""))
      .slice(0, 5)
      .map((b): Activity => ({
        kind: "arrival",
        id: b.id,
        label: `${b.patientName} arrived`,
        detail: `${b.id} · ${b.timeSlot}`,
        at: b.arrivedAt!,
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return NextResponse.json({
    clinic: {
      id: clinic.id,
      name: clinic.name,
      city: clinic.city,
      country: clinic.country,
    },
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
    },
    // Managers see staff list; receptionists and assistants don't
    // need it — keep payload small.
    staffList: staff.role === "manager"
      ? listStaffByClinic(clinic.id).map(({ passwordHash: _ph, ...rest }) => rest)
      : undefined,
    bookingStats,
    invoiceStats,
    emrTodayCount: emrToday.length,
    pendingReferrals,
    activity,
  });
}
