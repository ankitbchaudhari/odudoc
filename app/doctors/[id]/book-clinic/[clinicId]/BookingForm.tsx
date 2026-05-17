"use client";

// Interactive booking form for /doctors/[id]/book-clinic/[clinicId].
// The wrapping server page fetches doctor + clinic data and hands it
// here as props, so this component never shows a loading state — the
// page renders with the form already populated.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Clinic {
  id: string;
  name: string;
  addressLine1: string;
  city: string;
  feeOverride?: number;
  acceptOnlinePayment: boolean;
  acceptClinicPayment: boolean;
}

interface Doctor {
  id: string;
  name: string;
  fee: number;
  timeSlots: string[];
  email?: string;
  phone?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildDateOptions(days: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const v = d.toISOString().slice(0, 10);
    const lbl = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    out.push({ value: v, label: i === 0 ? `Today · ${lbl}` : i === 1 ? `Tomorrow · ${lbl}` : lbl });
  }
  return out;
}

export default function BookingForm({ doctor, clinic }: { doctor: Doctor; clinic: Clinic }) {
  const router = useRouter();
  const [date, setDate] = useState(todayStr());
  const [slot, setSlot] = useState<string | null>(null);
  const [firstName, setFN] = useState("");
  const [lastName, setLN] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMode, setPaymentMode] = useState<"online" | "clinic">(
    !clinic.acceptClinicPayment && clinic.acceptOnlinePayment ? "online" : "clinic",
  );

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!slot) { setErr("Pick a time slot."); return; }
    if (firstName.trim().length < 1 || lastName.trim().length < 1) {
      setErr("Enter your name."); return;
    }
    if (phone.replace(/\D/g, "").length < 7) { setErr("Enter a valid phone."); return; }
    if (!email.includes("@")) { setErr("Enter a valid email."); return; }

    if (paymentMode === "online") {
      const href = `/doctors/${doctor.id}#book-online&clinicId=${clinic.id}&slot=${encodeURIComponent(slot)}&date=${date}`;
      router.push(href);
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorEmail: doctor.email,
          doctorPhone: doctor.phone,
          patientName: `${firstName.trim()} ${lastName.trim()}`,
          patientPhone: phone.trim(),
          patientEmail: email.trim().toLowerCase(),
          timeSlot: slot,
          fee: clinic.feeOverride ?? doctor.fee,
          appointmentType: "in-person",
          date,
          clinicId: clinic.id,
          paymentMode: "clinic",
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "Booking failed");
        return;
      }
      router.push(`/booking/${d.booking.id}`);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const dateOptions = buildDateOptions(15);
  const fee = clinic.feeOverride ?? doctor.fee;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href={`/doctors/${doctor.id}`} className="mb-4 inline-block text-sm text-gray-500 dark:text-slate-400 hover:underline">
        ← Back to {doctor.name}
      </Link>

      <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Book in-person visit</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          {doctor.name} at <strong>{clinic.name}</strong> · {clinic.addressLine1}, {clinic.city}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-5">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Date</span>
            <select value={date} onChange={(e) => { setDate(e.target.value); setSlot(null); }} className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm">
              {dateOptions.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </label>

          <div>
            <span className="mb-2 block text-xs font-medium text-gray-600 dark:text-slate-400">Time slot</span>
            {doctor.timeSlots.length === 0 ? (
              <p className="text-xs text-amber-700">No slots configured yet — contact the clinic.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {doctor.timeSlots.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSlot(s)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${slot === s ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:border-primary-300"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">First name</span>
              <input required value={firstName} onChange={(e) => setFN(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Last name</span>
              <input required value={lastName} onChange={(e) => setLN(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Phone</span>
            <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
            <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">SMS + WhatsApp confirmation goes here.</p>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email</span>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-slate-700 px-3 py-2 text-sm" />
          </label>

          {clinic.acceptOnlinePayment && clinic.acceptClinicPayment && (
            <fieldset>
              <legend className="mb-2 text-xs font-medium text-gray-600 dark:text-slate-400">Payment</legend>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setPaymentMode("clinic")} className={`rounded-lg border px-3 py-3 text-left text-xs ${paymentMode === "clinic" ? "border-primary-500 bg-primary-50" : "border-gray-200 dark:border-slate-800"}`}>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Pay at clinic</p>
                  <p className="mt-0.5 text-gray-500 dark:text-slate-400">Cash / UPI / card at reception</p>
                </button>
                <button type="button" onClick={() => setPaymentMode("online")} className={`rounded-lg border px-3 py-3 text-left text-xs ${paymentMode === "online" ? "border-primary-500 bg-primary-50" : "border-gray-200 dark:border-slate-800"}`}>
                  <p className="font-semibold text-gray-900 dark:text-slate-100">Pay online</p>
                  <p className="mt-0.5 text-gray-500 dark:text-slate-400">Stripe / Cashfree, paid now</p>
                </button>
              </div>
            </fieldset>
          )}

          <div className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-slate-900/60 px-3 py-2 text-sm">
            <span className="text-gray-600 dark:text-slate-300">Fee</span>
            <span className="font-semibold text-gray-900 dark:text-slate-100">${fee.toFixed(2)}</span>
          </div>

          {err && <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{err}</p>}

          <button disabled={busy || !slot} className="btn-primary w-full disabled:opacity-60">
            {busy ? "Booking…" : paymentMode === "online" ? "Continue to payment →" : "Confirm booking"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-xs text-gray-400 dark:text-slate-500">
        You&apos;ll receive your booking ID and QR via SMS, email, and WhatsApp.
      </p>
    </main>
  );
}
