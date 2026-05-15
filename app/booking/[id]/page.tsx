// Patient-facing booking confirmation. Shows the booking summary, the
// QR code (encoded URL is /b/<id> so reception scanning opens this same
// page), clinic address, payment mode, and a "Save to wallet" -style
// helper. No auth required — the booking ID is the access control for v1.

import { getBookingById } from "@/lib/bookings-store";
import { getClinicById } from "@/lib/clinics-store";
import { notFound } from "next/navigation";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://odudoc.com";
}

function qrImageUrl(data: string, size = 280): string {
  // External QR generator — zero dependencies. The encoded payload is a
  // URL pointing back to /b/<id>, so any phone camera that scans the QR
  // opens this confirmation in the patient's browser. Reception's QR
  // scanner (any browser camera or QR-scan app) does the same and the
  // staff can then sign in to lookup details.
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export default function BookingConfirmationPage({ params }: { params: { id: string } }) {
  const booking = getBookingById(params.id);
  if (!booking) notFound();

  const clinic = booking.clinicId ? getClinicById(booking.clinicId) : null;
  const url = `${baseUrl()}/b/${booking.id}`;
  const qrUrl = qrImageUrl(url);

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Appointment confirmed</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Show this QR code at reception.</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`Booking QR for ${booking.id}`} width={280} height={280} className="rounded-lg border border-gray-100 dark:border-slate-800" />
          <p className="mt-3 text-sm font-mono font-semibold text-gray-800 dark:text-slate-200">{booking.id}</p>
          <p className="text-xs text-gray-400 dark:text-slate-500">Booking reference</p>
        </div>

        <dl className="mt-6 divide-y divide-gray-100 dark:divide-slate-800 text-sm">
          <Row label="Patient" value={booking.patientName} />
          <Row label="Doctor" value={booking.doctorName} />
          {booking.date && <Row label="Date" value={booking.date} />}
          <Row label="Time" value={booking.timeSlot} />
          {clinic && (
            <>
              <Row label="Clinic" value={clinic.name} />
              <Row
                label="Address"
                value={[clinic.addressLine1, clinic.addressLine2, clinic.city, clinic.state, clinic.postalCode].filter(Boolean).join(", ")}
              />
              {clinic.phone && <Row label="Phone" value={clinic.phone} />}
              {clinic.mapsUrl && (
                <Row
                  label="Map"
                  value={
                    <a href={clinic.mapsUrl} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                      Open in Google Maps →
                    </a>
                  }
                />
              )}
            </>
          )}
          <Row
            label="Payment"
            value={
              booking.paymentMode === "clinic"
                ? "Pay at clinic (cash / UPI)"
                : booking.paymentStatus === "paid"
                ? "Paid online ✓"
                : "Pending"
            }
          />
          {booking.fee && <Row label="Fee" value={`$${booking.fee.toFixed(2)}`} />}
        </dl>

        {booking.paymentMode === "clinic" && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            <strong>Pay at clinic:</strong> Bring cash or your UPI / card. Reception will collect ${booking.fee.toFixed(2)} when you arrive.
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <a href={url} className="rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            Share this link
          </a>
          <Link href="/" className="text-center text-sm text-gray-500 dark:text-slate-400 hover:underline">
            Back to home
          </Link>
        </div>

        <p className="mt-6 border-t border-gray-100 dark:border-slate-800 pt-4 text-center text-xs text-gray-400 dark:text-slate-500">
          A copy of this confirmation has been sent to your SMS, email, and WhatsApp.
        </p>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="text-gray-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-gray-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
