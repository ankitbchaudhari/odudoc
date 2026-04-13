"use client";

import { useState } from "react";
import type { Doctor } from "@/lib/data";
import PaymentForm from "@/components/PaymentForm";

interface BookingModalProps {
  doctor: Doctor;
  open: boolean;
  onClose: () => void;
}

export default function BookingModal({ doctor, open, onClose }: BookingModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"slot" | "form" | "payment" | "success">("slot");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  if (!open) return null;

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const res = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: doctor.id,
          doctorName: doctor.name,
          fee: doctor.fee,
          patientName: name,
          patientPhone: phone,
          timeSlot: selectedSlot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPaymentError(data.error || "Failed to initiate payment");
        setPaymentLoading(false);
        return;
      }

      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setStep("payment");
    } catch {
      setPaymentError("An unexpected error occurred. Please try again.");
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
    setName("");
    setPhone("");
    setClientSecret(null);
    setPaymentIntentId(null);
    setBookingId(null);
    setPaymentError(null);
    onClose();
  };

  // Step indicator
  const steps = ["Time Slot", "Details", "Payment", "Confirmed"];
  const stepIndex = step === "slot" ? 0 : step === "form" ? 1 : step === "payment" ? 2 : 3;

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
            {steps.slice(0, 3).map((label, i) => (
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
                {i < 2 && (
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
            <p className="mt-1 text-sm text-gray-500">
              {doctor.name} &middot; ${doctor.fee}
            </p>

            <div className="mt-5">
              <p className="mb-3 text-sm font-medium text-gray-700">Select a time slot</p>
              <div className="grid grid-cols-3 gap-2">
                {doctor.timeSlots.map((slot) => (
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
              {doctor.name} &middot; {selectedSlot}
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter phone number"
                />
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
                  Preparing Payment...
                </span>
              ) : (
                `Continue to Payment · $${doctor.fee}`
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

        {step === "payment" && clientSecret && (
          <>
            <h2 className="text-lg font-bold text-gray-900">Payment</h2>
            <p className="mt-1 mb-5 text-sm text-gray-500">
              Complete your payment to confirm booking
            </p>

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
            <p className="mt-1 text-sm text-gray-400">
              A confirmation will be sent to your phone.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button onClick={handleClose} className="btn-primary">
                Done
              </button>
              <a
                href={`/payment/success?bookingId=${bookingId || ""}&doctor=${encodeURIComponent(doctor.name)}&time=${encodeURIComponent(selectedSlot || "")}&amount=${doctor.fee}`}
                className="text-sm text-primary-600 hover:underline"
              >
                View Receipt
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
