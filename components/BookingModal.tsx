"use client";

import { useEffect, useRef, useState } from "react";
import type { Doctor } from "@/lib/data";
import PaymentForm from "@/components/PaymentForm";
import CashfreeCheckout from "@/components/CashfreeCheckout";
import CurrencySwitcher, { useCheckoutCurrency } from "@/components/CurrencySwitcher";
import { convert } from "@/lib/currency-convert";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";

// Mirror of lib/consult-otp.ts#toE164 so Firebase gets a canonical number.
function toE164Client(raw: string): string {
  const digits = (raw || "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

interface BookingModalProps {
  doctor: Doctor;
  open: boolean;
  onClose: () => void;
}

// Parse a slot label like "9:00 AM" into a 24h (hour, minute) tuple.
function parseSlot(slot: string): { h: number; m: number } | null {
  const match = slot.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return { h, m };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Build the next `days` eligible dates starting from today.
function buildDateOptions(days: number): { value: string; label: string; date: Date }[] {
  const out: { value: string; label: string; date: Date }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({ value: formatDate(d), label: i === 0 ? `Today · ${prettyDate(d)}` : i === 1 ? `Tomorrow · ${prettyDate(d)}` : prettyDate(d), date: d });
  }
  return out;
}

export default function BookingModal({ doctor, open, onClose }: BookingModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [step, setStep] = useState<"slot" | "form" | "otp" | "payment" | "success">("slot");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpChannel, setOtpChannel] = useState<string>("sms");
  const [phoneHint, setPhoneHint] = useState("");
  const [consultToken, setConsultToken] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  // Firebase Phone Auth state — invisible reCAPTCHA mount point and the
  // ConfirmationResult returned by signInWithPhoneNumber.
  const recaptchaContainer = useRef<HTMLDivElement>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentsOff, setPaymentsOff] = useState(false);
  // Surfaced from /api/payments-config so we know whether to render
  // the Cashfree button (Indian UPI / cards / netbanking) alongside
  // Stripe. Stripe stays the global fallback.
  const [cashfreeAvailable, setCashfreeAvailable] = useState(false);
  // Mode toggle on the payment step. Defaults to Cashfree when
  // the visitor's checkout currency is INR; otherwise Stripe.
  const [provider, setProvider] = useState<"stripe" | "cashfree">("stripe");

  // Visitor-chosen checkout currency. Pricing is authored in USD; the
  // PaymentIntent is created in this currency server-side at the live
  // FX rate. convert() is used here purely for the displayed amount on
  // the slot/confirm screen.
  const checkout = useCheckoutCurrency();
  const [convertedFee, setConvertedFee] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!checkout.code || checkout.code === "USD") {
      setConvertedFee(null);
      return;
    }
    convert(doctor.fee, "USD", checkout.code).then((v) => {
      if (!cancelled) setConvertedFee(v);
    });
    return () => { cancelled = true; };
  }, [doctor.fee, checkout.code]);
  const displaySymbol = checkout.def?.symbol || "$";
  const displayDecimals = checkout.def?.decimals ?? 2;
  const displayFee = (convertedFee ?? doctor.fee).toFixed(displayDecimals);

  useEffect(() => {
    if (!open) return;
    fetch("/api/payments-config")
      .then((r) => r.json())
      .then((d) => {
        setPaymentsOff(!!d.disabled);
        const cfReady = Boolean(d?.gateways?.cashfree);
        setCashfreeAvailable(cfReady);
        // If the visitor's checkout currency is INR and Cashfree is
        // wired, default to Cashfree — UPI is much smoother than
        // an international card on Stripe in India.
        if (cfReady && checkout.code === "INR") setProvider("cashfree");
      })
      .catch(() => {});
  }, [open, checkout.code]);

  // Resend countdown for the OTP step. Must live above the `if (!open)`
  // early return so the hook count is stable across renders.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (!open) return null;

  // 15-day booking window starting today.
  const dateOptions = buildDateOptions(15);
  const todayStr = formatDate(new Date());
  const isToday = selectedDate === todayStr;
  const now = new Date();

  // Filter slots: for today, hide any slot whose start time is already in the
  // past (with a 15-minute buffer so patients don't book a slot that starts in
  // the next few minutes). Other days show all configured slots.
  const availableSlots = doctor.timeSlots.filter((slot) => {
    if (!isToday) return true;
    const parsed = parseSlot(slot);
    if (!parsed) return true;
    const slotTime = new Date();
    slotTime.setHours(parsed.h, parsed.m, 0, 0);
    const buffer = 15 * 60 * 1000;
    return slotTime.getTime() > now.getTime() + buffer;
  });

  const validateInputs = (): string | null => {
    if (firstName.trim().length < 1) return "Please enter your first name.";
    if (lastName.trim().length < 1) return "Please enter your last name.";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7) return "Please enter a valid phone number (at least 7 digits).";
    return null;
  };

  // Step 1 → 2: submit details, request an OTP via Firebase Phone Auth.
  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateInputs();
    if (validationErr) {
      setPaymentError(validationErr);
      return;
    }
    if (!isFirebaseConfigured()) {
      setPaymentError(
        "Phone verification isn't configured. Please contact support.",
      );
      return;
    }

    const e164 = toE164Client(phone.trim());
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const auth = getFirebaseAuth();

      // Rebuild the invisible reCAPTCHA — Firebase won't reuse a consumed verifier.
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      if (!recaptchaContainer.current) throw new Error("reCAPTCHA container not mounted");
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainer.current, {
        size: "invisible",
      });

      const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      confirmationRef.current = confirmation;

      setPhoneHint(e164.replace(/\d(?=\d{4})/g, "•"));
      setOtpChannel("sms");
      setOtpCode("");
      setResendIn(30);
      setStep("otp");
    } catch (err) {
      // Surface the actual Firebase error code so support can debug
      // ("auth/billing-not-enabled", "auth/quota-exceeded",
      // "auth/operation-not-allowed", etc). Generic "try again" hid
      // the real reason and made every failure look like a transient
      // network blip.
      const code = (err as { code?: string }).code || "";
      const message = (err as Error).message || "";
      // Best effort log to the browser console so devs/support can
      // copy the full Firebase error from the user's session.
      // eslint-disable-next-line no-console
      console.error("[BookingModal] phone OTP send failed", { code, message, err });

      if (/auth\/invalid-phone-number/.test(code)) {
        setPaymentError("That phone number doesn't look right. Include the country code.");
      } else if (/auth\/too-many-requests/.test(code)) {
        setPaymentError("Too many attempts from this device. Try again in a few minutes.");
      } else if (/auth\/captcha-check-failed/.test(code) || /reCAPTCHA/i.test(message)) {
        setPaymentError("Anti-bot check failed. Please refresh and try again.");
      } else if (/auth\/quota-exceeded/.test(code)) {
        setPaymentError("Daily SMS quota reached. Please try again tomorrow or contact support.");
      } else if (/auth\/billing-not-enabled/.test(code)) {
        setPaymentError("Phone verification is temporarily unavailable. Please contact support.");
      } else if (/auth\/operation-not-allowed/.test(code)) {
        setPaymentError("Phone verification isn't enabled for this site yet. Please contact support.");
      } else if (/auth\/unauthorized-domain/.test(code)) {
        setPaymentError("This domain isn't authorized for phone verification yet. Please contact support.");
      } else if (/auth\/network-request-failed/.test(code)) {
        setPaymentError("Network error. Check your connection and try again.");
      } else if (code) {
        // Show the Firebase code in dev/staging so the cause is visible.
        setPaymentError(`Could not send code (${code}). Please try again.`);
      } else {
        setPaymentError("Could not send code. Please try again.");
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  // Step 2 → 3: verify OTP via Firebase, then either create a free booking or open Stripe.
  const handleOtpVerify = async () => {
    if (otpCode.trim().length < 4) {
      setPaymentError("Enter the 6-digit code we sent you.");
      return;
    }
    if (!confirmationRef.current) {
      setPaymentError("Verification session expired. Please resend the code.");
      return;
    }
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      let idToken: string;
      try {
        const credential = await confirmationRef.current.confirm(otpCode.trim());
        idToken = await credential.user.getIdToken(true);
      } catch (err) {
        const msg = (err as { code?: string }).code || "";
        if (/auth\/invalid-verification-code/.test(msg)) {
          setPaymentError("That code doesn't match. Double-check and try again.");
        } else if (/auth\/code-expired/.test(msg)) {
          setPaymentError("That code expired. Please resend a new one.");
        } else {
          setPaymentError("Could not verify code. Please try again.");
        }
        return;
      }

      const vRes = await fetch("/api/consult/firebase/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, firstName: firstName.trim(), lastName: lastName.trim() }),
      });
      const vData = await vRes.json();
      if (!vRes.ok) {
        setPaymentError(vData.error || "Invalid code.");
        return;
      }
      const token = vData.consultToken as string;
      setConsultToken(token);

      if (paymentsOff) {
        const res = await fetch("/api/bookings/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: doctor.id,
            doctorName: doctor.name,
            fee: doctor.fee,
            specialty: doctor.specialty,
            patientName: name,
            patientPhone: phone.trim(),
            timeSlot: selectedSlot,
            date: selectedDate,
            consultToken: token,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setPaymentError(data.error || "Booking failed. Please try again.");
          return;
        }
        setBookingId(data.booking.id);
        if (data.consultation?.id) setConsultationId(data.consultation.id);
        setStep("success");
        if (data.consultation?.id) {
          setTimeout(() => {
            window.location.href = `/dashboard/consultations/${data.consultation.id}`;
          }, 1800);
        }
        return;
      }

      // If the patient picked Cashfree, we don't pre-create anything
      // on our side — the CashfreeCheckout component creates the
      // Cashfree order on click + launches the SDK + verifies on
      // return. Just create the booking shell so we have a stable
      // orderId to give Cashfree.
      if (provider === "cashfree") {
        const bookRes = await fetch("/api/bookings/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doctorId: doctor.id,
            doctorName: doctor.name,
            fee: doctor.fee,
            specialty: doctor.specialty,
            patientName: name,
            patientPhone: phone.trim(),
            timeSlot: selectedSlot,
            date: selectedDate,
            consultToken: token,
            // Mark unpaid so the consultation sits in "pending payment"
            // state until the Cashfree webhook flips it.
            pendingPayment: true,
          }),
        });
        const bookData = await bookRes.json();
        if (!bookRes.ok) {
          setPaymentError(bookData.error || "Booking failed. Please try again.");
          return;
        }
        setBookingId(bookData.booking.id);
        if (bookData.consultation?.id) setConsultationId(bookData.consultation.id);
        setStep("payment");
        return;
      }

      // Paid path: open Stripe PaymentIntent. The fee is authored in USD;
      // create-intent converts to the visitor-chosen currency at the live
      // FX rate and creates the PaymentIntent in that currency.
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          doctorName: doctor.name,
          fee: doctor.fee,
          patientName: name,
          patientPhone: phone.trim(),
          timeSlot: selectedSlot,
          consultToken: token,
          currency: checkout.code,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || "Failed to initiate payment");
        return;
      }
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep("payment");
    } catch {
      setPaymentError("Network error. Please try again.");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Re-request a code from the OTP step — runs the Firebase sendCode flow
  // again so a fresh SMS is dispatched and a new reCAPTCHA token is used.
  const handleResendOtp = async () => {
    if (resendIn > 0 || paymentLoading) return;
    setPaymentError(null);
    if (!isFirebaseConfigured()) {
      setPaymentError("Phone verification isn't configured.");
      return;
    }
    const e164 = toE164Client(phone.trim());
    setPaymentLoading(true);
    try {
      const auth = getFirebaseAuth();
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch { /* ignore */ }
        recaptchaRef.current = null;
      }
      if (!recaptchaContainer.current) throw new Error("reCAPTCHA container not mounted");
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainer.current, {
        size: "invisible",
      });
      const confirmation = await signInWithPhoneNumber(auth, e164, recaptchaRef.current);
      confirmationRef.current = confirmation;
      setResendIn(30);
    } catch (err) {
      const msg = (err as { code?: string; message?: string }).code
        || (err as Error).message
        || "";
      if (/auth\/too-many-requests/.test(msg)) {
        setPaymentError("Too many attempts from this device. Try again later.");
      } else {
        setPaymentError("Could not resend code. Please try again.");
      }
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentSuccess = (_piId: string, bId: string) => {
    setBookingId(bId);
    setStep("success");
  };

  const handlePaymentError = (message: string) => {
    setPaymentError(message);
  };

  const handleClose = () => {
    setStep("slot");
    setSelectedSlot(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setOtpCode("");
    setConsultToken(null);
    setPhoneHint("");
    setResendIn(0);
    setClientSecret(null);
    setPaymentIntentId(null);
    setBookingId(null);
    setConsultationId(null);
    setPaymentError(null);
    onClose();
  };

  // Step indicator
  const steps = paymentsOff
    ? ["Time Slot", "Details", "Verify", "Confirmed"]
    : ["Time Slot", "Details", "Verify", "Payment", "Confirmed"];
  const stepIndex =
    step === "slot" ? 0
    : step === "form" ? 1
    : step === "otp" ? 2
    : step === "payment" ? (paymentsOff ? 3 : 3)
    : paymentsOff ? 3 : 4;
  const totalIndicator = paymentsOff ? 3 : 4;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Step Indicator */}
        {step !== "success" && (
          <div className="mb-5 flex items-center justify-center gap-1">
            {steps.slice(0, totalIndicator).map((label, i) => (
              <div key={label} className="flex items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    i <= stepIndex
                      ? "bg-primary-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                {i < totalIndicator - 1 && (
                  <div
                    className={`mx-1 h-0.5 w-8 ${
                      i < stepIndex ? "bg-primary-600" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {step === "slot" && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Book Appointment</h2>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-500">
                {doctor.name} &middot; {displaySymbol}{displayFee}
              </p>
              <CurrencySwitcher />
            </div>
            {(() => {
              const c = (doctor.country || "").trim().toLowerCase();
              if (c === "india" || c === "in" || c === "ind" || c === "bharat") {
                return (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    <span className="text-base leading-none">🇮🇳</span>
                    <span>
                      <b>Available to patients in India only.</b> Per IMC
                      telemedicine guidelines, this doctor can only consult
                      patients located in India. Please use an Indian phone
                      number when booking.
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">Select a date</label>
              <select
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              >
                {dateOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">You can book up to 15 days in advance.</p>
            </div>

            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-gray-700">Select a time slot</p>
              {availableSlots.length === 0 ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                  No more slots available {isToday ? "today" : "on this date"}. Please pick another date.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                        selectedSlot === slot
                          ? "border-primary-500 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-600 hover:border-primary-300"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              {isToday && availableSlots.length < doctor.timeSlots.length && availableSlots.length > 0 && (
                <p className="mt-2 text-xs text-gray-400">Past slots for today are hidden.</p>
              )}
            </div>

            <button
              disabled={!selectedSlot}
              onClick={() => setStep("form")}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </>
        )}

        {step === "form" && (
          <form onSubmit={handlePatientSubmit}>
            <h2 className="text-lg font-bold text-gray-900">Patient Details</h2>
            <p className="mt-1 text-sm text-gray-500">
              {doctor.name} &middot; {dateOptions.find((d) => d.value === selectedDate)?.label} &middot; {selectedSlot}
            </p>
            {paymentsOff && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                🎉 Consultations are free for the next 24 hours — no card required.
              </div>
            )}
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">First Name *</label>
                  <input
                    required
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Priya"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Last Name *</label>
                  <input
                    required
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    placeholder="e.g. Sharma"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  pattern="^[\d\s\-\+\(\)]{7,}$"
                  title="Please enter a valid phone number (at least 7 digits)"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g. +1 555 123 4567"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <p className="mt-1 text-xs text-gray-400">We&apos;ll text you a 6-digit code to confirm it&apos;s you.</p>
              </div>
            </div>

            {paymentError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {paymentError}
              </div>
            )}

            <button
              type="submit"
              disabled={paymentLoading}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending code…
                </span>
              ) : (
                "Send verification code"
              )}
            </button>

            <button
              type="button"
              onClick={() => { setStep("slot"); setPaymentError(null); }}
              className="mt-2 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </form>
        )}

        {step === "otp" && (
          <div>
            <h2 className="text-lg font-bold text-gray-900">Verify your phone</h2>
            <p className="mt-1 text-sm text-gray-500">
              We sent a 6-digit code to <span className="font-semibold">{phoneHint}</span> via{" "}
              <span className="font-semibold">
                {otpChannel === "whatsapp" ? "WhatsApp" : otpChannel === "call" ? "voice call" : "SMS"}
              </span>
              .
            </p>
            <div className="mt-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">Verification code</label>
              <input
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter") handleOtpVerify(); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-3 text-center text-xl font-semibold tracking-[0.5em] outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="••••••"
              />
            </div>

            {paymentError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {paymentError}
              </div>
            )}

            <button
              type="button"
              onClick={handleOtpVerify}
              disabled={paymentLoading || otpCode.length < 4}
              className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading
                ? "Verifying…"
                : paymentsOff
                ? "Verify & confirm booking"
                : `Verify & continue to payment · ${displaySymbol}${displayFee}`}
            </button>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <button
                type="button"
                onClick={() => { setStep("form"); setPaymentError(null); }}
                className="text-primary-600 hover:underline"
                disabled={paymentLoading}
              >
                ← Change number
              </button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={paymentLoading || resendIn > 0}
                className="text-primary-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
              >
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
            </div>
          </div>
        )}

        {step === "payment" && (clientSecret || (provider === "cashfree" && bookingId)) && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Payment</h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">
              Complete your payment to confirm booking
            </p>

            {/* Provider toggle — only render when Cashfree is wired AND
                the visitor already has a Stripe PaymentIntent OR a
                Cashfree-eligible booking. Hidden on countries where
                Cashfree won't accept the customer's instrument. */}
            {cashfreeAvailable && (
              <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setProvider("cashfree")}
                  className={`rounded-full px-3 py-1.5 transition ${provider === "cashfree" ? "bg-white text-[#6933FF] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  🇮🇳 UPI / Cards (Cashfree)
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("stripe")}
                  className={`rounded-full px-3 py-1.5 transition ${provider === "stripe" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                >
                  💳 International (Stripe)
                </button>
              </div>
            )}

            {provider === "cashfree" && bookingId ? (
              <CashfreeCheckout
                orderId={bookingId}
                amount={Number((convertedFee ?? doctor.fee).toFixed(2))}
                currency={(checkout.code === "INR" ? "INR" : "INR") as "INR"}
                customerName={name}
                customerEmail={(typeof window !== "undefined" && new URLSearchParams(window.location.search).get("email")) || `${phone.replace(/[^0-9]/g, "")}@odudoc.example`}
                customerPhone={phone.replace(/^\+/, "")}
                description={`Consultation with ${doctor.name} on ${selectedSlot}`}
                doctorId={doctor.id}
                // Cashfree's success path doesn't carry a stripe-style
                // PaymentIntent id — the order id IS the booking id, so
                // we forward an empty string for paymentIntentId.
                onSuccess={() => handlePaymentSuccess("", bookingId)}
                onError={handlePaymentError}
              />
            ) : clientSecret ? (
              <PaymentForm
                clientSecret={clientSecret}
                doctorName={doctor.name}
                timeSlot={selectedSlot!}
                fee={doctor.fee}
                patientName={name}
                patientPhone={phone}
                doctorId={doctor.id}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            ) : (
              <p className="text-sm text-slate-500">Initialising payment…</p>
            )}

            {paymentError && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {paymentError}
              </div>
            )}

            <button
              type="button"
              onClick={() => { setStep("form"); setPaymentError(null); }}
              className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
            >
              Back
            </button>
          </>
        )}

        {step === "success" && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Booking Confirmed!</h2>
            <p className="mt-2 text-sm text-gray-500">
              Your appointment with {doctor.name} is confirmed for {selectedSlot}.
            </p>
            {bookingId && (
              <p className="mt-2 text-sm font-medium text-primary-600">
                Reference: <span className="font-mono">{bookingId}</span>
              </p>
            )}
            {consultationId ? (
              <>
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <strong>Next step:</strong> Please complete your medical history so the doctor can begin the consultation. Redirecting you now…
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <a href={`/dashboard/consultations/${consultationId}`} className="btn-primary">
                    Complete medical history →
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-400">A confirmation will be sent to your phone.</p>
                <div className="mt-6 flex flex-col gap-2">
                  <button onClick={handleClose} className="btn-primary">Done</button>
                  <a
                    href={`/payment/success?bookingId=${bookingId || ""}&doctor=${encodeURIComponent(doctor.name)}&time=${encodeURIComponent(selectedSlot || "")}&amount=${doctor.fee}`}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    View Receipt
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Invisible reCAPTCHA mount point for Firebase Phone Auth. */}
        <div ref={recaptchaContainer} />
      </div>
    </div>
  );
}
