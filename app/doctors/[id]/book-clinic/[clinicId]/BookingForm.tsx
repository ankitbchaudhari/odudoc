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

  const inputBase =
    "w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-gray-900 dark:text-slate-100 shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition";

  return (
    <main className="relative mx-auto min-h-screen max-w-xl px-4 py-8">
      {/* Ambient gradient blobs for depth */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-400/30 via-fuchsia-400/30 to-emerald-300/30 blur-3xl dark:from-indigo-600/30 dark:via-fuchsia-600/30 dark:to-emerald-500/20" />
      </div>

      <Link
        href={`/doctors/${doctor.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition"
      >
        ← Back to {doctor.name}
      </Link>

      <div className="overflow-hidden rounded-3xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/5 dark:shadow-black/40">
        {/* Hero header */}
        <header className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 pt-6 pb-7 text-white">
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
              In-person visit
            </p>
            <h1 className="mt-1 text-2xl font-bold">Book your appointment</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base">👨‍⚕️</span>
                <span className="font-semibold">{doctor.name}</span>
              </span>
              <span className="text-white/40">·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base">🏥</span>
                <span>{clinic.name}</span>
              </span>
            </div>
            <p className="mt-1 text-xs text-white/70">
              📍 {clinic.addressLine1}, {clinic.city}
            </p>
          </div>
          {/* Decorative ring */}
          <div className="pointer-events-none absolute -right-12 -bottom-12 h-40 w-40 rounded-full border-2 border-white/10" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full border border-white/5" />
        </header>

        <form onSubmit={submit} className="space-y-6 px-6 py-6">
          {/* Date */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-sm">📅</span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">When would you like to visit?</h2>
            </div>
            <select
              value={date}
              onChange={(e) => { setDate(e.target.value); setSlot(null); }}
              className={inputBase}
            >
              {dateOptions.map((d) => (
                <option key={d.value} value={d.value} className="bg-white dark:bg-slate-950">
                  {d.label}
                </option>
              ))}
            </select>
          </section>

          {/* Time slots */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 text-sm">🕒</span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Pick a time slot</h2>
            </div>
            {doctor.timeSlots.length === 0 ? (
              <p className="rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                No slots configured yet — contact the clinic directly.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {doctor.timeSlots.map((s) => {
                  const selected = slot === s;
                  return (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSlot(s)}
                      className={
                        selected
                          ? "rounded-xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-500 to-violet-500 px-2 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-500/30 transition"
                          : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-2.5 text-xs font-medium text-gray-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 transition"
                      }
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Patient details */}
          <section>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-300 text-sm">👤</span>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Your details</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">First name</span>
                  <input required value={firstName} onChange={(e) => setFN(e.target.value)} className={inputBase} placeholder="Riya" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Last name</span>
                  <input required value={lastName} onChange={(e) => setLN(e.target.value)} className={inputBase} placeholder="Sharma" />
                </label>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Phone</span>
                <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98XXXXXXXX" className={inputBase} />
                <p className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">
                  📱 We&apos;ll send your booking ID via SMS + WhatsApp.
                </p>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-slate-400">Email</span>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputBase} />
              </label>
            </div>
          </section>

          {/* Payment */}
          {clinic.acceptOnlinePayment && clinic.acceptClinicPayment && (
            <section>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 text-sm">💳</span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">How would you like to pay?</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["clinic", "online"] as const).map((mode) => {
                  const selected = paymentMode === mode;
                  const isClinic = mode === "clinic";
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={
                        selected
                          ? (isClinic
                              ? "rounded-xl border-2 border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 px-4 py-3 text-left shadow-md shadow-emerald-500/20 transition"
                              : "rounded-xl border-2 border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 px-4 py-3 text-left shadow-md shadow-indigo-500/20 transition")
                          : "rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-left hover:border-gray-300 dark:hover:border-slate-600 transition"
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{isClinic ? "🏥" : "⚡"}</span>
                        <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {isClinic ? "Pay at clinic" : "Pay online"}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
                        {isClinic ? "Cash / UPI / card at reception" : "Stripe / Cashfree, paid now"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Fee summary */}
          <div className="overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 dark:from-indigo-950/40 dark:via-violet-950/40 dark:to-fuchsia-950/40 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-indigo-700/70 dark:text-indigo-300/70">Consultation fee</p>
                <p className="text-xs text-gray-600 dark:text-slate-400">{clinic.name}</p>
              </div>
              <p className="bg-gradient-to-r from-indigo-600 to-fuchsia-600 dark:from-indigo-300 dark:to-fuchsia-300 bg-clip-text text-2xl font-bold text-transparent">
                ${fee.toFixed(2)}
              </p>
            </div>
          </div>

          {err && (
            <p className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
              {err}
            </p>
          )}

          <button
            disabled={busy || !slot}
            className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <span className="relative z-10">
              {busy ? "Booking…" : paymentMode === "online" ? "Continue to payment →" : "Confirm booking →"}
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-xs text-gray-500 dark:text-slate-400">
        ✉️ You&apos;ll receive your booking ID and QR via SMS, email, and WhatsApp.
      </p>
    </main>
  );
}
